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

// The product's own recurring "pulsing live-status dot" motif (see the
// header's live-pill), reused here as the login page's one distinctive
// touch instead of introducing an unrelated illustration.
function SignalMoment() {
  const pathRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    gsap.to(path, { strokeDashoffset: 0, duration: 1.6, ease: "power2.out", delay: 0.35 });
  }, []);

  return (
    <svg width="100%" height="140" viewBox="0 0 320 140" fill="none" style={{ overflow: "visible" }} aria-hidden="true">
      <line x1="0" y1="104" x2="320" y2="104" stroke="var(--border)" strokeWidth="1" />
      <path
        ref={pathRef}
        d="M4 60 C 60 60, 80 118, 130 118 S 210 30, 260 30 S 300 46, 316 44"
        stroke="var(--brand-bright)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="316" cy="44" r="5" fill="var(--brand-bright)" style={{ animation: "pulse-dot 2s infinite" }} />
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

  const btnRef = useRef(null);
  const btnLabelRef = useRef(null);
  const btnSpinnerRef = useRef(null);

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
    if (!canSubmit || submitting) return;

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
      setSubmitting(false);
      setButtonLoading(false);
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

            <SignalMoment />
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
              disabled={submitting}
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
              Password reset isn't available yet — contact your account admin.
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "var(--text3)" }}>
            RetainIQ · Digital Move IT & Telecom
          </div>
        </div>
      </div>
    </div>
  );
}
