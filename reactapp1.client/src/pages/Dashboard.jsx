import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { normalizeEventTimes, formatDateTime } from '../utils/dateTimeUtils.js';
import { API_BASE_URL } from '../utils/config.js';
import EventCard from '../components/EventCard.jsx';
import CalendarGrid from "../components/CalendarGrid.jsx";

export default function Dashboard() {
    // ✅ Added: Retrieve user ID from cookie and set it in state
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);

    // ✅ Added: Fetch current user ID from cookie
    useEffect(() => {
        const getCurrentUserId = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    // // User not logged in, redirect to login page
                    navigate('/login', { replace: true });
                    return;
                }

                const userData = await response.json();
                // ✅ Save the user ID from cookie into state
                setUserId(userData.id);

            } catch (err) {
                console.error('Failed to get current user:', err);
                navigate('/login', { replace: true });
            }
        };

        getCurrentUserId();
    }, [navigate]);

    // Redirect if userId is missing (same logic, but now userId comes from cookie instead of URL params)
    useEffect(() => {
        if (userId === null) return; // still loading
        if (!userId) {
            navigate('/login', { replace: true });
        }
    }, [userId, navigate]);

    // Load role → if Organizer redirect to /manage. Else load student dashboard.
    // ✅ Same logic, just with userId coming from cookie instead of URL params
    useEffect(() => {
        if (!userId) return;

        const loadUserRole = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await fetch(
                    `${API_BASE_URL}/dashboard/user/${encodeURIComponent(userId)}/role`,
                    { credentials: 'include' }
                );

                if (!response.ok) {
                    if (response.status === 404) setError('User not found');
                    else throw new Error(`Failed to load user role: ${response.status}`);
                    return;
                }

                const roleData = await response.json();
                setUserRole(roleData);

                // organizers are sent to Manage; stop rendering this page
                if (roleData.role === 'Organizer') {
                    navigate(`/manage`, { replace: true });
                    return;
                }

                // Students stay here
                await loadStudentDashboard(userId);
            } catch (err) {
                console.error('Failed to load user role:', err);
                setError('Failed to load user information');
                setLoading(false);
            }
        };

        loadUserRole();
    }, [userId, navigate]);

    const loadStudentDashboard = async (studentId) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/student/${encodeURIComponent(studentId)}`,
          { credentials: 'include' }
        );
        if (!response.ok) {
          throw new Error(`Failed to load student dashboard: ${response.status}`);
        }

        const data = await response.json();

        // unify all the event time fields into startAt/endAt
        const normalized = (data?.registeredEvents ?? []).map((e) =>
          normalizeEventTimes({
            ...e,
            startAt: e.startAt ?? e.StartAt ?? e.startTime ?? e.startDateTime ?? e.date ?? e.start ?? e.beginTime,
            endAt: e.endAt ?? e.EndAt ?? e.endTime ?? e.endDateTime ?? e.finish ?? e.end,
          })
        );


        // store back to dashboardData (with normalized registeredEvents)
        setDashboardData({ ...data, registeredEvents: normalized });

        // only keep upcoming events
        setEvents(normalized.filter((e) => !isExpired(e)));

      } catch (err) {
        console.error('Failed to load student dashboard:', err);
        setError('Failed to load your registered events');
      } finally {
        setLoading(false);
      }
    };

    const handleWithdraw = async (eventId) => {
        if (!userId || !userRole || userRole.role !== 'Student') return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/dashboard/student/${encodeURIComponent(userId)}/events/${encodeURIComponent(eventId)}`,
                { method: 'DELETE', credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error(`Failed to withdraw: ${response.status}`);
            }

            await loadStudentDashboard(userId);
            alert('Successfully withdrew from the event');
        } catch (err) {
            console.error('Failed to withdraw:', err);
            alert('Failed to withdraw from event. Please try again.');
        }
    };

    function isExpired(ev) {
        const endMs = ev?.endAt ? new Date(ev.endAt).getTime() : NaN;
        return Number.isFinite(endMs) ? endMs <= Date.now() : false;
        }

    useEffect(() => {
        if (!dashboardData || userRole?.role !== 'Student') return;

        const ev = dashboardData.registeredEvents || [];
        const filtered = ev.filter(event => !isExpired(event));
        setEvents(filtered);
    }, [dashboardData, userRole]);

  // ✅ count of registered upcoming events
  const registeredUpcomingCount = useMemo(
    () => (dashboardData?.registeredEvents ?? []).filter(e => !isExpired(e)).length,
    [dashboardData]
  );

// upcoming helpers
  function getStartMs(ev) {
    const d = ev?.startAt ? new Date(ev.startAt) : null;
    return d && !isNaN(d) ? d.getTime() : null;
  }

  function fmtDateTime(dtLike) {
    const d = new Date(dtLike);
    if (isNaN(d)) return "";
    return d.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function UpcomingTimeline({ items = []}) {
    if (!items.length) return null;

    const chip = {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 400, // 普通，不加粗
      borderRadius: 999,
      background: "var(--soft, #eaf7ff)",
      color: "var(--ink, #1f2937)",
      border: "1px dashed var(--edge, #d8ecff)",
      whiteSpace: "nowrap",
    };

    return (
      <section className="upcoming card" style={{ padding: 16, borderRadius: 18, marginBottom: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((ev) => {
            const startMs = getStartMs(ev);
            const whenStr = startMs
               ? formatDateTime(new Date(startMs), {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "TBA";
            const reg = typeof isRegistered === "function" ? !!isRegistered(ev) : false;

            return (
              <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12 }}>
                {/* 竖线 + 节点 */}
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: "var(--edge, #d8ecff)",
                    }}
                    aria-hidden
                  />
                  <div
                    style={{
                      position: "relative",
                      top: 6,
                      left: 3,
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "var(--brand, #6ecbff)",
                      boxShadow: "0 0 0 3px rgba(110,203,255,.25)",
                    }}
                  />
                </div>

                {/* 内容 */}
                <div
                  style={{
                    background: "var(--soft, #eaf7ff)",
                    border: "1px solid var(--edge, #d8ecff)",
                    borderRadius: 14,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* 第一行：标题 + 类别 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, lineHeight: 1.25 }}>
                      {ev.title || "Untitled event"}
                    </div>
                    {ev.category ? <span style={chip}>🏷️ {ev.category}</span> : null}
                  </div>

                  {/* 第二行：时间 & 地点（靠左） */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={chip}>🕒 {whenStr}</span>
                    {ev.location ? <span style={chip}>📍 {ev.location}</span> : null}
                  </div>

                  {/* 第三行：操作组（靠左） */}
                  <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, marginTop: 4 }}>
                    <Link
                      to={`/events/${encodeURIComponent(ev.id)}`}
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      View details
                    </Link>
                    <button className="btn" 
                        onClick={() => handleWithdraw(ev.id)}>
                        Withdraw
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }


  const upcomingTop = useMemo(() => {
    const now = Date.now();
    const future = (events || [])
      .map((ev) => ({ ev, ms: getStartMs(ev) }))
      .filter((x) => x.ms && x.ms > now)
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 5)
      .map((x) => x.ev);
    return future;
  }, [events]);

    return (
        <main className="container" style={{ marginTop: "20px" }}>
            <section style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 16,
              alignItems: "stretch", // 两列等高
            }}
          >
            {/* 左：hero */}
            <section
              className="hero"
              style={{
                marginBottom: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <h1 style={{ margin: 0 }}>My events</h1>
              <p style={{ marginTop: 6 }}>Here's what you're attending soon. ✨</p>
              {!loading && !error && (
                <div className="small" style={{ marginTop: 8 }}>
                  You’ve registered {registeredUpcomingCount} upcoming event{registeredUpcomingCount !== 1 ? "s" : ""}.
                </div>
              )}
            </section>

            {/* 右：Calendar（独立，不套额外 card） */}
            <aside style={{ display: "flex", alignItems: "stretch" }}>
              <CalendarGrid
                title={userRole === "Organizer" ? "My Organizer Calendar" : "My Registered Events"}
                events={events}
                width={330}
                rowHeight={40}
                onEventClick={(ev) => {
                  if (userRole === "Organizer") {
                    if (userId) {
                      window.location.href =
                        `/manage/create?organizerId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(ev.id)}`;
                    }
                  } else {
                    window.location.href = `/events/${encodeURIComponent(ev.id)}`;
                  }
                }}
              />
            </aside>
          </div>
        </section>

        <section id="upcoming" style={{ marginBottom: 40 }}>
          {upcomingTop.length > 0 && (
            <>
              <h2 style={{ margin: "26px 0 10px" }}>Upcoming Events</h2>
              <UpcomingTimeline
                items={upcomingTop}
              />
            </>
          )}
        </section>
        {events.length > 0 && (
            <h2 style={{ margin: "26px 0 10px" }}>
                    Upcoming Registered Events ({events.length})
                    </h2>
            )}

            <div className="card" style={{ marginTop: "18px" }}>
                {loading ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#666" }}>
                        Loading your dashboard...
                    </div>
                ) : error ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
                        {error}
                        <br />
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                // ✅ Small change: reload user info instead of just redirecting
                                setError('');
                                setLoading(true);
                                if (userId) {
                                    // Re-trigger loadUserRole
                                    window.location.reload();
                                }
                            }}
                            style={{ marginTop: 12 }}
                        >
                            Try Again
                        </button>
                    </div>
                ) : events.length > 0 ? (
                    <>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "20px",
                            marginTop: "16px",
                            padding: "8px"
                        }}
                    >
                        {events.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                role="student"
                                me={{ id: userId, username: userRole?.username }}
                                isRegistered={true} // Dashboard only shows registered events
                                onWithdraw={handleWithdraw}
                                secondaryText="View details"
                            />
                        ))}
                    </div>
                    </>
                ) : (
                    <div style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        color: "#666",
                        minHeight: "200px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center"
                    }}>
                        <div style={{ marginBottom: "20px" }}>
                            You haven't registered for any events yet.
                        </div>
                        <Link
                            to="/events"
                            className="btn btn-primary"
                            style={{
                                marginTop: '12px',
                                position: 'relative',
                                zIndex: 1
                            }}
                        >
                            Browse Events
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}