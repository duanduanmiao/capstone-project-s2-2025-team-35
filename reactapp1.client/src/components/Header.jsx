import { useEffect, useState, useRef} from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/config.js";
import logo from "../assets/img/logo.png";
import defaultAvatar from "../assets/img/profile.jpg";
import { getAvatarUrl } from "../utils/avatars.js";

export default function Header() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState("");

    function buildAvatarUrl(u) {
        if (!u) return "";
        if (u.startsWith("blob:")) return "";                     // never keep blob: after reload
        if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
        try {
            // Use WHATWG URL to resolve relative -> correct origin (no accidental “/api” in the middle)
            return new URL(u, API_BASE_URL).toString();
        } catch {
            return "";
        }
    }


    async function refreshMe() {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
                credentials: "include", // <-- send cookie
            });
            if (res.ok) {
                const me = await res.json(); // { id, name, email, role }
                setUser({
                    id: me.id,
                    name: me.name,
                    email: me.email,
                    role: (me.role ?? "").toString(),
                    ProfilePictureUrl: me.ProfilePictureUrl,
                });
                // 🔑 返回用户ID，供后续使用
                return me.id;
            } else {
                setUser(null);
                return null;
            }
        } catch {
            setUser(null);
            return null;
        }
    }

    async function loadProfile(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/profile/${id}`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (!res.ok) return;
            const data = await res.json();
            setProfile(data);
            setAvatarUrl(buildAvatarUrl(data.profilePictureUrl ?? ""));
        } catch {}
    }



    useEffect(() => {
        refreshMe();

        // After Google popup posts success, refresh from cookie session
        const onMsg = (e) => {
            if (e?.data?.type === "GOOGLE_AUTH_SUCCESS") {
                refreshMe();
            } else if (e?.data?.type === "GOOGLE_AUTH_ERROR") {
                // 登录失败时，不刷新用户状态，保持当前状态
                // 这样如果用户之前已登录，不会因为新的登录失败而影响显示
                console.log('Google auth error received in Header:', e.data);
            }
        };
        window.addEventListener("message", onMsg);

        // 🔑 新增：监听用户信息更新事件
        const onProfileUpdate = async () => {
            console.log('Profile update event received, refreshing user data...');
            const userId = await refreshMe();
            // 🔑 刷新用户信息后，再刷新头像
            if (userId) {
                await loadProfile(userId);
            }
        };
        window.addEventListener("userProfileUpdated", onProfileUpdate);

        return () => {
            window.removeEventListener("message", onMsg);
            window.removeEventListener("userProfileUpdated", onProfileUpdate);
        };
    }, []);

      useEffect(() => {
            if (user?.id) loadProfile(user.id);
        }, [user?.id]); 

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }

        if (isMenuOpen) {
            // Use both mousedown and click for better coverage
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch {}
        setUser(null);
        setProfile(null);
        setIsMenuOpen(false);
        navigate("/login");
    };

    const handleNavigation = (path) => {
        setIsMenuOpen(false); // Close menu before navigation
        navigate(path);
    };

    const userId = user?.id;
    const dashHref = userId ? "/dashboard" : "/login";
    const profileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/login";
    const finalAvatar = avatarUrl || (user?.id ? getAvatarUrl(user.id) : "");

    return (
        <header className="header">
            <div className="container nav">
                <div className="logo">
                    <Link
                        to="/"
                        style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "inline-block"
                        }}
                    >
                    < img src={logo} alt="logo" />
                    </Link>
                </div>

                <nav className="navlinks" style={{ display: "flex", gap: 8 }}>
                    <Link to="/">Home</Link>
                    <Link to="/events">Events</Link>
                    {user && user.role && (user.role.toLowerCase() === "organizer") ? (
                        <Link to="/manage">Manage</Link>
                    ) : (
                        <Link to={dashHref}>Dashboard</Link>
                    )}
                </nav>

                <div className="spacer" />
                {!user && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginLeft: "auto"}}>
                        <Link to="/login" className="btn btn-ghost">Login</Link>
                    </div>
                )}
                {user && (
                    <div className="user-info" style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "12px",
                        marginRight: "12px"
                    }}>
                        <span className="username-display" style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#2851aaff",
                            whiteSpace: "nowrap"
                        }}>
                            {"Welcome, " + user.name || user.email}
                        </span>
                    </div>
                )}
            {user && (
                <label className="popup" aria-label="Header quick menu" ref={menuRef}>
                    <input 
                        type="checkbox" 
                        checked={isMenuOpen}
                        onChange={(e) => setIsMenuOpen(e.target.checked)}
                    />
                    <div tabIndex={0} className="burger" role="button" aria-haspopup="menu" aria-expanded={isMenuOpen}>
                            <img
                            src={finalAvatar || defaultAvatar}
                            alt={user.name ? `${user.name}'s avatar` : "User avatar"}
                            className="burger-avatar"
                            onError={(e) => { e.currentTarget.src = defaultAvatar; }}
                            style={{
                                borderRadius: "50%",
                                objectFit: "cover",
                                display: "block",
                            }}
                            />
                    </div>

                    <nav className="popup-window" role="menu">
                        <legend>Quick Start</legend>
                            {user && (
                                    <>
                                        <ul>
                                        <li>
                                            <button onClick={() => handleNavigation(profileHref)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="1" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2.598 9h-1.055c1.482-4.638 5.83-8 10.957-8 6.347 0 11.5 5.153 11.5 11.5s-5.153 11.5-11.5 11.5c-5.127 0-9.475-3.362-10.957-8h1.055c1.443 4.076 5.334 7 9.902 7 5.795 0 10.5-4.705 10.5-10.5s-4.705-10.5-10.5-10.5c-4.568 0-8.459 2.923-9.902 7zm12.228 3l-4.604-3.747.666-.753 6.112 5-6.101 5-.679-.737 4.608-3.763h-14.828v-1h14.826z"/>
                                                </svg>
                                                <span>Profile</span>
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={handleLogout}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="1" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.598 9h-1.055c1.482-4.638 5.83-8 10.957-8 6.347 0 11.5 5.153 11.5 11.5s-5.153 11.5-11.5 11.5c-5.127 0-9.475-3.362-10.957-8h1.055c1.443 4.076 5.334 7 9.902 7 5.795 0 10.5-4.705 10.5-10.5s-4.705-10.5-10.5-10.5c-4.568 0-8.459 2.923-9.902 7zm12.228 3l-4.604-3.747.666-.753 6.112 5-6.101 5-.679-.737 4.608-3.763h-14.828v-1h14.826z"/>
                                            </svg>
                                            <span>Logout</span>
                                            </button>
                                        </li>
                                        </ul>
                                    </>
                                )}
                    </nav>
                </label>
            )}
            </div>
        </header>
    );
}