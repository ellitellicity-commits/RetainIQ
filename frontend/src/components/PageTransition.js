import React, { useEffect, useRef } from "react";
import gsap from "gsap";

// Fades/slides the active page in on route change instead of the hard cut
// switching `page` state used to produce. Each page's own internal animations
// (stat card fade-ups, etc.) are untouched -- this just wraps whichever page
// is currently mounted.
export default function PageTransition({ pageKey, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  return <div ref={ref}>{children}</div>;
}
