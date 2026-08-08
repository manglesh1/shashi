"use client";

import { FormEvent, useMemo, useState } from "react";

type Referral = {
  id: number;
  referrerName: string;
  referrerPhone: string;
  referrerEmail: string;
  supporterName: string;
  supporterPhone: string;
  supporterAddress: string;
  supporterPostal: string;
  ward: string;
  supportLevel: string;
  consentToContact: boolean;
  status: string;
  notes: string;
  createdAt: string;
};

const initialForm = {
  referrerName: "",
  referrerPhone: "",
  referrerEmail: "",
  supporterName: "",
  supporterPhone: "",
  supporterAddress: "",
  supporterPostal: "",
  ward: "Ward 6",
  supportLevel: "Likely supporter",
  consentToContact: true,
  notes: "",
};

const statusOptions = ["New", "Call today", "Door knock", "Confirmed", "Not supporting", "No answer"];

function csvCell(value: string | number | boolean) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function Home() {
  const [mode, setMode] = useState<"refer" | "dashboard">("refer");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredReferrals = useMemo(() => {
    if (filter === "All") return referrals;
    return referrals.filter((referral) => referral.status === filter || referral.ward === filter);
  }, [filter, referrals]);

  const counts = useMemo(() => {
    return referrals.reduce(
      (acc, referral) => {
        acc.total += 1;
        acc[referral.status] = (acc[referral.status] ?? 0) + 1;
        acc[referral.ward] = (acc[referral.ward] ?? 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [referrals]);

  async function submitReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const response = await fetch("/api/referrals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = (await response.json()) as { error?: string };
    setSubmitting(false);

    if (!response.ok) {
      setMessage(result.error || "Please check the form and try again.");
      return;
    }

    setForm({ ...initialForm, referrerName: form.referrerName, referrerPhone: form.referrerPhone, referrerEmail: form.referrerEmail });
    setMessage("Thank you. This referral was added for campaign follow-up.");
  }

  async function loadDashboard() {
    setDashboardMessage("Loading referrals...");
    const response = await fetch("/api/referrals", {
      headers: { "x-admin-code": adminCode },
    });
    const result = (await response.json()) as { referrals?: Referral[]; error?: string };

    if (!response.ok) {
      setDashboardMessage(result.error || "Could not open the campaign dashboard.");
      return;
    }

    setReferrals(result.referrals || []);
    setDashboardMessage("");
  }

  async function updateReferral(id: number, status: string, notes: string) {
    const response = await fetch(`/api/referrals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-code": adminCode },
      body: JSON.stringify({ status, notes }),
    });

    if (response.ok) {
      setReferrals((current) =>
        current.map((referral) =>
          referral.id === id ? { ...referral, status, notes } : referral
        )
      );
    }
  }

  function exportCsv() {
    const headers = [
      "Submitted",
      "Status",
      "Ward",
      "Support level",
      "Supporter name",
      "Supporter phone",
      "Address",
      "Postal",
      "Referrer name",
      "Referrer phone",
      "Referrer email",
      "Consent",
      "Notes",
    ];
    const rows = filteredReferrals.map((referral) => [
      referral.createdAt,
      referral.status,
      referral.ward,
      referral.supportLevel,
      referral.supporterName,
      referral.supporterPhone,
      referral.supporterAddress,
      referral.supporterPostal,
      referral.referrerName,
      referral.referrerPhone,
      referral.referrerEmail,
      referral.consentToContact,
      referral.notes,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ward-6-11-referrals.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Mississauga wards 6 and 11</p>
          <h1>Trustee campaign referral tracker</h1>
          <p>
            Collect supporter names, phone numbers, and addresses from friends and
            volunteers so the campaign team can follow up before election day.
          </p>
          <div className="mode-switch" aria-label="Choose view">
            <button className={mode === "refer" ? "active" : ""} onClick={() => setMode("refer")}>
              Add referral
            </button>
            <button className={mode === "dashboard" ? "active" : ""} onClick={() => setMode("dashboard")}>
              Campaign dashboard
            </button>
          </div>
        </div>
        <div className="hero-panel" aria-label="Campaign totals">
          <span>{counts.total || "Share"}</span>
          <strong>{counts.total ? "referrals collected" : "the link"}</strong>
          <p>Ask every supporter to add three people who may vote in wards 6 or 11.</p>
        </div>
      </section>

      {mode === "refer" ? (
        <section className="workspace referral-workspace">
          <form onSubmit={submitReferral} className="referral-form">
            <div className="section-title">
              <p className="eyebrow">For supporters</p>
              <h2>Add someone the campaign should contact</h2>
            </div>

            <div className="grid two">
              <label>
                Your name
                <input required value={form.referrerName} onChange={(event) => setForm({ ...form, referrerName: event.target.value })} />
              </label>
              <label>
                Your phone
                <input required inputMode="tel" value={form.referrerPhone} onChange={(event) => setForm({ ...form, referrerPhone: event.target.value })} />
              </label>
            </div>
            <label>
              Your email, optional
              <input inputMode="email" value={form.referrerEmail} onChange={(event) => setForm({ ...form, referrerEmail: event.target.value })} />
            </label>

            <div className="grid two">
              <label>
                Supporter's name
                <input required value={form.supporterName} onChange={(event) => setForm({ ...form, supporterName: event.target.value })} />
              </label>
              <label>
                Supporter's phone
                <input required inputMode="tel" value={form.supporterPhone} onChange={(event) => setForm({ ...form, supporterPhone: event.target.value })} />
              </label>
            </div>
            <label>
              Supporter's address
              <input required value={form.supporterAddress} onChange={(event) => setForm({ ...form, supporterAddress: event.target.value })} />
            </label>
            <div className="grid three">
              <label>
                Postal code
                <input value={form.supporterPostal} onChange={(event) => setForm({ ...form, supporterPostal: event.target.value })} />
              </label>
              <label>
                Ward
                <select value={form.ward} onChange={(event) => setForm({ ...form, ward: event.target.value })}>
                  <option>Ward 6</option>
                  <option>Ward 11</option>
                  <option>Ward 6 or 11</option>
                  <option>Not sure</option>
                </select>
              </label>
              <label>
                Support level
                <select value={form.supportLevel} onChange={(event) => setForm({ ...form, supportLevel: event.target.value })}>
                  <option>Likely supporter</option>
                  <option>Strong supporter</option>
                  <option>Needs follow-up</option>
                  <option>Undecided</option>
                </select>
              </label>
            </div>
            <label>
              Notes, optional
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Best time to call, language preference, connection, or other helpful detail" />
            </label>
            <label className="check-row">
              <input type="checkbox" checked={form.consentToContact} onChange={(event) => setForm({ ...form, consentToContact: event.target.checked })} />
              I believe this person is comfortable being contacted by the campaign.
            </label>
            <button className="primary" disabled={submitting}>
              {submitting ? "Adding..." : "Submit referral"}
            </button>
            {message ? <p className={message.startsWith("Thank") ? "success" : "error"}>{message}</p> : null}
          </form>
        </section>
      ) : (
        <section className="workspace dashboard">
          <div className="dashboard-top">
            <div>
              <p className="eyebrow">Campaign team</p>
              <h2>Referral dashboard</h2>
            </div>
            <div className="admin-login">
              <input placeholder="Access code" value={adminCode} onChange={(event) => setAdminCode(event.target.value)} />
              <button className="primary" onClick={loadDashboard}>Open</button>
            </div>
          </div>

          <div className="metrics">
            <div><span>{counts.total}</span><p>Total referrals</p></div>
            <div><span>{counts["Ward 6"] || 0}</span><p>Ward 6</p></div>
            <div><span>{counts["Ward 11"] || 0}</span><p>Ward 11</p></div>
            <div><span>{counts["Confirmed"] || 0}</span><p>Confirmed</p></div>
          </div>

          <div className="toolbar">
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option>All</option>
              <option>Ward 6</option>
              <option>Ward 11</option>
              {statusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button onClick={exportCsv} disabled={!filteredReferrals.length}>Export CSV</button>
          </div>

          {dashboardMessage ? <p className="notice">{dashboardMessage}</p> : null}

          <div className="referral-list">
            {filteredReferrals.map((referral) => (
              <article className="referral-card" key={referral.id}>
                <div className="card-main">
                  <div>
                    <p className="eyebrow">{referral.ward} · {referral.supportLevel}</p>
                    <h3>{referral.supporterName}</h3>
                    <p>{referral.supporterPhone}</p>
                    <p>{referral.supporterAddress} {referral.supporterPostal}</p>
                  </div>
                  <div>
                    <p><strong>Referred by</strong> {referral.referrerName}</p>
                    <p>{referral.referrerPhone}</p>
                    <p>{new Date(referral.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <select value={referral.status} onChange={(event) => updateReferral(referral.id, event.target.value, referral.notes)}>
                    {statusOptions.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <textarea
                    value={referral.notes}
                    onChange={(event) => setReferrals((current) => current.map((item) => item.id === referral.id ? { ...item, notes: event.target.value } : item))}
                    onBlur={(event) => updateReferral(referral.id, referral.status, event.target.value)}
                    placeholder="Follow-up notes"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
