import { useState, useEffect } from "react";

export const BREAKPOINTS = { mobile: 640, tablet: 1024 };

function computeBreakpoint(width) {
  if (width <= BREAKPOINTS.mobile) return "mobile";
  if (width <= BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

export default function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() =>
    computeBreakpoint(typeof window !== "undefined" ? window.innerWidth : BREAKPOINTS.tablet + 1)
  );

  useEffect(() => {
    const handler = () => setBreakpoint(computeBreakpoint(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    isCompact: breakpoint !== "desktop",
  };
}
