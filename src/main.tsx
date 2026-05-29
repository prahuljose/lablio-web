import React, { FormEvent, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Download,
  FileScan,
  LineChart,
  LockKeyhole,
  RefreshCw,
  ScanLine,
  Sparkles,
  TestTube2,
  Upload,
} from "lucide-react";
import "./styles.css";

const biomarkers = [
  { label: "Vitamin D", value: "42", unit: "ng/mL", tone: "steady" },
  { label: "HbA1c", value: "5.2", unit: "%", tone: "optimal" },
  { label: "Ferritin", value: "78", unit: "ng/mL", tone: "rising" },
  { label: "LDL-C", value: "94", unit: "mg/dL", tone: "watch" },
];

const insights = [
  "Upload a blood report and let Lablio extract the values for you.",
  "Track every biomarker as a living timeline, not a forgotten PDF.",
  "See patterns, ranges, and next questions before your next appointment.",
];

const workflowSteps = [
  {
    icon: Upload,
    title: "Upload report",
    body: "Drop in a PDF or image from your latest bloodwork.",
  },
  {
    icon: ScanLine,
    title: "Extract markers",
    body: "Lablio reads values, units, dates, and reference ranges.",
  },
  {
    icon: LineChart,
    title: "Track trends",
    body: "Every biomarker becomes a timeline you can revisit.",
  },
  {
    icon: Brain,
    title: "Get insights",
    body: "Spot changes, patterns, and better questions to ask next.",
  },
];

type WaitlistResponse = {
  ok?: boolean;
  duplicate?: boolean;
  error?: string;
};

type WaitlistRow = {
  id: string;
  email: string;
  status: string;
  source: string;
  ref: string | null;
  referrer: string | null;
  created_at: string;
};

type AdminResponse = {
  total: number;
  byStatus: Record<string, number>;
  rows: WaitlistRow[];
};

function PointerField() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const onMove = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      field.style.setProperty("--pointer-x", `${x}%`);
      field.style.setProperty("--pointer-y", `${y}%`);
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={fieldRef} className="pointer-field" aria-hidden="true">
      <span className="signal signal-a" />
      <span className="signal signal-b" />
      <span className="signal signal-c" />
      <span className="signal signal-d" />
      <span className="signal signal-e" />
    </div>
  );
}

function LandingPage() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const renderedAt = useRef(Date.now());

  useEffect(() => {
    void fetch("/api/waitlist-count")
      .then((response) => response.json())
      .then((result) => {
        if (typeof result.count === "number") {
          setWaitlistCount(result.count);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setStatus("error");
      setMessage("Enter an email address to join the list.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmedEmail,
        website,
        renderedAt: renderedAt.current,
        ref: new URLSearchParams(window.location.search).get("ref") ||
          new URLSearchParams(window.location.search).get("utm_source"),
        referrer: document.referrer,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as WaitlistResponse;

    if (!response.ok) {
      setStatus("error");
      setMessage(result.error || "Something did not land. Please try again in a moment.");
      return;
    }

    setStatus("success");
    setMessage(result.duplicate ? "You're already on the early access list." : "You're on the early access list.");
    if (!result.duplicate) {
      setWaitlistCount((count) => (typeof count === "number" ? count + 1 : count));
    }
    setEmail("");
  };

  return (
    <main className="page-shell">
      <PointerField />
      <section className="hero">
        <nav className="nav" aria-label="Lablio">
          <a className="brand" href="/" aria-label="Lablio home">
            <span className="brand-mark">
              <Activity size={22} strokeWidth={2.4} />
            </span>
            <span>Lablio</span>
          </a>
          <span className="nav-pill">
            <Sparkles size={16} />
            Private beta opening soon
          </span>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <TestTube2 size={17} />
              Biomarker intelligence for your body data
            </div>
            <h1>
              Your bloodwork is about to become beautifully understandable.
            </h1>
            <p className="lede">
              Lablio reads your reports, extracts biomarker values, and turns
              them into clean timelines, charts, and insights you can actually
              use.
            </p>

            <form className="waitlist" aria-label="Join the Lablio waitlist" onSubmit={handleWaitlistSubmit}>
              <label htmlFor="email">Get early access</label>
              <div className="bot-field" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
              <div className="input-row">
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={status === "loading"}
                  required
                />
                <button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "Joining" : "Join"}
                  <ArrowRight size={18} />
                </button>
              </div>
              {message && (
                <p className={`form-message ${status === "success" ? "success" : "error"}`} role="status">
                  {message}
                </p>
              )}
            </form>

            <div className="proof-row" aria-label="Product highlights">
              {typeof waitlistCount === "number" && waitlistCount > 0 && (
                <span>
                  <Sparkles size={18} />
                  {waitlistCount.toLocaleString()} joined
                </span>
              )}
              <span>
                <FileScan size={18} />
                Report parsing
              </span>
              <span>
                <LineChart size={18} />
                Trend charts
              </span>
              <span>
                <LockKeyhole size={18} />
                Secure records
              </span>
            </div>
          </div>

          <div className="lab-visual" aria-label="Preview of biomarker tracking dashboard">
            <div className="scan-beam" />
            <div className="report-panel">
              <div className="report-header">
                <span>Blood Report</span>
                <span>Extracting</span>
              </div>
              <div className="report-lines">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="capture-box">
                <FileScan size={24} />
                <span>16 markers found</span>
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="panel-title">
                <BarChart3 size={18} />
                Biomarker timeline
              </div>
              <div className="chart">
                <span style={{ height: "38%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "46%" }} />
                <span style={{ height: "78%" }} />
                <span style={{ height: "66%" }} />
                <span style={{ height: "84%" }} />
                <span style={{ height: "72%" }} />
              </div>
              <div className="marker-grid">
                {biomarkers.map((marker) => (
                  <article className="marker-card" key={marker.label}>
                    <span>{marker.label}</span>
                    <strong>
                      {marker.value}
                      <small>{marker.unit}</small>
                    </strong>
                    <em>{marker.tone}</em>
                  </article>
                ))}
              </div>
            </div>

            <div className="insight-card">
              <Brain size={19} />
              <div>
                <strong>Insight ready</strong>
                <span>Ferritin is up 18% across your last three labs.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="workflow" aria-label="How Lablio works">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article className="workflow-step" key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <Icon size={22} />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          );
        })}
      </section>

      <section className="coming-soon" aria-label="What Lablio will do">
        <div>
          <span className="section-kicker">Coming soon</span>
          <h2>A calmer way to follow what your body is telling you.</h2>
        </div>
        <div className="insight-list">
          {insights.map((insight) => (
            <div className="insight-item" key={insight}>
              <CheckCircle2 size={20} />
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminWaitlist() {
  const [token, setToken] = useState(() => window.localStorage.getItem("lablio_admin_token") || "");
  const [data, setData] = useState<AdminResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadWaitlist = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Enter the admin token.");
      return;
    }

    setStatus("loading");
    setMessage("");
    window.localStorage.setItem("lablio_admin_token", token);

    const response = await fetch("/api/admin/waitlist", {
      headers: { "x-admin-token": token },
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(result?.error || "Could not load waitlist.");
      return;
    }

    setData(result);
    setStatus("idle");
  };

  const updateStatus = async (id: string, nextStatus: string) => {
    setUpdatingId(id);
    setMessage("");

    const response = await fetch("/api/admin/waitlist", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ id, status: nextStatus }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(result?.error || "Could not update status.");
      setUpdatingId(null);
      return;
    }

    setData((current) => {
      if (!current) return current;
      const previous = current.rows.find((row) => row.id === id)?.status;
      const rows = current.rows.map((row) => (row.id === id ? { ...row, status: nextStatus } : row));
      const byStatus = { ...current.byStatus };

      if (previous) byStatus[previous] = Math.max((byStatus[previous] || 1) - 1, 0);
      byStatus[nextStatus] = (byStatus[nextStatus] || 0) + 1;

      return { ...current, rows, byStatus };
    });
    setUpdatingId(null);
  };

  useEffect(() => {
    if (token) {
      void loadWaitlist();
    }
  }, []);

  const csvUrl = `/api/admin/waitlist?format=csv&token=${encodeURIComponent(token)}`;

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-header">
          <a className="brand" href="/" aria-label="Lablio home">
            <span className="brand-mark">
              <Activity size={22} strokeWidth={2.4} />
            </span>
            <span>Lablio</span>
          </a>
          <div className="admin-actions">
            <button type="button" onClick={loadWaitlist} disabled={status === "loading"} title="Refresh">
              <RefreshCw size={17} />
              Refresh
            </button>
            <a href={csvUrl} aria-disabled={!token}>
              <Download size={17} />
              CSV
            </a>
          </div>
        </div>

        <div className="admin-login">
          <label htmlFor="admin-token">Admin token</label>
          <div className="input-row">
            <input
              id="admin-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste ADMIN_TOKEN"
            />
            <button type="button" onClick={loadWaitlist} disabled={status === "loading"}>
              {status === "loading" ? "Loading" : "Open"}
            </button>
          </div>
          {message && <p className="form-message error">{message}</p>}
        </div>

        <div className="admin-stats">
          <article>
            <span>Total</span>
            <strong>{data?.total ?? "--"}</strong>
          </article>
          <article>
            <span>Joined</span>
            <strong>{data?.byStatus.joined ?? 0}</strong>
          </article>
          <article>
            <span>Invited</span>
            <strong>{data?.byStatus.invited ?? 0}</strong>
          </article>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Ref</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows || []).map((row) => (
                <tr key={`${row.email}-${row.created_at}`}>
                  <td>{row.email}</td>
                  <td>
                    <select
                      value={row.status}
                      disabled={updatingId === row.id}
                      onChange={(event) => void updateStatus(row.id, event.target.value)}
                      aria-label={`Update status for ${row.email}`}
                    >
                      <option value="joined">joined</option>
                      <option value="invited">invited</option>
                      <option value="converted">converted</option>
                      <option value="bounced">bounced</option>
                    </select>
                  </td>
                  <td>{row.ref || row.source}</td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {data && data.rows.length === 0 && (
                <tr>
                  <td colSpan={4}>No signups yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function App() {
  if (window.location.pathname === "/admin/waitlist") {
    return <AdminWaitlist />;
  }

  return <LandingPage />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
