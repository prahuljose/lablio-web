import { createClient } from "@supabase/supabase-js";

export default async function handler(request: any, response: any) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response.status(200).json({ count: null });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { count, error } = await supabase
    .from("waitlist_emails")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Waitlist count failed", error);
    return response.status(200).json({ count: null });
  }

  return response.status(200).json({ count });
}
