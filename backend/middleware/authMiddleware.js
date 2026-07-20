const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];
        
        // Use Supabase to verify the JWT
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            // For hackathon local dev without real supabase, we might mock auth
            if (token === 'mock-jwt-token') {
                 req.user = { id: 'mock-user-id', email: 'mock@example.com' };
                 return next();
            }
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('[Auth Middleware] Error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

module.exports = { verifyToken };
