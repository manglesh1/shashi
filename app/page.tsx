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

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function phoneForMessageLink(value: string) {
  const digits = digitsOnly(value);
  return digits.length === 10 ? `1${digits}` : digits;
}

export default function Home() {
  const [mode, setMode] = useState<"refer" | "dashboard">("refer");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [lastSubmitted, setLastSubmitted] = useState<{
    supporterName: string;
    supporterPhone: string;
    referrerName: string;
  } | null>(null);
  const [chainPhone, setChainPhone] = useState("");
  const [chainMessage, setChainMessage] = useState("");
  const [chain, setChain] = useState<
    { id: number; supporterName: string; ward: string; supportLevel: string; status: string; createdAt: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkMessage, setBulkMessage] = useState(
    "Hi, this is a quick reminder about supporting our Mississauga trustee candidate in wards 6 and 11. Can we count on your support?"
  );

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

  const selectedReferrals = useMemo(
    () => referrals.filter((referral) => selectedIds.includes(referral.id)),
    [referrals, selectedIds]
  );

  const selectedPhones = selectedReferrals
    .map((referral) => phoneForMessageLink(referral.supporterPhone))
    .filter(Boolean);

  function adminHeaders() {
    return {
      "x-admin-user": adminUser,
      "x-admin-password": adminPassword,
    };
  }

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

    setLastSubmitted({
      supporterName: form.supporterName,
      supporterPhone: form.supporterPhone,
      referrerName: form.referrerName,
    });
    setForm({ ...initialForm, referrerName: form.referrerName, referrerPhone: form.referrerPhone, referrerEmail: form.referrerEmail });
    setChain((current) => [
      {
        id: Date.now(),
        supporterName: form.supporterName,
        ward: form.ward,
        supportLevel: form.supportLevel,
        status: "New",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setMessage("Thank you. This referral was added for campaign follow-up.");
  }

  const outgoingMessage = lastSubmitted
    ? `Hi ${lastSubmitted.supporterName}, ${lastSubmitted.referrerName} suggested I contact you about supporting our Mississauga trustee candidate in wards 6 and 11. Can we count on your support?`
    : "";
  const outgoingPhone = lastSubmitted ? phoneForMessageLink(lastSubmitted.supporterPhone) : "";

  async function searchChain() {
    setChainMessage("Searching...");
    setChain([]);

    const response = await fetch(`/api/referrer-chain?phone=${encodeURIComponent(chainPhone)}`);
    const result = (await response.json()) as {
      referrer?: { name: string; phone: string; email: string } | null;
      referrals?: typeof chain;
      error?: string;
    };

    if (!response.ok) {
      setChainMessage(result.error || "Could not find that phone number.");
      return;
    }

    if (!result.referrer) {
      setChainMessage("No chain found yet. Add the first referral below.");
      setForm({ ...form, referrerPhone: chainPhone });
      return;
    }

    setForm({
      ...form,
      referrerName: result.referrer.name,
      referrerPhone: result.referrer.phone,
      referrerEmail: result.referrer.email,
    });
    setChain(result.referrals || []);
    setChainMessage(`Found ${result.referrals?.length || 0} referral${result.referrals?.length === 1 ? "" : "s"}.`);
  }

  async function loadDashboard() {
    setDashboardMessage("Loading referrals...");
    const response = await fetch("/api/referrals", {
      headers: adminHeaders(),
    });
    const result = (await response.json()) as { referrals?: Referral[]; error?: string };

    if (!response.ok) {
      setDashboardMessage(result.error || "Could not open the campaign dashboard.");
      return;
    }

    setReferrals(result.referrals || []);
    setSelectedIds([]);
    setDashboardMessage("");
  }

  async function updateReferral(id: number, status: string, notes: string) {
    const response = await fetch(`/api/referrals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...adminHeaders() },
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

  function toggleSelected(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function selectVisible() {
    setSelectedIds(filteredReferrals.map((referral) => referral.id));
  }

  function clearSelected() {
    setSelectedIds([]);
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
          <div className="chain-search">
            <div>
              <p className="eyebrow">Continue your chain</p>
              <h2>Find your referrals by phone</h2>
            </div>
            <div className="chain-controls">
              <input
                placeholder="Your phone number"
                inputMode="tel"
                value={chainPhone}
                onChange={(event) => setChainPhone(event.target.value)}
              />
              <button onClick={searchChain}>Search</button>
            </div>
            {chainMessage ? <p className="notice">{chainMessage}</p> : null}
            {chain.length ? (
              <div className="chain-list">
                {chain.map((item) => (
                  <span key={item.id}>
                    {item.supporterName} · {item.ward} · {item.status}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
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
            {lastSubmitted && outgoingPhone ? (
              <div className="send-panel">
                <p>Send this person a quick message now.</p>
                <div className="send-actions">
                  <a
                    href={`https://wa.me/${outgoingPhone}?text=${encodeURIComponent(outgoingMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                  <a href={`sms:+${outgoingPhone}?&body=${encodeURIComponent(outgoingMessage)}`}>
                    Text message
                  </a>
                </div>
              </div>
            ) : null}
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
              <input placeholder="User ID" value={adminUser} onChange={(event) => setAdminUser(event.target.value)} />
              <input placeholder="Password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
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
            <button onClick={selectVisible} disabled={!filteredReferrals.length}>Select visible</button>
            <button onClick={clearSelected} disabled={!selectedIds.length}>Clear</button>
            <button onClick={exportCsv} disabled={!filteredReferrals.length}>Export CSV</button>
          </div>

          <div className="bulk-panel">
            <div>
              <p className="eyebrow">Mass message</p>
              <h3>{selectedIds.length} selected</h3>
            </div>
            <textarea
              value={bulkMessage}
              onChange={(event) => setBulkMessage(event.target.value)}
              placeholder="Message to selected people"
            />
            <div className="send-actions">
              <a
                className={selectedPhones.length ? "" : "disabled-link"}
                href={selectedPhones.length ? `sms:${selectedPhones.map((phone) => `+${phone}`).join(",")}?&body=${encodeURIComponent(bulkMessage)}` : undefined}
              >
                Text selected
              </a>
            </div>
            {selectedReferrals.length ? (
              <div className="whatsapp-list">
                {selectedReferrals.map((referral) => {
                  const phone = phoneForMessageLink(referral.supporterPhone);
                  return (
                    <a
                      key={referral.id}
                      href={`https://wa.me/${phone}?text=${encodeURIComponent(bulkMessage)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp {referral.supporterName}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {dashboardMessage ? <p className="notice">{dashboardMessage}</p> : null}

          <div className="referral-list">
            {filteredReferrals.map((referral) => (
              <article className="referral-card" key={referral.id}>
                <div className="card-main">
                  <label className="select-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(referral.id)}
                      onChange={() => toggleSelected(referral.id)}
                    />
                    Select
                  </label>
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
