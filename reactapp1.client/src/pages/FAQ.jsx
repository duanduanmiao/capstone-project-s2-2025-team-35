// src/pages/FAQ.jsx
import React from "react";
import { Link } from "react-router-dom";

const items = [
  {
    q: "What is this site for?",
    a: (
      <>
        This platform helps the campus publish and manage events. You can discover activities,
        register online, and manage your registrations. We do <strong>not</strong> handle on-site
        check-in or attendance.
      </>
    ),
  },
  {
    q: "How do I find events?",
    a: (
      <ol>
        <li>Go to <Link to="/events">Browse events</Link>.</li>
        <li>Search by title or location.</li>
        <li>Filter by category (Technology / Creative / Sports / Wellness / Academic) or sort by date.</li>
        <li>Open an event card to see date, time, location, remaining seats, and full details.</li>
      </ol>
    ),
  },
  {
    q: "How do I register for an event?",
    a: (
      <ol>
        <li>Open the event card or the detail page.</li>
        <li>Click <strong>Register</strong>.</li>
        <li>After success, the button shows <em>Registered</em> or <em>Withdraw</em>.</li>
      </ol>
    ),
  },
  {
    q: "Where can I view my registrations?",
    a: (
      <ul>
        <li>Your status is shown on each event card (e.g., <em>Registered</em>).</li>
        <li>
          You can also go to your <strong>Dashboard → My Registrations</strong> to see all events you’ve joined
          and manage them (including Withdraw).
        </li>
      </ul>
    ),
  },
  {
    q: "How do I cancel (withdraw)?",
    a: (
      <ol>
        <li>
          <strong>From the event page:</strong> open the event you registered for and click <strong>Withdraw</strong>.
        </li>
        <li>
          <strong>From Dashboard:</strong> go to <strong>Dashboard → My Registrations</strong> and click{" "}
          <strong>Withdraw</strong> next to the event.
        </li>
        <li style={{ color: "var(--muted,#6b7280)" }}>
          Near the start time, the organizer may lock cancellations. Check the event page for organizer rules.
        </li>
      </ol>
    ),
  },
  {
    q: "What if an event is full?",
    a: (
      <>
        When seats run out, registration is closed. <strong>There is no waitlist feature.</strong> You can
        check back later in case capacity increases or someone withdraws.
      </>
    ),
  },
  {
    q: "Will I receive email notifications?",
    a: (
      <>
        <strong>No emails are sent from this system.</strong> Organizers may update the event page with
        time/venue changes. Please revisit the event page and your dashboard for the latest info.
      </>
    ),
  },
  {
    q: "Will the system warn me about time conflicts?",
    a: (
      <>
        Yes. If you try to register for overlapping events, a basic conflict warning appears so you can
        decide which one to attend.
      </>
    ),
  },
  {
    q: "Troubleshooting tips",
    a: (
      <ul>
        <li>Refresh the page and try again.</li>
        <li>Ensure you’re signed in (if required).</li>
        <li>Try a different browser or clear cookies if sign-in fails.</li>
        <li>Still stuck? Contact us via <Link to="/support">Support</Link> with a screenshot and the event title.</li>
      </ul>
    ),
  },
  {
    q: "How can I contact someone?",
    a: (
      <>
        For event-specific questions, use the contact info on that event’s page. For account or site issues,
        visit <Link to="/support">Support</Link>.
      </>
    ),
  },
];

export default function FAQ() {
  return (
    <main className="container container--lg" style={{ marginTop: 24, maxWidth: 860 }}>
      <header style={{ display: "grid", gap: 6, marginBottom: 14 }}>
        <h1 className="section-title" style={{ margin: 0 }}>FAQ</h1>
        <p style={{ color: "var(--muted,#6b7280)", marginBottom: 20 }}>
            Quick answers to common questions. Still need help? Visit <Link to="/support">Support</Link>.
        </p>
      </header>

      <div className="card faq-accordion" style={{ borderRadius: 18 }}>
        {items.map((it, i) => (
          <details key={i} className="faq-item">
            <summary className="faq-summary">{it.q}</summary>
            <div className="faq-answer">{it.a}</div>
          </details>
        ))}
      </div>
    </main>
  );
}
