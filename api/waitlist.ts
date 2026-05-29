import { createClient } from "@supabase/supabase-js";

type WaitlistRequest = {
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response.status(500).json({ error: "Supabase is not configured" });
  }

  let payload: WaitlistRequest;

  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: "Invalid request body" });
  }

  const email = payload.email?.trim().toLowerCase();

  if (!email || !emailPattern.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("waitlist_emails")
    .upsert(
      { email, source: "coming_soon_page" },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    return response.status(500).json({ error: "Could not join waitlist" });
  }

  return response.status(200).json({ ok: true });
}
