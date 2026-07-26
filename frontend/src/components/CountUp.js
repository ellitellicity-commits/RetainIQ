import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

// Animates a stat number counting up from 0 the first time a real value
// arrives (most callers fetch async, so `value` starts null/undefined and
// this waits for it) rather than rendering pre-filled and static.
export default function CountUp({ value, format = (v) => Math.round(v).toLocaleString(), duration = 1 }) {
  const [display, setDisplay] = useState(0);
  const tweenObj = useRef({ v: 0 });

  useEffect(() => {
    if (value == null || isNaN(value)) return;
    // Animates from wherever the tween currently sits (0 on first mount) up
    // to the latest value -- naturally re-runs only when value actually
    // changes (it's the effect dependency), and is safe under React 18
    // StrictMode's dev-only double-invoke (a killed tween just restarts).
    const tween = gsap.to(tweenObj.current, {
      v: value,
      duration,
      ease: "power2.out",
      onUpdate: () => setDisplay(tweenObj.current.v),
    });
    return () => tween.kill();
  }, [value, duration]);

  return format(display);
}
