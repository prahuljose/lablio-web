import React, { FormEvent, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  FileScan,
  LineChart,
  LockKeyhole,
  Sparkles,
  TestTube2,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./supabase";
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

function App() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setStatus("error");
      setMessage("Enter an email address to join the list.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setStatus("error");
      setMessage("Waitlist is almost ready. Supabase env vars still need to be added.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { error } = await supabase
      .from("waitlist_emails")
      .upsert(
        { email: trimmedEmail, source: "coming_soon_page" },
        { onConflict: "email", ignoreDuplicates: true },
      );

    if (error) {
      setStatus("error");
      setMessage("Something did not land. Please try again in a moment.");
      return;
    }

    setStatus("success");
    setMessage("You're on the early access list.");
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
