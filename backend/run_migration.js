/**
 * Run schema_update_v3.sql against Supabase via the Management API.
 * Usage: node run_migration.js
 */
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Individual ALTER statements (run one at a time to avoid issues)
const statements = [
    `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_moderation_status TEXT`,
    `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_labels TEXT[] DEFAULT '{}'`,
    `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deepfake_confidence FLOAT`,
    `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deepfake_model_version TEXT`,
    `ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public'`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS spam_score FLOAT DEFAULT 0`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`,
    `CREATE TABLE IF NOT EXISTS public.reports (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id UUID NOT NULL,
        reason TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY`,
];

// We need to create a Postgres function first that lets us run raw SQL
const createExecFn = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
`;

async function runSQL(sql) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });
    
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return true;
}

async function main() {
    console.log('Running schema_update_v3 migration...\n');
    
    // First try to create the exec_sql function via the RPC endpoint
    // This might fail if exec_sql doesn't exist yet — that's OK
    try {
        await runSQL('SELECT 1');
        console.log('✅ exec_sql function exists\n');
    } catch (e) {
        console.log('⚠️ exec_sql function not found. Creating it...');
        // Can't create it via RPC if it doesn't exist yet
        // The user will need to create it manually in SQL Editor first
        console.log('\n❗ Please run the following SQL in Supabase SQL Editor first:\n');
        console.log(createExecFn);
        console.log('\nThen run this script again.\n');
        console.log('Alternatively, run the full schema_update_v3.sql directly in the SQL Editor:');
        console.log('  backend/supabase/schema_update_v3.sql\n');
        process.exit(1);
    }

    let success = 0;
    let failed = 0;
    
    for (const stmt of statements) {
        const preview = stmt.replace(/\s+/g, ' ').substring(0, 70);
        try {
            await runSQL(stmt);
            console.log(`✅ ${preview}...`);
            success++;
        } catch (err) {
            console.log(`❌ ${preview}...`);
            console.log(`   Error: ${err.message}\n`);
            failed++;
        }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Done: ${success} succeeded, ${failed} failed`);
    
    if (failed > 0) {
        console.log(`\nPlease run failed statements manually in Supabase SQL Editor.`);
    }
}

main().catch(console.error);
