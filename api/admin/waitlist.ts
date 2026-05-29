import { createClient } from "@supabase/supabase-js";

type WaitlistRow = {
  email: string;
  status: string;
  source: string;
  ref: string | null;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
};

function isAuthorized(request: any) {
  const adminToken = process.env.ADMIN_TOKEN;
  const suppliedToken =
    request.headers["x-admin-token"] ||
    new URL(request.url || "/", "https://lablio.local").searchParams.get("token");

  return Boolean(adminToken && suppliedToken === adminToken);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default async function handler(request: any, response: any) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response.status(500).json({ error: "Admin Supabase credentials are not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("waitlist_emails")
    .select("email,status,source,ref,referrer,user_agent,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Waitlist admin fetch failed", error);
    return response.status(500).json({ error: "Could not load waitlist" });
  }

  const rows = (data || []) as WaitlistRow[];
  const url = new URL(request.url || "/", "https://lablio.local");

  if (url.searchParams.get("format") === "csv") {
    const header = ["email", "status", "source", "ref", "referrer", "user_agent", "created_at"];
    const csv = [
      header.join(","),
      ...rows.map((row) => header.map((key) => csvEscape(row[key as keyof WaitlistRow])).join(",")),
    ].join("\n");

    response.setHeader("content-type", "text/csv; charset=utf-8");
    response.setHeader("content-disposition", "attachment; filename=lablio-waitlist.csv");
    return response.status(200).send(csv);
  }

  const byStatus = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});

  return response.status(200).json({
    total: rows.length,
    byStatus,
    rows,
  });
}
