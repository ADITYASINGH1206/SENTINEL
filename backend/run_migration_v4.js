/**
 * Run schema_update_v4_messaging.sql against Supabase via the Management API.
 * Usage: node run_migration_v4.js
 */
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Individual statements
const statements = [
    `CREATE TABLE IF NOT EXISTS public.bookmarks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, post_id)
    )`,
    `CREATE TABLE IF NOT EXISTS public.conversations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      participants UUID[] NOT NULL,
      last_message TEXT DEFAULT '',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS public.messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_read BOOLEAN DEFAULT FALSE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_user_post ON public.bookmarks(user_id, post_id)`
];

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
    console.log('Running schema_update_v4 migration...\n');
    
    let success = 0;
    let failed = 0;
    
    for (const stmt of statements) {
        const preview = stmt.replace(/\\s+/g, ' ').substring(0, 70);
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
}

main().catch(console.error);
