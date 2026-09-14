import React, { useState } from "react";

export default function Support() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    // Temporary: open email client. Replace with your API call when ready.
    const mail = `mailto:events@example.edu?subject=${encodeURIComponent(
      `[Support] ${form.subject || "No subject"}`
    )}&body=${encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    )}`;
    window.location.href = mail;
  };

  return (
    <main className="container container--lg" style={{ marginTop: 24, maxWidth: 720 }}>
      <h1 className="section-title" style={{ marginBottom: 12 }}>Support</h1>
      <p style={{ color: "var(--muted,#6b7280)", marginBottom: 20 }}>
        Tell us what you need help with. For urgent issues, email <a href="mailto:events@example.edu">sjin911@aucklanduni.ac.nz</a>.
      </p>

      <form className="card" onSubmit={onSubmit} style={{ borderRadius: 18, padding: 16, display: "grid", gap: 12 }}>
        <label>
          <span>Name</span>
          <input name="name" value={form.name} onChange={onChange} required className="input" placeholder="Your name" />
        </label>

        <label>
          <span>Email</span>
          <input name="email" type="email" value={form.email} onChange={onChange} required className="input" placeholder="you@example.com" />
        </label>

        <label>
          <span>Subject</span>
          <input name="subject" value={form.subject} onChange={onChange} className="input" placeholder="Subject" />
        </label>

        <label>
          <span>Message</span>
          <textarea name="message" value={form.message} onChange={onChange} required rows={6} className="input" placeholder="Describe your issue..." />
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="reset" className="btn" onClick={() => setForm({ name: "", email: "", subject: "", message: "" })}>
            Clear
          </button>
          <button type="submit" className="btn-primary">Send</button>
        </div>
      </form>
    </main>
  );
}
