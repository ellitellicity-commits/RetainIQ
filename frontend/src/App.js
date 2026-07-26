import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Customers from "./pages/Customers";
import Contacts from "./pages/Contacts";
import Alerts from "./pages/Alerts";
import Journey from "./pages/Journey";
import Quotes from "./pages/Quotes";
import CopilotPage from "./pages/CopilotPage";
import Tasks from "./pages/Tasks";
import EmailSequences from "./pages/EmailSequences";
import Automations from "./pages/Automations";
import CommandPalette from "./components/CommandPalette";
import NotificationCenter from "./components/NotificationCenter";
import ChatWidget from "./components/ChatWidget";
import PageTransition from "./components/PageTransition";
import useBreakpoint from "./hooks/useBreakpoint";
import "./App.css";

const API =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "https://retainiq-thunderhacks-2026.onrender.com";

const ICONS = {
  dashboard: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>),
  customers: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.8 19c0-2.9 2.3-5 5.2-5s5.2 2.1 5.2 5"/><path d="M16.5 5.5a3 3 0 0 1 0 5.4"/><path d="M18.5 19c0-2.2-.9-3.9-2.3-4.8"/></svg>),
  contacts: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="2.6"/><path d="M8 17c0-2 1.8-3.2 4-3.2s4 1.2 4 3.2"/></svg>),
  journey: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>),
  quotes: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4a1 1 0 0 0 1 1h4"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5"/><line x1="8.5" y1="16" x2="13" y2="16"/></svg>),
  alerts: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V11M12 21V4M19 21v-6"/></svg>),
  copilot: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9 9l-7 1 5 5-1.5 7L12 18.5l6.5 3.5L17 15l5-5-7-1z"/></svg>),
  tasks: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>),
  sequences: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
  automations: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>),
};

const SUN = (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>);
const MOON = (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>);

export default function App() {
  const { isMobile } = useBreakpoint();
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => {
    try { return localStorage.getItem("riq_auth_token"); } catch (e) { return null; }
  });
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [uploaded, setUploaded] = useState(true);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("riq_sidebar_collapsed") === "1"; } catch (e) { return false; }
  });
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("riq_theme") || document.body.dataset.theme || "dark"; } catch (e) { return "dark"; }
  });
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [pageAction, setPageAction] = useState(null);
  const [openDealId, setOpenDealId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!authToken) { setAuthChecked(true); return; }
    let cancelled = false;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setAuthUser(data.user); })
      .catch(() => {
        if (cancelled) return;
        try { localStorage.removeItem("riq_auth_token"); } catch (e) {}
        setAuthToken(null);
      })
      .finally(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, [authToken]);

  const handleAuthenticated = (user, token) => {
    try { localStorage.setItem("riq_auth_token", token); } catch (e) {}
    setAuthToken(token);
    setAuthUser(user);
  };

  const handleLogout = () => {
    try { localStorage.removeItem("riq_auth_token"); } catch (e) {}
    setAuthToken(null);
    setAuthUser(null);
  };

  useEffect(() => { if (!isMobile) setMobileNavOpen(false); }, [isMobile]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const handler = (e) => { if (e.key === "Escape") setMobileNavOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileNavOpen]);

  const openDealInPipeline = (dealId) => { setPage("journey"); setOpenDealId(dealId); };

  const handleCmdNavigate = (target) => {
    if (typeof target === "string") {
      setPage(target);
      return;
    }
    if (target && target.action) {
      switch (target.action) {
        case "new-deal":
          setPage("journey");
          setPageAction("new-deal");
          break;
        case "new-task":
          setPage("tasks");
          setPageAction("new-task");
          break;
        case "new-note":
          setPage("customers");
          setPageAction("new-note");
          break;
        case "copilot":
          setPage("copilot");
          break;
        case "search-deals":
          setPage("journey");
          break;
        case "search-contacts":
          setPage("contacts");
          break;
        default:
          break;
      }
    }
  };

  useEffect(() => {
    document.body.dataset.theme = theme;
    try { localStorage.setItem("riq_theme", theme); } catch (e) {}
  }, [theme]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdKOpen(o => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("riq_sidebar_collapsed", next ? "1" : "0"); } catch (e) {}
      return next;
    });
  };
  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  const mainTabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "customers", label: "Clients" },
    { id: "contacts",  label: "Contacts" },
    { id: "journey",   label: "Pipeline" },
    { id: "quotes",    label: "Quotes" },
    { id: "alerts",    label: "Analytics" },
  ];

  const aiTabs = [
    { id: "copilot",     label: "AI Co-pilot" },
    { id: "tasks",       label: "Tasks" },
    { id: "sequences",   label: "Sequences" },
    { id: "automations", label: "Automations" },
  ];

  if (!authChecked) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  }
  if (!authUser) {
    return <Login API={API} onAuthenticated={handleAuthenticated} />;
  }

  if (!uploaded) return <Upload API={API} onUpload={() => setUploaded(true)} onSkip={() => setUploaded(true)} onCancel={() => setUploaded(true)} />;

  const SIDEBAR_W = collapsed ? 66 : 222;
  const ghostBtn = {
    display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start",
    width: "100%", padding: collapsed ? "10px 0" : "10px 12px", borderRadius: 9,
    border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)",
    fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 8,
  };

  const renderTab = (tab, active, { forceExpanded = false, onAfterSelect } = {}) => {
    const expanded = forceExpanded || !collapsed;
    return (
      <button key={tab.id} onClick={() => { setPage(tab.id); if (onAfterSelect) onAfterSelect(); }}
        title={expanded ? "" : tab.label} aria-label={tab.label}
        style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: expanded ? "flex-start" : "center",
          padding: expanded ? "10px 12px" : "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
          background: active ? "var(--cyan-dim)" : "transparent",
          color: active ? "var(--brand-bright)" : "var(--text2)", fontFamily: "Inter", fontSize: 14.5, fontWeight: 500,
          whiteSpace: "nowrap", width: "100%", textAlign: "left", transition: "background .12s" }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--hover2)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ display: "flex", flex: "0 0 auto" }}>{ICONS[tab.id]}</span>
        {expanded && tab.label}
      </button>
    );
  };

  const sidebarFooter = (afterClick) => (
    <>
      <button onClick={() => { setCmdKOpen(true); if (afterClick) afterClick(); }} title={collapsed && !afterClick ? "Search (Ctrl+K)" : ""}
        style={{ ...ghostBtn, marginTop: 0, border: "1px solid var(--border2)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <span style={{ display: "flex", flex: "0 0 auto" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        {(afterClick || !collapsed) && <span style={{ flex: 1, textAlign: "left" }}>Search</span>}
        {(afterClick || !collapsed) && <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>Ctrl+K</span>}
      </button>

      <button onClick={toggleTheme} title={collapsed && !afterClick ? (theme === "dark" ? "Light mode" : "Dark mode") : ""} aria-label="Toggle theme"
        style={ghostBtn}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <span style={{ display: "flex", flex: "0 0 auto" }}>{theme === "dark" ? SUN : MOON}</span>
        {(afterClick || !collapsed) && (theme === "dark" ? "Light mode" : "Dark mode")}
      </button>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setUploaded(false); if (afterClick) afterClick(); }}
        title={collapsed && !afterClick ? "Change data" : ""} aria-label="Change data"
        style={ghostBtn}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <span style={{ display: "flex", flex: "0 0 auto" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"/><polyline points="7 9 12 4 17 9"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>
        </span>
        {(afterClick || !collapsed) && "Change data"}
      </motion.button>

      <button onClick={() => { handleLogout(); if (afterClick) afterClick(); }} title={collapsed && !afterClick ? "Log out" : ""} aria-label="Log out"
        style={ghostBtn}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <span style={{ display: "flex", flex: "0 0 auto" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </span>
        {(afterClick || !collapsed) && "Log out"}
      </button>
    </>
  );

  const sidebarBrand = (size = 32) => (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: size, height: size, flex: "0 0 auto", borderRadius: 9, background: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={size / 2} height={size / 2} viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--logo-text)" }}>RetainIQ</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100dvh", overflow: "hidden", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter" }}>
      {isMobile ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--sidebar)", flex: "0 0 auto" }}>
            <button onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"
              style={{ background: "transparent", border: "none", color: "var(--text2)", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", lineHeight: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            {sidebarBrand(28)}
          </div>

          {mobileNavOpen && (
            <>
              <div onClick={() => setMobileNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998 }} />
              <aside style={{ position: "fixed", top: 0, left: 0, height: "100dvh", width: 262, maxWidth: "84vw", background: "var(--sidebar)", borderRight: "1px solid var(--border)", zIndex: 9999, padding: "16px 14px", display: "flex", flexDirection: "column", boxShadow: "8px 0 30px rgba(0,0,0,0.5)", boxSizing: "border-box", overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                  {sidebarBrand(32)}
                  <button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"
                    style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", lineHeight: 0, flex: "0 0 auto" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover2)"; e.currentTarget.style.color = "var(--text2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {mainTabs.map(tab => renderTab(tab, page === tab.id, { forceExpanded: true, onAfterSelect: () => setMobileNavOpen(false) }))}
                </nav>

                <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

                <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {aiTabs.map(tab => renderTab(tab, page === tab.id, { forceExpanded: true, onAfterSelect: () => setMobileNavOpen(false) }))}
                </nav>

                <div style={{ flex: 1 }} />

                {sidebarFooter(() => setMobileNavOpen(false))}
              </aside>
            </>
          )}
        </>
      ) : (
        <aside style={{ width: SIDEBAR_W, flex: "0 0 auto", background: "var(--sidebar)", borderRight: "1px solid var(--border)", padding: collapsed ? "16px 9px" : "16px 14px", transition: "width .22s ease, padding .22s ease", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", marginBottom: 22 }}>
            {!collapsed && sidebarBrand(32)}
            <button onClick={toggleSidebar} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", lineHeight: 0, flex: "0 0 auto" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover2)"; e.currentTarget.style.color = "var(--text2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
              {collapsed ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><polyline points="13 9 15 12 13 15"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><polyline points="15 9 13 12 15 15"/></svg>
              )}
            </button>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {mainTabs.map(tab => renderTab(tab, page === tab.id))}
          </nav>

          {!collapsed && <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />}
          {collapsed && <div style={{ height: 1, background: "var(--border)", margin: "14px 4px" }} />}

          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {aiTabs.map(tab => renderTab(tab, page === tab.id))}
          </nav>

          <div style={{ flex: 1 }} />

          {sidebarFooter()}
        </aside>
      )}

      <main style={{ flex: 1, minWidth: 0, height: "100%", overflowY: "auto", padding: isMobile ? "16px 16px 28px" : "28px 34px", position: "relative", paddingTop: isMobile ? 4 : 16 }}>
        <div style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, zIndex: 10, paddingBottom: 8 }}>
          <NotificationCenter API={API} />
        </div>

        <PageTransition pageKey={page}>
          {page === "dashboard" && <Dashboard API={API} />}
          {page === "customers" && <Customers API={API} pageAction={pageAction} clearAction={() => setPageAction(null)} />}
          {page === "contacts"  && <Contacts API={API} />}
          {page === "journey"   && <Journey API={API} pageAction={pageAction} clearAction={() => setPageAction(null)} openDealId={openDealId} clearOpenDeal={() => setOpenDealId(null)} />}
          {page === "quotes"    && <Quotes API={API} onOpenDeal={openDealInPipeline} />}
          {page === "alerts"    && <Alerts API={API} />}
          {page === "copilot"   && <CopilotPage API={API} onOpenDeal={openDealInPipeline} />}
          {page === "tasks"     && <Tasks pageAction={pageAction} clearAction={() => setPageAction(null)} />}
          {page === "sequences" && <EmailSequences />}
          {page === "automations" && <Automations />}
        </PageTransition>
      </main>

      <CommandPalette open={cmdKOpen} onClose={() => setCmdKOpen(false)} onNavigate={handleCmdNavigate} />
      <ChatWidget API={API} />
    </div>
  );
}
