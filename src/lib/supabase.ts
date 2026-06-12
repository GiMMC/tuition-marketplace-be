import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Key is missing. Storage functionality might fail.');
}

export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseServiceKey || 'dummy_key'
);
