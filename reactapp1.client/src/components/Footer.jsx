// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/img/logo.png";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container container--lg footer-inner">
        {/* Brand / Intro */}
        <div className="footer-col">
          <Link to="/" className="footer-brand" aria-label="Go to homepage">
            {/* ✅ 用自家 logo 替换文本 CEMS */}
            <img src={logo} alt="Site logo" className="footer-logo-img" />
          </Link>
          <p className="footer-desc">
            Discover campus events across technology, arts, wellness, sports, and academics.
            One place to browse and register fast.
          </p>
          <Link to="/events" className="footer-cta">Get started</Link>
        </div>

        {/* Quick Links */}
        <nav className="footer-col" aria-label="Quick links">
          <h3 className="footer-title">Quick links</h3>
          <ul className="footer-list">
            <li><Link to="/events">Browse events</Link></li>
            <li><Link to="/events?category=Technology">Technology</Link></li>
            <li><Link to="/events?category=Creative">Creative</Link></li>
            <li><Link to="/events?category=Sports">Sports</Link></li>
            <li><Link to="/events?category=Wellness">Wellness</Link></li>
            <li><Link to="/events?category=Academic">Academic</Link></li>
          </ul>
        </nav>

        {/* Help / Policy */}
        <nav className="footer-col" aria-label="Help">
          <h3 className="footer-title">Help</h3>
          <ul className="footer-list">
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/support">Support</Link></li>
            <li><Link to="/policies">Policies</Link></li>
          </ul>
        </nav>

        {/* Contact + Social */}
        <div className="footer-col">
          <h3 className="footer-title">Contact</h3>
          <ul className="footer-list">
            <li><a href="mailto:events@example.edu">sjin911@aucklanduni.ac.nz</a></li>
            <li><a href="mailto:events@example.edu">xtan251@aucklanduni.ac.nz</a></li>
            <li><a href="mailto:events@example.edu">axu747@aucklanduni.ac.nz</a></li>
            <li><a href="mailto:events@example.edu">ztan808@aucklanduni.ac.nz</a></li>
            <li><a href="mailto:events@example.edu">ywu338@aucklanduni.ac.nz</a></li>
            <li><a href="mailto:events@example.edu">ycha624@aucklanduni.ac.nz</a></li>
          </ul>

          {/* 只用图标（你之前版本的 SVG 图标已保留） */}
          <div className="footer-social" aria-label="Social links">
            <a href="#" aria-label="Instagram" className="soc" title="Instagram">
              <IconInstagram /><span className="sr-only">Instagram</span>
            </a>
            <a href="#" aria-label="YouTube" className="soc" title="YouTube">
              <IconYouTube /><span className="sr-only">YouTube</span>
            </a>
            <a href="#" aria-label="Facebook" className="soc" title="Facebook">
              <IconFacebook /><span className="sr-only">Facebook</span>
            </a>
          </div>
        </div>
      </div>

      {/* ✅ 底部元信息区——文案居中 */}
      <div className="footer-meta">
        <div className="container container--lg footer-meta-inner">
          <div className="footer-meta-center">
            <p className="made-by">
                Made by <strong className="made-by__name"> Team 35 — Six God</strong> © {year} Campus Event Management System. All rights reserved.
            </p>
          </div>
          {/* <button
            className="back-to-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            title="Back to top"
          >
            ↑
          </button> */}
        </div>
      </div>
    </footer>
  );
}

/* ====== Icons（保持不变） ====== */
function IconInstagram(props){return(<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}><rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/></svg>);}
function IconYouTube(props){return(<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}><path d="M22 12s0-3.2-.4-4.6a3 3 0 0 0-2.1-2.1C17.1 5 12 5 12 5s-5.1 0-7.5.3A3 3 0 0 0 2.4 7.4C2 8.8 2 12 2 12s0 3.2.4 4.6a3 3 0 0 0 2.1 2.1C6.9 19 12 19 12 19s5.1 0 7.5-.3a3 3 0 0 0 2.1-2.1c.4-1.4.4-4.6.4-4.6Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor"/></svg>);}
function IconFacebook(props){return(<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}><path d="M14.5 8.5H16V6h-1.5c-2 0-3.5 1.4-3.5 3.6V12H9v2.2h2v5.3h2.5v-5.3h2L16 12h-2v-1.8c0-.7.2-1.7 1.5-1.7Z" fill="currentColor"/><rect x="3" y="3" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>);}
