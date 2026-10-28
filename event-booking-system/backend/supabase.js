require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || url.includes('your-project') || key.startsWith('replace-')) {
  console.error('Configure backend/.env using .env.example before starting.');
  process.exit(1);
}
module.exports = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
