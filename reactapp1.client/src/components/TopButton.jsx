import React, { useEffect, useState } from "react";

export default function BackToTopFancy({ threshold = 20 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setShow(y > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 2800,
        display: show ? "block" : "none",
      }}
    >
      <button className="top-button" onClick={scrollToTop} aria-label="Back to Top">
        <svg className="svgIcon" viewBox="0 0 384 512" role="img" aria-hidden="true">
          <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z" />
        </svg>
      </button>
    </div>
  );
}
