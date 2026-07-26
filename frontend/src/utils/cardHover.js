import gsap from "gsap";

// Shared hover lift + border glow for card-style containers. Attach as
// onMouseEnter/onMouseLeave; works on any element with a border already set
// (glows by brightening the border color rather than replacing box-shadow,
// so it composes with each card's existing shadow instead of fighting it).
export const cardHoverProps = {
  onMouseEnter: (e) => {
    gsap.to(e.currentTarget, { y: -3, borderColor: "var(--cyan)", duration: 0.22, ease: "power2.out" });
  },
  onMouseLeave: (e) => {
    gsap.to(e.currentTarget, { y: 0, borderColor: "var(--border2)", duration: 0.22, ease: "power2.out" });
  },
};
