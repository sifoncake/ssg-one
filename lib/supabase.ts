import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LINEUser {
  id: string;
  line_user_id: string;
  display_name?: string;
  picture_url?: string;
  first_seen_at?: string;
  last_seen_at: string;
  created_at?: string;
}
