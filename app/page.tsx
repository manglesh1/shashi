"use client";

import { FormEvent, useEffect, useState } from "react";

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

const emptySupporter = {
  supporterName: "",
  supporterPhone: "",
  supporterAddress: "",
};

const defaultReferralMessage =
  "Hi, I am supporting Shashi Singh for Peel District School Board Trustee in Mississauga Wards 6 and 11. Election day is October 26, 2026. Strong school, student first, bright future. Please support Shashi Singh.";

function phoneForMessageLink(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

function saveReferrerPhoneCookie(phone: string) {
  document.cookie = `referrerPhone=${encodeURIComponent(phone)}; max-age=31536000; path=/; SameSite=Lax`;
}

function readReferrerPhoneCookie() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("referrerPhone="))
    ?.split("=")[1];
}

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState(defaultReferralMessage);
  const [supporters, setSupporters] = useState([{ ...emptySupporter }]);
  const [lastSubmitted, setLastSubmitted] = useState<
    { supporterName: string; supporterPhone: string; referrerName: string }[]
  >([]);
  const [chainPhone, setChainPhone] = useState("");
  const [chainMessage, setChainMessage] = useState("");
  const [chain, setChain] = useState<
    { id: number; supporterName: string; ward: string; supportLevel: string; status: string; createdAt: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  async function searchChainByPhone(phone: string) {
    setChainMessage("Searching...");
    setChain([]);

    const response = await fetch(`/api/referrer-chain?phone=${encodeURIComponent(phone)}`);
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
      setForm((current) => ({ ...current, referrerPhone: phone }));
      return;
    }

    setForm((current) => ({
      ...current,
      referrerName: result.referrer?.name || current.referrerName,
      referrerPhone: result.referrer?.phone || phone,
      referrerEmail: result.referrer?.email || current.referrerEmail,
    }));
    setChain(result.referrals || []);
    setChainMessage(`Found ${result.referrals?.length || 0} referral${result.referrals?.length === 1 ? "" : "s"}.`);
  }

  useEffect(() => {
    const savedPhone = readReferrerPhoneCookie();
    if (!savedPhone) return;

    const phone = decodeURIComponent(savedPhone);
    setChainPhone(phone);
    void searchChainByPhone(phone);
  }, []);

  async function submitReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const filledSupporters = supporters.filter(
      (supporter) => supporter.supporterName.trim() || supporter.supporterPhone.trim() || supporter.supporterAddress.trim()
    );

    if (!filledSupporters.length) {
      setSubmitting(false);
      setMessage("Please add at least one referral.");
      return;
    }

    const created: typeof lastSubmitted = [];

    for (const supporter of filledSupporters) {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, ...supporter, notes: "" }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setSubmitting(false);
        setMessage(result.error || "Please check the form and try again.");
        return;
      }

      created.push({
        supporterName: supporter.supporterName,
        supporterPhone: supporter.supporterPhone,
        referrerName: form.referrerName,
      });
    }

    setLastSubmitted(created);
    saveReferrerPhoneCookie(form.referrerPhone);
    setForm({ ...initialForm, referrerName: form.referrerName, referrerPhone: form.referrerPhone, referrerEmail: form.referrerEmail });
    setSupporters([{ ...emptySupporter }]);
    setChain((current) => [
      ...created.map((supporter) => ({
        id: Date.now() + Math.random(),
        supporterName: supporter.supporterName,
        ward: form.ward,
        supportLevel: form.supportLevel,
        status: "New",
        createdAt: new Date().toISOString(),
      })),
      ...current,
    ]);
    setSubmitting(false);
    setMessage(`Thank you. ${created.length} referral${created.length === 1 ? "" : "s"} added for campaign follow-up.`);
  }

  function messageFor(submission: (typeof lastSubmitted)[number]) {
    return `Hi ${submission.supporterName}, ${referralMessage}`;
  }

  function updateSupporter(index: number, field: keyof typeof emptySupporter, value: string) {
    setSupporters((current) =>
      current.map((supporter, supporterIndex) =>
        supporterIndex === index ? { ...supporter, [field]: value } : supporter
      )
    );
  }

  async function searchChain() {
    saveReferrerPhoneCookie(chainPhone);
    await searchChainByPhone(chainPhone);
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Mississauga wards 6 and 11</p>
          <h1>Trustee campaign referral tracker</h1>
          <p>
            Add people you know who may support Shashi Singh for Peel District
            School Board Trustee.
          </p>
        </div>
        <div className="hero-panel" aria-label="Referral prompt">
          <span>Share</span>
          <strong>your support chain</strong>
          <p>Ask every supporter to add three people who may vote in wards 6 or 11.</p>
        </div>
      </section>

      <section className="workspace referral-workspace">
        <div className="chain-search">
          <div>
            <p className="eyebrow">Your dashboard</p>
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
                  {item.supporterName} - {item.ward} - {item.status}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <form onSubmit={submitReferral} className="referral-form">
          <div className="section-title">
            <p className="eyebrow">For supporters</p>
            <h2>Add referrals</h2>
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
            Message to send
            <textarea className="message-template" value={referralMessage} onChange={(event) => setReferralMessage(event.target.value)} />
          </label>

          <div className="supporter-rows">
            {supporters.map((supporter, index) => (
              <div className="supporter-row" key={index}>
                <label>
                  Supporter's name
                  <input required value={supporter.supporterName} onChange={(event) => updateSupporter(index, "supporterName", event.target.value)} />
                </label>
                <label>
                  Supporter's phone
                  <input required inputMode="tel" value={supporter.supporterPhone} onChange={(event) => updateSupporter(index, "supporterPhone", event.target.value)} />
                </label>
                <label>
                  Supporter's address
                  <input required value={supporter.supporterAddress} onChange={(event) => updateSupporter(index, "supporterAddress", event.target.value)} />
                </label>
                <button
                  type="button"
                  onClick={() => setSupporters((current) => current.length === 1 ? current : current.filter((_, supporterIndex) => supporterIndex !== index))}
                  disabled={supporters.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="add-row" onClick={() => setSupporters((current) => [...current, { ...emptySupporter }])}>
              Add another referral
            </button>
          </div>

          <label className="check-row">
            <input type="checkbox" checked={form.consentToContact} onChange={(event) => setForm({ ...form, consentToContact: event.target.checked })} />
            I believe this person is comfortable being contacted by the campaign.
          </label>
          <button className="primary" disabled={submitting}>
            {submitting ? "Adding..." : "Submit referral"}
          </button>
          {message ? <p className={message.startsWith("Thank") ? "success" : "error"}>{message}</p> : null}
          {lastSubmitted.length ? (
            <div className="send-panel">
              <p>Send messages to the people just added.</p>
              <div className="send-actions">
                {lastSubmitted.map((submission, index) => {
                  const phone = phoneForMessageLink(submission.supporterPhone);
                  const text = messageFor(submission);
                  return (
                    <span className="message-pair" key={`${submission.supporterPhone}-${index}`}>
                      <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                        WhatsApp {submission.supporterName}
                      </a>
                      <a href={`sms:+${phone}?&body=${encodeURIComponent(text)}`}>
                        Text {submission.supporterName}
                      </a>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
