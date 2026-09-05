import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jzantniagqzetbbvohzn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YW50bmlhZ3F6ZXRiYnZvaHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjMxMDQsImV4cCI6MjEwMjYzOTEwNH0.xNGvYpXWjVxSRXdMqykrx8-ox2TdmoEWd_IoB28O-6g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
