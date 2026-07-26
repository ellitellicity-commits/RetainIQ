import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Upload({ onUpload, onSkip, API, onCancel }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }
    setFile(f);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/api/db/import`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
      } else {
        onUpload();
      }
    } catch (e) {
      setError("Upload failed. Make sure the backend is running.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 16, padding: "30px 32px 26px", width: "100%", maxWidth: 470, position: "relative" }}>

        {onCancel && (
          <button onClick={onCancel} title="Cancel" aria-label="Cancel"
            style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
          <div style={{ width: 34, height: 34, flex: "0 0 auto", borderRadius: 9, background: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--logo-text)" }}>RetainIQ</div>
        </div>

        <div style={{ fontSize: 21, fontWeight: 600, color: "var(--text)", letterSpacing: -0.3 }}>Change data</div>
        <div style={{ fontSize: 13.5, color: "var(--text3)", marginTop: 6, lineHeight: 1.5 }}>Upload a new client list to refresh your dashboard.</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 10, marginBottom: 20, lineHeight: 1.5, background: "var(--hover)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 11px" }}>
          CSV columns: client_name, vendor, software, contract_start, contract_expiry, contract_value, last_contact, account_manager
        </div>

        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("csv-input").click()}
            style={{ border: "1.5px dashed " + (dragging ? "var(--cyan)" : "var(--border2)"), background: dragging ? "var(--cyan-dim)" : "transparent", borderRadius: 14, padding: "32px 20px", textAlign: "center", cursor: "pointer", transition: "border-color .15s, background .15s" }}>
            <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--brand-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"/><polyline points="7 9 12 4 17 9"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>
            <div style={{ fontSize: 14.5, color: "var(--text)", fontWeight: 500, marginTop: 10 }}>Drag &amp; drop your file here</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>or <span style={{ color: "var(--brand-bright)", fontWeight: 500 }}>browse</span> to choose · CSV file</div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 11, border: "1px solid var(--border2)", borderRadius: 11, padding: "11px 13px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/></svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{Math.max(1, Math.round(file.size / 1024))} KB · ready to import</div>
            </div>
            <button onClick={() => { setFile(null); setError(""); }} title="Remove" aria-label="Remove file"
              style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12.5, color: "var(--text3)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--amber)" aria-hidden="true"><path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2z"/></svg>
          Columns are auto-matched with AI — no manual mapping needed.
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ color: "#e06a6a", fontSize: 12.5, marginTop: 14, textAlign: "center" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 22 }}>
          <button onClick={onSkip}
            style={{ background: "transparent", color: "var(--text2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "11px 16px", fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            Use demo data
          </button>
          <motion.button whileHover={{ scale: file && !loading ? 1.02 : 1 }} whileTap={{ scale: file && !loading ? 0.98 : 1 }}
            onClick={handleUpload} disabled={!file || loading}
            style={{ background: "var(--cyan)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontFamily: "Inter", fontSize: 14, fontWeight: 600, cursor: !file || loading ? "default" : "pointer", opacity: !file || loading ? 0.4 : 1 }}>
            {loading ? "Importing…" : "Import data"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}