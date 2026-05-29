import { createClient } from "@supabase/supabase-js";

type WaitlistRow = {
  id: string;
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

const allowedStatuses = new Set(["joined", "invited", "converted", "bounced"]);

export default async function handler(request: any, response: any) {
  if (!["GET", "PATCH"].includes(request.method)) {
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

  if (request.method === "PATCH") {
    let payload: { id?: string; status?: string };

    try {
      payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    } catch {
      return response.status(400).json({ error: "Invalid request body" });
    }

    if (!payload.id || !payload.status || !allowedStatuses.has(payload.status)) {
      return response.status(400).json({ error: "Invalid status update" });
    }

    const { error } = await supabase
      .from("waitlist_emails")
      .update({ status: payload.status })
      .eq("id", payload.id);

    if (error) {
      console.error("Waitlist status update failed", error);
      return response.status(500).json({ error: "Could not update status" });
    }

    return response.status(200).json({ ok: true });
  }

  const { data, error } = await supabase
    .from("waitlist_emails")
    .select("id,email,status,source,ref,referrer,user_agent,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Waitlist admin fetch failed", error);
    return response.status(500).json({ error: "Could not load waitlist" });
  }

  const rows = (data || []) as WaitlistRow[];
  const url = new URL(request.url || "/", "https://lablio.local");

  if (url.searchParams.get("format") === "csv") {
    const header = ["id", "email", "status", "source", "ref", "referrer", "user_agent", "created_at"];
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
