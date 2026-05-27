// ================= SUPABASE CONNECTION =================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Replace these values from Supabase Dashboard > Project Settings > API.
// Use the public anon key here. Never put your database password in frontend code.
const SUPABASE_URL = "https://wnxslawzvnzxkbqpxxcp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QU1kkV_lqtLK7z84ZmcVvA_M6OWfu-T";

const isConfigured =
    SUPABASE_URL.includes(".supabase.co") &&
    !SUPABASE_URL.includes("YOUR_PROJECT_REF") &&
    !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");

if (!isConfigured) {
    console.warn(
        "Supabase is not configured yet. Add your Project URL and anon key in script/supabase.js."
    );
}

export const supabase = isConfigured
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export function getSupabaseClient() {
    if (!supabase) {
        throw new Error("Supabase client is not configured. Check script/supabase.js.");
    }

    return supabase;
}

export async function testSupabaseConnection(tableName = "products") {
    const client = getSupabaseClient();
    const { error } = await client
        .from(tableName)
        .select("*")
        .limit(1);

    if (error) {
        console.error("Supabase connection failed:", error.message);
        return false;
    }

    console.info(`Supabase connected successfully using table: ${tableName}`);
    return true;
}

// Makes the client available to non-module scripts as window.supabaseClient.
window.supabaseClient = supabase;
window.testSupabaseConnection = testSupabaseConnection;
