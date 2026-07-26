import React, { useState } from "react";
import TaskList from "../components/TaskList";
import CountUp from "../components/CountUp";
import { liftHoverProps } from "../utils/cardHover";
import { TASKS } from "../data/mockData";
import useBreakpoint from "../hooks/useBreakpoint";

const STAT_ICONS = {
  total: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>),
  overdue: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  today: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  done: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
};

const REPS = ["Priya Sharma", "Marcus Reid", "Aisha Khan", "David Chen"];
const DEALS = ["RBC Bank", "TD Bank", "Bell Canada", "Sun Life Financial", "Loblaw Companies", "Telus Corporation", "Manulife", "Rogers Communications", "Scotiabank", "CIBC"];
const PRIORITIES = ["critical", "high", "medium", "low"];
const TYPES = ["follow-up", "call", "meeting", "document", "preparation", "research", "onboarding", "review"];

export default function Tasks({ pageAction, clearAction }) {
  const { isMobile, isTablet } = useBreakpoint();
  const [tasks, setTasks] = useState(TASKS);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", dueDate: "", assignee: REPS[0], linkedDeal: DEALS[0], priority: "medium", type: "follow-up" });

  React.useEffect(() => {
    if (pageAction === "new-task") {
      setShowForm(true);
      if (clearAction) clearAction();
    }
  }, [pageAction, clearAction]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDateOnly = (str) => {
    const d = new Date(str);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const overdue = tasks.filter(t => !t.completed && toDateOnly(t.dueDate) < today);
  const dueToday = tasks.filter(t => !t.completed && toDateOnly(t.dueDate).getTime() === today.getTime());
  const completed = tasks.filter(t => t.completed);

  const getEndOfWeek = () => {
    const end = new Date(today);
    end.setDate(end.getDate() + (7 - end.getDay()));
    return end;
  };

  const filtered = (() => {
    switch (filter) {
      case "my":
        return tasks.filter(t => t.assignee === "Priya Sharma");
      case "overdue":
        return tasks.filter(t => !t.completed && toDateOnly(t.dueDate) < today);
      case "week":
        return tasks.filter(t => !t.completed && toDateOnly(t.dueDate) >= today && toDateOnly(t.dueDate) <= getEndOfWeek());
      case "completed":
        return tasks.filter(t => t.completed);
      default:
        return tasks;
    }
  })();

  const handleToggle = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    const task = {
      id: Date.now(),
      title: newTask.title.trim(),
      dueDate: newTask.dueDate || new Date().toISOString().split("T")[0],
      assignee: newTask.assignee,
      linkedDeal: newTask.linkedDeal,
      priority: newTask.priority,
      type: newTask.type,
      completed: false,
    };
    setTasks(prev => [task, ...prev]);
    setNewTask({ title: "", dueDate: "", assignee: REPS[0], linkedDeal: DEALS[0], priority: "medium", type: "follow-up" });
    setShowForm(false);
  };

  const stats = [
    { label: "Total Tasks", value: tasks.length, color: "var(--cyan)", icon: STAT_ICONS.total },
    { label: "Overdue", value: overdue.length, color: "var(--red)", icon: STAT_ICONS.overdue, urgent: overdue.length > 0 },
    { label: "Due Today", value: dueToday.length, color: "var(--amber)", icon: STAT_ICONS.today },
    { label: "Completed", value: completed.length, color: "var(--green)", icon: STAT_ICONS.done },
  ];

  const filters = [
    ["all", "All"],
    ["my", "My Tasks"],
    ["overdue", "Overdue"],
    ["week", "Due This Week"],
    ["completed", "Completed"],
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>Tasks</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 18px", borderRadius: "var(--radius)", border: "none",
          background: "var(--cyan)", color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "Inter"
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.label} {...liftHoverProps} style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "var(--card)", border: "1px solid var(--border2)",
            borderLeft: "3px solid " + s.color, borderRadius: "var(--radius)",
            padding: "14px 18px",
            boxShadow: s.urgent ? `0 0 0 1px color-mix(in srgb, ${s.color} 35%, transparent), var(--shadow)` : "var(--shadow)",
          }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: `color-mix(in srgb, ${s.color} 14%, transparent)`, color: s.color }}>
              {s.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 3, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: s.color, letterSpacing: -0.3, lineHeight: 1 }}><CountUp value={s.value} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {filters.map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{
              padding: "7px 16px", borderRadius: 999,
              border: "1px solid " + (filter === id ? "var(--cyan)" : "var(--border)"),
              background: filter === id ? "var(--cyan-dim)" : "transparent",
              color: filter === id ? "var(--cyan)" : "var(--text2)",
              fontFamily: "Inter", fontSize: 13, fontWeight: 500, cursor: "pointer"
            }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--text3)", alignSelf: "center" }}>
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Task List */}
      <TaskList tasks={filtered} onToggle={handleToggle} />

      {/* Add Task Modal */}
      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 440, maxWidth: "92vw", maxHeight: "90dvh", overflowY: "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? 20 : 28, zIndex: 9999, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", boxSizing: "border-box" }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>New Task</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Task title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} autoFocus
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Due date</label>
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Assignee</label>
                  <select value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }}>
                    {REPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Linked deal</label>
                  <select value={newTask.linkedDeal} onChange={e => setNewTask({ ...newTask, linkedDeal: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }}>
                    {DEALS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Type</label>
                <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }}>
                  {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, fontFamily: "Inter", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAddTask}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--cyan)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer", opacity: newTask.title.trim() ? 1 : 0.5 }}>Create Task</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
