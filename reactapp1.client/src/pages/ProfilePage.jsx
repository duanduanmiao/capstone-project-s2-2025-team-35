// src/pages/ProfilePage.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { API_BASE_URL } from "../utils/config.js";
import defaultAvatar from "../assets/img/profile.jpg"; // ✅ renamed (minimal change)
import EventCard from "../components/EventCard";
import { normalizeEventTimes } from "../utils/dateTimeUtils.js";
import { getAvatarUrl } from "../utils/avatars";

/* helpers */
function formatDate(s) {
    try {
        return new Date(s).toLocaleString(undefined, {
            year: "numeric", month: "short", day: "2-digit",
            hour: "2-digit", minute: "2-digit",
        });
    } catch { return s ?? "—"; }
}

export default function ProfilePage() {
    const { userId : routeUserId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [total, setTotal] = useState(0);
    const [profileRole, setProfileRole] = useState("");

    // avatar state
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarS3Key, setAvatarS3Key] = useState("");  // ADDED: Store S3 key

    // upcoming events
    const [events, setEvents] = useState([]);

    const handleBack = () => {
    // In RRD v6, history index is in window.history.state.idx
    const idx = window.history?.state?.idx ?? 0;
    if (idx > 0) {
        navigate(-1);           // go back if there IS history
    } else {
        navigate("/dashboard"); // fallback when opened directly/new tab
    }
    };

    function isExpired(ev) {
        const startRaw = ev?.endAt ?? ev?.StartAt;
        const start = startRaw ? new Date(startRaw).getTime() : NaN;
        if (!Number.isFinite(start)) return false; // treat missing/invalid as not expired
        return start <= Date.now();
        }


    async function refreshMe() {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" });
            if (res.ok) setUser(await res.json());
            else setUser(null);
        } catch { setUser(null); }
    }

    async function loadProfile(id) {
        if (!id) {
            setError("You’re not logged in.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError("");
            const res = await fetch(`${API_BASE_URL}/profile/${id}`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (res.status === 401) {
                setUser(null);
                setError("Your session expired. Please log in.");
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`);

            const data = await res.json();
            setProfile(data);
            setName(data.username ?? "");
            setEmail(data.email ?? "");
            setAvatarUrl(data.profilePictureUrl ?? getAvatarUrl(id));
            const role = String(data.role).toLowerCase() ?? "";
            setProfileRole(role ?? "");

            if (role === "organizer") {
                const res2 = await fetch(`${API_BASE_URL}/profile/${id}/getOrganizerPublished`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
                if (res2.ok) setTotal(await res2.json());
            } else if (role === "student") {
                const res2 = await fetch(`${API_BASE_URL}/profile/${id}/getStudentRegistrations`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
                if (res2.ok) setTotal(await res2.json());
            }

            if (role === 'student') await loadStudentDashboard(id);
            else if (role === 'organizer') await loadOrganizerDashboard(id);

        } catch (err) {
            setError(err.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    }

    // ADDED: S3 upload function for avatar (similar to event image upload)
    const uploadAvatarToS3 = async (file, userId) => {
        try {
            // Get presigned URL from backend
            const presignedResponse = await fetch(
                `${API_BASE_URL}/fileupload/presigned-url?userId=${userId}&fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
                { credentials: 'include' }
            );

            if (!presignedResponse.ok) {
                throw new Error('Failed to get presigned URL');
            }

            const presignedData = await presignedResponse.json();

            // Upload file to S3 using presigned POST
            const formData = new FormData();
            Object.keys(presignedData.fields).forEach(key => {
                formData.append(key, presignedData.fields[key]);
            });
            formData.append('file', file);

            const uploadResponse = await fetch(presignedData.url, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload to S3');
            }

            return presignedData.s3Key; // Return S3 key like "user-avatars/123/photo.jpg"
        } catch (error) {
            console.error('S3 avatar upload error:', error);
            throw error;
        }
    };


    // MODIFIED: Handle avatar file selection with immediate local preview
    async function onAvatarPick(file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Please choose an image file.");
            return;
        }

        // Create local preview immediately for better UX
        setAvatarFile(file);
        const localUrl = URL.createObjectURL(file);
        setAvatarUrl(localUrl);
    }

    // MODIFIED: Save profile with S3 avatar upload
    async function saveProfile() {
        if (!user?.id) return navigate("/login", { replace: true });
        const targetId = routeUserId ?? user.id;

        try {
            setError("");
            setAvatarBusy(true);

            let newAvatarS3Key = avatarS3Key;

            // Upload avatar to S3 if file was selected
            if (avatarFile) {
                newAvatarS3Key = await uploadAvatarToS3(avatarFile, user.id);
                console.log('Avatar uploaded to S3:', newAvatarS3Key);
            }

            // Save profile with S3 key (backend will generate display URL)
            const res = await fetch(`${API_BASE_URL}/profile/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: name,
                    email,
                    avatarS3Key: newAvatarS3Key || null,  // CHANGED: Send S3 key instead of URL
                }),
            });

            if (res.status === 204) {
                // Re-fetch profile
                const getRes = await fetch(`${API_BASE_URL}/profile/${user.id}`, { credentials: "include" });
                if (getRes.ok) {
                    const updated = await getRes.json();
                    setProfile(updated);
                    setAvatarUrl(updated.profilePictureUrl ?? "");
                    setAvatarS3Key(updated.avatarS3Key ?? "");
                }
            } else if (res.ok) {
                // 200 OK with updated profile
                const updated = await res.json();
                setProfile(updated);
                setName(updated.username ?? "");
                setEmail(updated.email ?? "");
                setAvatarUrl(updated.profilePictureUrl ?? "");
                setAvatarS3Key(updated.avatarS3Key ?? "");
            } else {
                throw new Error(`Failed to save profile: ${res.status}`);
            }
            // Clear file state after successful save

            // 🔑 触发事件，通知 Header 刷新用户信息
            window.dispatchEvent(new Event('userProfileUpdated'));

            setAvatarFile(null);
            alert("Profile saved.");
        } catch (err) {
            setError(err.message || "Failed to save profile");
        } finally {
            setAvatarBusy(false);
        }
    }

    const loadOrganizerDashboard = async (organizerId) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/dashboard/organizer/${encodeURIComponent(organizerId)}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error(`Failed to load organizer dashboard: ${response.status}`);
            }

            const data = await response.json();
            const raw = data?.PublishedEvents ?? data?.publishedEvents ?? [];
            const upcoming = (Array.isArray(raw) ? raw : [])
            .map(normalizeEventTimes)   // 先统一时间字段&补Z
            .filter((e) => !isExpired(e)); // 再根据统一后的时间判断是否过期
            setEvents(upcoming);
        } catch (err) {
            console.error('Failed to load organizer dashboard:', err);
            setError('Failed to load your published events');
        } finally {
            setLoading(false);
        }
    };


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
            const raw = data?.PublishedEvents ?? data?.publishedEvents ?? [];
            const upcoming = (Array.isArray(raw) ? raw : [])
             .map(normalizeEventTimes)   // 先统一时间字段&补Z
             .filter((e) => !isExpired(e)); // 再根据统一后的时间判断是否过期
            setEvents(upcoming);
        } catch (err) {
            console.error('Failed to load student dashboard:', err);
            setError('Failed to load your registered events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshMe();
        const onMsg = (e) => {
            if (e?.data?.type === "GOOGLE_AUTH_SUCCESS") refreshMe();
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
    }, []);

    useEffect(() => {
        const id = routeUserId ?? user?.id;     // param wins
        if (id) loadProfile(id);
    }, [routeUserId, user?.id]);

    const isOrganizer = String(user?.role || "").toLowerCase() === "organizer";
    const viewingSelf = !!user && (!!routeUserId ? String(user.id) === String(routeUserId) : true);
    const canEdit = viewingSelf || isOrganizer;

    // ---------- UI (unchanged design) ----------
    return (
        <main className="container" style={{ marginTop: 20 }}>
            <section className="hero">
                <h1>{viewingSelf ? "My Profile" : "User Profile"}</h1>
                <p>{viewingSelf ? (
                    isOrganizer ? "Your organizer account details." : "Your student account details."
                ) :(
                    profileRole === 'organizer' ? `${name}'s organizer account details.` : `${name}'s student account details.`
                )
                }</p >
            </section>

            <div className="card" style={{ marginTop: 18, padding: 16 }}>
                {!user && !loading && (
                    <div style={{ textAlign: "center", color: "#dc2626" }}>
                        You’re not logged in.
                        <div style={{ marginTop: 12 }}>
                            <button className="btn btn-primary" onClick={() => navigate("/login")}>
                                Log in
                            </button>
                        </div>
                    </div>
                )}

                {loading && <div style={{ padding: "24px 12px", color: "#666" }}>Loading…</div>}

                {!loading && error && user && (
                    <div style={{ textAlign: "center", color: "#dc2626" }}>
                        {error}
                        <div style={{ marginTop: 12 }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => (user ? loadProfile(user.id) : navigate("/login"))}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {!loading && !error && user && profile && (
                    <div style={{ display: "grid", gap: 16 }}>
                        {/* Avatar + pick */}
                        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                            <div
                                style={{
                                    width: 100,
                                    height: 100,                // or use: aspectRatio: "1 / 1"
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "#f3f4f6",
                                    border: "1px solid var(--edge)",
                                    flex: "0 0 auto",
                                }}
                            >
                                <img
                                    src={avatarUrl || defaultAvatar}
                                    onError={(e) => { e.currentTarget.src = defaultAvatar; }}
                                    alt="Avatar"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "block",          // prevents bottom gap
                                        objectFit: "cover",        // fill the circle
                                        objectPosition: "50% 50%", // center the crop
                                    }}
                                />
                            </div>
                            
                            {viewingSelf ? (
                            <>
                            <label
                                className="btn btn-ghost"
                                title="Change avatar"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "8px 12px",
                                    borderRadius: 9999,
                                    border: "1px solid var(--edge)",
                                    background: "#fff",
                                    boxShadow: "var(--shadow)",
                                    color: "#0f4c81",
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    width: "auto",        // keep compact (no full width)
                                    minWidth: "unset",
                                    flex: "0 0 auto",     // don't stretch
                                    cursor: avatarBusy ? "not-allowed" : "pointer",
                                    opacity: avatarBusy ? 0.6 : 1,
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" strokeWidth="1.75" />
                                    <circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
                                </svg>
                                <span>{avatarBusy ? "Uploading…" : "Choose image"}</span>
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => onAvatarPick(e.target.files?.[0])}
                                    disabled={avatarBusy || !canEdit}
                                />
                            </label> </>) : null}
                        </div>

                        {viewingSelf ? (
                            <>
                        <div style={{ display: "grid", gap: 12 }}>
                            <label className="label">Name</label>
                            <input
                                className="input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <table className="table" style={{ marginTop: 8 }}>
                            <tbody>
                            <tr><th>Email</th><td>{profile.email}</td></tr>
                            <tr><th style={{ width: 160 }}>ID</th><td>{profile.id}</td></tr>
                            <tr><th>Role</th><td>{profile.role}</td></tr>
                            {profileRole === "organizer" ? (
                                <>
                                <tr><th>Published</th><td>{total}</td></tr>
                                </>
                            ) : (
                                <tr><th>Registered</th><td>{total}</td></tr>
                            )}
                            <tr><th>Created</th><td>{formatDate(profile.createdAt)}</td></tr>
                            <tr><th>Last login</th><td>{profile.lastLoginAt ? formatDate(profile.lastLoginAt) : "—"}</td></tr>
                            </tbody>
                        </table>
                        </>) : (
                        <table className="table" style={{ marginTop: 8 }}>
                            <tbody>
                            <tr><th>Name</th><td>{profile.username}</td></tr>
                            <tr><th>Email</th><td>{profile.email}</td></tr>
                            {profileRole === "organizer" ? (
                                <>
                                <tr><th>Published</th><td>{total}</td></tr>
                                </>
                            ) : (
                                <tr><th>Registered</th><td>{total}</td></tr>
                            )}
                            </tbody>
                        </table>
                        )}

                        {/* Actions */}
                        <div
                            style={{
                                marginTop: 12,
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderTop: "1px dashed var(--edge)",
                                paddingTop: 12,
                            }}
                        >
                            <button
                                type="button" onClick={handleBack}
                                className="btn btn-ghost"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    textDecoration: "none",
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: "#0f4c81",
                                    padding: "12px 16px",
                                    borderRadius: 9999,
                                    border: "1px solid var(--edge)",
                                    background: "#fff",
                                    boxShadow: "var(--shadow)",
                                }}
                                title="Back to dashboard"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                                </svg>
                                <span>Go Back</span>
                            </button>

                            {(() => {
                                const noChanges =
                                    name === (profile.username ?? "") &&
                                    // email unchanged (not editable in UI)
                                    !avatarFile;

                                const isDisabled = avatarBusy || noChanges;

                                return (
                                    <span
                                        title={isDisabled ? "You haven't made any changes" : "Save your changes"}
                                        style={{ display: "inline-flex" }}
                                    >
                    {viewingSelf && (
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={saveProfile}
                        disabled={isDisabled}
                        aria-disabled={isDisabled}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            textDecoration: "none",
                            fontSize: 15,
                            fontWeight: 800,
                            color: isDisabled ? "#9aa3af" : "#0f4c81",
                            padding: "12px 16px",
                            borderRadius: 9999,
                            border: `1px solid ${isDisabled ? "#e5e7eb" : "var(--edge)"}`,
                            background: isDisabled ? "#fafafa" : "#fff",
                            boxShadow: isDisabled ? "none" : "var(--shadow)",
                            cursor: isDisabled ? "not-allowed" : "pointer",
                            pointerEvents: isDisabled ? "none" : "auto", // ok to keep; wrapper handles the tooltip
                            minWidth: 148,
                            justifyContent: "center",
                        }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                      </svg>
                      <span>Save changes</span>
                    </button>)}
                  </span>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
            {events.length > 0 && (
                <>
                <h2 style={{ margin: "26px 0 10px" }}>
                    {profileRole === 'organizer' ? "Upcoming Published Events" : "Upcoming Registered Events"} ({events.length})
                </h2>
                <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "20px",
                    marginTop: "16px",
                    padding: "8px",
                }}
                >
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        role="guest"
                        me={{ id: user?.id, username: user?.username }}
                        isRegistered={false}
                        secondaryText="View details"
                    />
                ))}
                </div>
                </>
            )}
        </main>
    );
}