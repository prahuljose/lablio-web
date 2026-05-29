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

async function sendConfirmationEmail(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_EMAIL_FROM || "Lablio <onboarding@resend.dev>";

  if (!apiKey) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "You're on the Lablio early access list",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; color: #14211f; line-height: 1.6;">
          <h1 style="font-size: 28px; margin-bottom: 12px;">You're on the list.</h1>
          <p>Thanks for joining Lablio early access. We're building a calmer way to turn blood reports into biomarker timelines, charts, and useful insights.</p>
          <p>We'll email you when private beta opens.</p>
          <p style="margin-top: 28px;">Rahul & Lablio</p>
        </div>
      `,
      text: "You're on the Lablio early access list. We'll email you when private beta opens.",
    }),
  });

  if (!response.ok) {
    console.error("Waitlist confirmation email failed", await response.text());
  }
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

  await sendConfirmationEmail(email);

  return response.status(200).json({ ok: true });
}
