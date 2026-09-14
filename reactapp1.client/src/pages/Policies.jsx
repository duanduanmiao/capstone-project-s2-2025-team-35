// src/pages/Policies.jsx
import React from "react";

export default function Policies() {
  const updated = new Date().toISOString().slice(0, 10);

  return (
    <main className="container container--lg" style={{ marginTop: 24, maxWidth: 820 }}>
      <h1 className="section-title" style={{ marginBottom: 6 }}>Policies</h1>
      <p style={{ color: "var(--muted,#6b7280)", marginBottom: 18 }}>Last updated: {updated}</p>

      <article className="card" style={{ padding: 16, borderRadius: 16 }}>
        {/* 1. What we do */}
        <section id="scope" style={{ scrollMarginTop: 80, marginBottom: 16 }}>
          <h2>1) What this site does</h2>
          <p>
            Campus Event Management System helps student clubs and departments publish events and lets
            students browse and register. We do <strong>not</strong> handle on-site attendance, check-in,
            payments, or refunds.
          </p>
        </section>
        <hr />

        {/* 2. Using the site */}
        <section id="use" style={{ scrollMarginTop: 80, marginBottom: 16 }}>
          <h2>2) Using the site</h2>
          <ul>
            <li>Be respectful and follow university rules and local laws.</li>
            <li>Do not post misleading, harmful, or unlawful content or events.</li>
            <li>Keep your account info accurate so your registrations display correctly.</li>
          </ul>
        </section>
        <hr />

        {/* 3. Publishing & Registration */}
        <section id="publishing" style={{ scrollMarginTop: 80, marginBottom: 16 }}>
          <h2>3) Event publishing & registration</h2>
          <ul>
            <li>Organizers should provide accurate title, time, location, description, and capacity.</li>
            <li>Students can browse published events and register/withdraw online.</li>
            <li>Users cannot see other users’ personal information through this site.</li>
          </ul>
        </section>
        <hr />

        {/* 4. Scheduling & Conflicts */}
        <section id="scheduling" style={{ scrollMarginTop: 80, marginBottom: 16 }}>
          <h2>4) Scheduling & conflicts</h2>
          <ul>
            <li>Rooms cannot be double-booked for the same time slot.</li>
            <li>When you register for overlapping events, the site shows a basic time-conflict warning.</li>
          </ul>
        </section>
        <hr />

        {/* 5. Privacy (minimal) */}
        <section id="privacy" style={{ scrollMarginTop: 80, marginBottom: 16 }}>
          <h2>5) Privacy</h2>
          <ul>
            <li>We collect only what’s needed to run registrations (e.g., account basics, joined events).</li>
            <li>We don’t display other users’ personal data to you.</li>
            <li>If you have data questions, contact us on the Support page.</li>
          </ul>
        </section>
        <hr />

        {/* 6. Updates & Notifications */}
        <section id="updates" style={{ scrollMarginTop: 80 }}>
          <h2>6) Updates & notifications</h2>
          <ul>
            <li><strong>No email notifications are sent by this site.</strong></li>
            <li>Organizers should keep event pages up to date (e.g., time/venue changes).</li>
            <li>Please revisit the event page or your dashboard for the latest information.</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
