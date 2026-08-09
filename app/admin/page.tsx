"use client";

import { useMemo, useState } from "react";

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

const statusOptions = ["New", "Call today", "Door knock", "Confirmed", "Not supporting", "No answer"];

function csvCell(value: string | number | boolean) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function phoneForMessageLink(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

export default function AdminPage() {
  const [adminUser, setAdminUser] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkMessage, setBulkMessage] = useState(
    "Hi, this is a quick reminder about supporting Shashi Singh for Peel District School Board Trustee in Mississauga wards 6 and 11. Can we count on your support?"
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

  return (
    <main>
      <section className="hero admin-hero">
        <div className="hero-copy">
          <p className="eyebrow">Campaign team</p>
          <h1>Admin dashboard</h1>
          <p>Login to review referrals, export all data, and message selected supporters.</p>
        </div>
      </section>

      <section className="workspace dashboard">
        <div className="dashboard-top">
          <div>
            <p className="eyebrow">Secure access</p>
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
          <button onClick={() => setSelectedIds(filteredReferrals.map((referral) => referral.id))} disabled={!filteredReferrals.length}>Select visible</button>
          <button onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>Clear</button>
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
                    onChange={() => setSelectedIds((current) =>
                      current.includes(referral.id)
                        ? current.filter((item) => item !== referral.id)
                        : [...current, referral.id]
                    )}
                  />
                  Select
                </label>
                <div>
                  <p className="eyebrow">{referral.ward} - {referral.supportLevel}</p>
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
    </main>
  );
}
