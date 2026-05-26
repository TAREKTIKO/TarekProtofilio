// ================= SUPABASE CONNECTION =================

// import
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// بيانات مشروعك من Supabase
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

// create client
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);