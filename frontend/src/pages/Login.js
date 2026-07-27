import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import useBreakpoint from "../hooks/useBreakpoint";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.9 17.9A10.6 10.6 0 0 1 12 19.5C5 19.5 1.5 12 1.5 12a18.6 18.6 0 0 1 4.6-5.6M9.9 5.2A9.7 9.7 0 0 1 12 5c7 0 10.5 7 10.5 7a18.5 18.5 0 0 1-2.3 3.4" />
    <path d="M9.9 14.1A3 3 0 0 0 14 10" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// A small relationship graph -- one account node connected to stakeholders
// of varying tie strength -- standing in for what the product actually
// does (tracking and scoring account relationships), rather than a
// decorative illustration. Lines draw in, then nodes settle into place,
// then the strongest ties pick up the app's recurring pulsing-dot motif
// (see the header's live-pill) to read as "live" relationships.
const RELATIONSHIP_NODES = [
  { x: 186, y: 32, r: 6, strength: "strong" },
  { x: 214, y: 96, r: 6, strength: "strong" },
  { x: 272, y: 52, r: 4.5, strength: "medium" },
  { x: 290, y: 112, r: 4, strength: "light" },
];
const HUB = { x: 68, y: 70 };

function RelationshipMoment() {
  const lineRefs = useRef([]);
  const nodeRefs = useRef([]);
  const hubRef = useRef(null);

  useEffect(() => {
    const lines = lineRefs.current.filter(Boolean);
    const nodes = nodeRefs.current.filter(Boolean);
    const hub = hubRef.current;
    if (!hub || lines.length === 0 || nodes.length === 0) return undefined;

    const targetR = nodes.map((node) => Number(node.getAttribute("r")));
    const targetLineOpacity = RELATIONSHIP_NODES.map((n) => (n.strength === "light" ? 0.55 : 1));
    gsap.set(nodes, { attr: { r: 0 } });
    gsap.set(hub, { attr: { r: 0 } });
    gsap.set(lines, { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.3 });
    tl.to(hub, { attr: { r: 9 }, duration: 0.4, ease: "back.out(2)" });
    lines.forEach((line, i) => {
      tl.to(line, { opacity: targetLineOpacity[i], duration: 0.35, ease: "power1.out" }, i === 0 ? "-=0.1" : "-=0.2");
    });
    nodes.forEach((node, i) => {
      tl.to(node, { attr: { r: targetR[i] }, duration: 0.4, ease: "back.out(2.2)" }, i === 0 ? "-=0.15" : "-=0.25");
    });

    return () => tl.kill();
  }, []);

  return (
    <svg width="100%" height="140" viewBox="0 0 320 140" fill="none" style={{ overflow: "visible" }} aria-hidden="true">
      {RELATIONSHIP_NODES.map((n, i) => (
        <line
          key={`line-${i}`}
          ref={(el) => (lineRefs.current[i] = el)}
          x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y}
          stroke="var(--brand-bright)"
          strokeWidth={n.strength === "strong" ? 2.25 : n.strength === "medium" ? 1.5 : 1}
          strokeLinecap="round"
          opacity={n.strength === "light" ? 0.55 : 1}
        />
      ))}
      <circle ref={hubRef} cx={HUB.x} cy={HUB.y} r="9" fill="var(--card)" stroke="var(--brand-bright)" strokeWidth="2" />
      {RELATIONSHIP_NODES.map((n, i) => (
        <circle
          key={`node-${i}`}
          ref={(el) => (nodeRefs.current[i] = el)}
          cx={n.x} cy={n.y} r={n.r}
          fill={n.strength === "light" ? "var(--card)" : "var(--brand-bright)"}
          stroke="var(--brand-bright)"
          strokeWidth={n.strength === "light" ? 1.5 : 0}
          style={n.strength === "strong" ? { animation: "pulse-dot 2.4s infinite", transformBox: "fill-box", transformOrigin: "center" } : undefined}
        />
      ))}
    </svg>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <div role="alert" style={{ color: "var(--danger-soft)", fontFamily: "var(--font-body)", fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
      {children}
    </div>
  );
}

const labelStyle = {
  fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, color: "var(--text3)",
  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block",
};

function fieldStyle(hasError) {
  return {
    width: "100%", background: "var(--bg)", border: `1px solid ${hasError ? "var(--danger-soft)" : "var(--border2)"}`,
    borderRadius: 8, padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: 14,
    color: "var(--text)", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s ease",
  };
}

export default function Login({ API, onAuthenticated }) {
  const { isDesktop, isTablet } = useBreakpoint();
  const showIllustration = isDesktop || isTablet;

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);
  const [guestModeEnabled, setGuestModeEnabled] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");

  const btnRef = useRef(null);
  const btnLabelRef = useRef(null);
  const btnSpinnerRef = useRef(null);
  // A ref, not just the `submitting` state, so a second click that lands
  // before React commits the state update still sees the lock -- state
  // alone isn't synchronous enough to stop a fast double-click.
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // A single failed attempt used to hide Guest Mode for the rest of the
    // session with no way to recover short of a full reload -- exactly what
    // a cold-started backend (a free-tier host can take 30-60s to wake up)
    // or a flaky mobile connection triggers on first load. Keep retrying on
    // a fixed interval for up to a minute, long enough to ride out a real
    // cold start, rather than giving up after a couple of quick attempts.
    const MAX_ATTEMPTS = 15;
    const RETRY_INTERVAL_MS = 4000;
    const loadConfig = (attempt = 0) => {
      fetch(`${API}/api/auth/config`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => { if (!cancelled) setGuestModeEnabled(!!data.guestModeEnabled); })
        .catch(() => {
          if (cancelled || attempt >= MAX_ATTEMPTS) return;
          setTimeout(() => loadConfig(attempt + 1), RETRY_INTERVAL_MS);
        });
    };
    loadConfig();
    return () => { cancelled = true; };
  }, [API]);

  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const emailError = touched.email && !email ? "Email is required"
    : touched.email && !EMAIL_RE.test(email) ? "Enter a valid email address" : "";
  const passwordError = touched.password && !password ? "Password is required"
    : touched.password && password.length < 8 ? "Must be at least 8 characters" : "";
  const confirmError = mode === "signup" && touched.confirmPassword && confirmPassword !== password
    ? "Passwords don't match" : "";

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = password.length >= 8;
  const canSubmit = emailValid && passwordValid && (mode === "login" || confirmPassword === password);

  const setButtonLoading = (loading) => {
    if (!btnRef.current) return;
    const tl = gsap.timeline();
    if (loading) {
      tl.to(btnLabelRef.current, { opacity: 0, y: -8, duration: 0.16, ease: "power1.in" })
        .set(btnLabelRef.current, { visibility: "hidden" })
        .set(btnSpinnerRef.current, { visibility: "visible" })
        .fromTo(btnSpinnerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.18, ease: "power1.out" });
    } else {
      tl.to(btnSpinnerRef.current, { opacity: 0, y: -8, duration: 0.14, ease: "power1.in" })
        .set(btnSpinnerRef.current, { visibility: "hidden" })
        .set(btnLabelRef.current, { visibility: "visible" })
        .fromTo(btnLabelRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.18, ease: "power1.out" });
    }
  };

  const shakeButton = () => {
    if (!btnRef.current) return;
    gsap.fromTo(
      btnRef.current,
      { x: -5 },
      { x: 0, duration: 0.32, ease: "power2.out", clearProps: "x", repeat: 3, yoyo: true, repeatRefresh: false }
    );
  };

  const switchMode = (next) => {
    setMode(next);
    setFormError("");
    setTouched({});
    setConfirmPassword("");
    setShowForgotNote(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });
    setFormError("");
    if (!canSubmit || inFlightRef.current) return;

    inFlightRef.current = true;
    setSubmitting(true);
    setButtonLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || "Something went wrong. Please try again.");
        shakeButton();
        return;
      }
      onAuthenticated(data.user, data.token);
    } catch (err) {
      setFormError("Can't reach the server. Check your connection and try again.");
      shakeButton();
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
      setButtonLoading(false);
    }
  };

  const guestInFlightRef = useRef(false);
  const handleGuestLogin = async () => {
    if (guestInFlightRef.current) return;
    guestInFlightRef.current = true;
    setGuestLoading(true);
    setGuestError("");
    try {
      const res = await fetch(`${API}/api/auth/guest`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuestError(data.error || "Guest mode isn't available right now.");
        return;
      }
      onAuthenticated(data.user, data.token);
    } catch (err) {
      setGuestError("Can't reach the server. Check your connection and try again.");
    } finally {
      guestInFlightRef.current = false;
      setGuestLoading(false);
    }
  };

  const heading = mode === "login" ? "Welcome back" : "Create your account";
  const subheading = mode === "login"
    ? "Sign in to keep tracking renewals before they slip."
    : "Start tracking renewals before they slip.";

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "24px", boxSizing: "border-box", fontFamily: "var(--font-body)",
    }}>
      <div style={{
        display: "flex", width: "100%", maxWidth: 920, minHeight: showIllustration ? 560 : "auto",
        borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow)",
        background: "var(--card)",
      }}>
        {showIllustration && (
          <div style={{
            flex: "0 0 42%", background: "var(--sidebar)", padding: "44px 40px",
            display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box",
            borderRight: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 40 }}>
              <div style={{ width: 32, height: 32, flex: "0 0 auto", borderRadius: 9, background: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--logo-text)" }}>RetainIQ</div>
            </div>

            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, lineHeight: 1.15, marginBottom: 12 }}>
              Every renewal,<br />seen coming.
            </div>
            <div style={{ color: "var(--text2)", fontSize: 13.5, lineHeight: 1.6, maxWidth: 260, marginBottom: 8 }}>
              RetainIQ scores churn risk in real time, so your team calls the account before it becomes a statistic.
            </div>

            <RelationshipMoment />
          </div>
        )}

        <div style={{ flex: "1 1 auto", padding: showIllustration ? "48px 48px" : "40px 28px", display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box" }}>
          {!showIllustration && (
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 32 }}>
              <div style={{ width: 30, height: 30, flex: "0 0 auto", borderRadius: 9, background: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>RetainIQ</div>
            </div>
          )}

          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, marginBottom: 6 }}>
            {heading}
          </div>
          <div style={{ color: "var(--text3)", fontSize: 13, marginBottom: 28 }}>
            {subheading}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle} htmlFor="riq-email">Email</label>
              <input
                id="riq-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => touch("email")}
                placeholder="you@company.com"
                aria-invalid={!!emailError}
                aria-describedby="riq-email-error"
                style={fieldStyle(!!emailError)}
              />
              <div id="riq-email-error"><FieldError>{emailError}</FieldError></div>
            </div>

            <div style={{ marginBottom: mode === "signup" ? 18 : 10 }}>
              <label style={labelStyle} htmlFor="riq-password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="riq-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => touch("password")}
                  placeholder="At least 8 characters"
                  aria-invalid={!!passwordError}
                  aria-describedby="riq-password-error"
                  style={{ ...fieldStyle(!!passwordError), paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", padding: 8, display: "flex", lineHeight: 0 }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <div id="riq-password-error"><FieldError>{passwordError}</FieldError></div>
            </div>

            {mode === "signup" && (
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle} htmlFor="riq-confirm">Confirm password</label>
                <input
                  id="riq-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => touch("confirmPassword")}
                  placeholder="Re-enter your password"
                  aria-invalid={!!confirmError}
                  aria-describedby="riq-confirm-error"
                  style={fieldStyle(!!confirmError)}
                />
                <div id="riq-confirm-error"><FieldError>{confirmError}</FieldError></div>
              </div>
            )}

            <FieldError>{formError}</FieldError>

            <button
              ref={btnRef}
              type="submit"
              disabled={submitting || guestLoading}
              aria-busy={submitting}
              style={{
                position: "relative", width: "100%", marginTop: 16, background: "var(--cyan)", border: "none",
                borderRadius: 9, padding: "13px", color: "#ffffff", fontFamily: "var(--font-body)", fontSize: 14,
                fontWeight: 600, cursor: submitting ? "default" : "pointer",
              }}
            >
              <span ref={btnLabelRef} style={{ display: "inline-block" }}>
                {mode === "login" ? "Sign in" : "Create account"}
              </span>
              <span ref={btnSpinnerRef} style={{ visibility: "hidden", opacity: 0, position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.35)", borderTop: "2px solid #ffffff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </span>
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
            {mode === "login" ? (
              <button type="button" onClick={() => setShowForgotNote((s) => !s)} style={{ background: "none", border: "none", padding: 0, color: "var(--text3)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>
                Forgot password?
              </button>
            ) : <span />}
            <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")} style={{ background: "none", border: "none", padding: 0, color: "var(--text3)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>
              {mode === "login" ? "Create account" : "Already have an account? Sign in"}
            </button>
          </div>

          {showForgotNote && (
            <div style={{ marginTop: 10, color: "var(--text3)", fontSize: 12, lineHeight: 1.5 }}>
              Password reset isn't available yet. Contact your account admin.
            </div>
          )}

          {guestModeEnabled && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 11, color: "var(--text3)" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={guestLoading || submitting}
                style={{
                  width: "100%", marginTop: 14, background: "transparent", border: "1px solid var(--border2)",
                  borderRadius: 9, padding: "10px", color: "var(--text3)", fontFamily: "var(--font-body)", fontSize: 13,
                  fontWeight: 500, cursor: guestLoading ? "default" : "pointer",
                }}
              >
                {guestLoading ? "Loading demo…" : "Continue as Guest"}
              </button>
              <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: "var(--text3)" }}>
                Browse a live demo, read-only, no account needed.
              </div>
              <FieldError>{guestError}</FieldError>
            </>
          )}

          <div style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "var(--text3)" }}>
            RetainIQ · Digital Move IT & Telecom
          </div>
        </div>
      </div>
    </div>
  );
}
