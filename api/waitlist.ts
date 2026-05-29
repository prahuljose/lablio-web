import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

type WaitlistRequest = {
  email?: string;
  website?: string;
  renderedAt?: number;
  ref?: string;
  referrer?: string;
};

const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const disposableDomains = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "yopmail.com",
]);

function getClientIp(request: any) {
  const forwarded = request.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || request.socket?.remoteAddress || "";
}

function hashIp(ip: string) {
  if (!ip) return null;
  const salt = process.env.WAITLIST_IP_SALT || process.env.SUPABASE_ANON_KEY || "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function cleanText(value: string | undefined, maxLength: number) {
  return value?.trim().slice(0, maxLength) || null;
}

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
  const domain = email?.split("@")[1];

  if (payload.website) {
    return response.status(200).json({ ok: true });
  }

  if (!payload.renderedAt || Date.now() - payload.renderedAt < 1200) {
    return response.status(400).json({ error: "Please try again" });
  }

  if (!email || email.length > 254 || !emailPattern.test(email) || disposableDomains.has(domain || "")) {
    return response.status(400).json({ error: "Enter a valid email address" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("waitlist_emails")
    .insert({
      email,
      source: "coming_soon_page",
      status: "joined",
      ref: cleanText(payload.ref, 120),
      referrer: cleanText(payload.referrer, 500),
      user_agent: cleanText(request.headers["user-agent"], 500),
      ip_hash: hashIp(getClientIp(request)),
    });

  if (error) {
    if (error.code === "23505") {
      return response.status(200).json({ ok: true, duplicate: true });
    }

    console.error("Waitlist signup failed", error);
    return response.status(500).json({ error: "Could not join waitlist" });
  }

  return response.status(200).json({ ok: true });
}
