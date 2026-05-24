"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, AlertCircle, Loader2, Zap, Database, 
  MessageCircle, Download, ChevronRight, Shield
} from "lucide-react";

// --- TypeScript Interfaces ---
interface LogEvent {
  id: string;
  ts: string;
  source: string;
  event_type: string;
  username?: string;
  ip?: string;
  raw: string;
}

interface Signal {
  rule_name: string;
  points: number;
  evidence: string;
}

interface Explanation {
  summary: string;
  why_flagged: string;
  likely_attack_pattern: string;
  recommended_actions: string[];
}

interface AuditEntry {
  timestamp: string;
  action: string;
  user: string;
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  score: number;
  confidence: number;
  entities: { users: string[]; ips: string[] };
  first_seen: string;
  last_seen: string;
  event_count: number;
  signals: Signal[];
  events: LogEvent[];
  explanation?: Explanation | null;
  status: string;
  assignee: string;
  mitre_tags: string[];
  audit_log: AuditEntry[];
  threat_intel_enrichment?: string[];
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  citations?: string[];
}

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  
  const [chatInput, setChatInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>("");

  const BACKEND_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    if (!id) return;
    async function fetchIncidentData() {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/incidents/${id}`);
        if (!res.ok) throw new Error("Could not find incident records.");
        const data = await res.json();
        setIncident(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Backend network communication breakdown.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchIncidentData();
  }, [id]);

  const handleAction = async (action_type: string, value: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/incidents/${id}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_type, value, user: "Analyst-1" })
      });
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
      }
    } catch (err: unknown) {
      console.error("Failed to perform action", err);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    handleAction("note", noteInput);
    setNoteInput("");
  };

  const handleTriggerAIAnalysis = async () => {
    if (!id) return;
    try {
      setAiLoading(true);
      const res = await fetch(`${BACKEND_URL}/incidents/${id}/explain`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Gemini API Engine failed to compile analysis.");
      const aiExplanation = await res.json();
      setIncident((prev) => prev ? { ...prev, explanation: aiExplanation } : null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to generate AI analysis.";
      alert(message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !id) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userMessage }]);
    
    try {
      setChatLoading(true);
      const res = await fetch(`${BACKEND_URL}/incidents/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage }),
      });

      if (!res.ok) throw new Error("AI Agent execution timed out.");
      const data = await res.json();

      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: data.answer, citations: data.citations }
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: `Error processing query: ${message}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- MARKDOWN EXPORT ENGINE ---
  const handleExportMarkdown = () => {
    if (!incident) return;

    let md = `# 🚨 Security Incident Report: ${incident.title}\n\n`;
    md += `- **Incident ID:** \`${incident.id}\`\n`;
    md += `- **Severity:** ${incident.severity.toUpperCase()}\n`;
    md += `- **Risk Score:** ${incident.score}\n`;
    md += `- **AI Confidence:** ${(incident.confidence * 100).toFixed(0)}%\n`;
    md += `- **Report Generated:** ${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    md += `## 🧠 AI Executive Synthesis\n\n`;
    if (incident.explanation) {
      md += `${incident.explanation.summary}\n\n`;
      md += `### Why Flagged\n${incident.explanation.why_flagged}\n\n`;
      md += `### MITRE Attack Mapping\n${incident.explanation.likely_attack_pattern}\n\n`;
      md += `### Recommended Playbook Actions\n`;
      incident.explanation.recommended_actions.forEach(action => {
        md += `- [ ] ${action}\n`;
      });
      md += `\n`;
    } else {
      md += `> *No AI analysis was generated for this boundary.*\n\n`;
    }

    md += `## ⚙️ Deterministic Signals Triggered\n\n`;
    incident.signals.forEach(sig => {
      md += `- **${sig.rule_name}** (+${sig.points} pts): ${sig.evidence}\n`;
    });
    md += `\n`;

    md += `## 📡 Raw Event Telemetry\n\n`;
    md += `| Timestamp | Type | Source | User | IP | Raw Log |\n`;
    md += `|-----------|------|--------|------|----|---------|\n`;
    incident.events.forEach(evt => {
      const time = new Date(evt.ts).toLocaleString();
      md += `| ${time} | **${evt.event_type}** | ${evt.source} | ${evt.username || 'N/A'} | ${evt.ip || 'N/A'} | \`${evt.raw}\` |\n`;
    });

    // Generate and download the file
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SOC_Report_${incident.id.substring(0, 8)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-600 text-sm font-medium">Loading incident details...</div>
      </div>
    </div>
  );

  if (error || !incident) return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <div className="flex items-start gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="text-slate-900 font-semibold">Unable to load incident</div>
              <div className="text-slate-600 text-sm mt-1">{error || "Incident not found"}</div>
            </div>
          </div>
          <button 
            onClick={() => router.push("/")} 
            className="mt-6 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
    </div>
  );

  const getSeverityBadge = (sev: string) => {
    const maps: Record<string, { bg: string; text: string; accent: string }> = {
      critical: { bg: "bg-red-50", text: "text-red-900", accent: "text-red-600" },
      high: { bg: "bg-orange-50", text: "text-orange-900", accent: "text-orange-600" },
      medium: { bg: "bg-yellow-50", text: "text-yellow-900", accent: "text-yellow-600" },
      low: { bg: "bg-blue-50", text: "text-blue-900", accent: "text-blue-600" },
    };
    return maps[sev.toLowerCase()] || { bg: "bg-slate-50", text: "text-slate-900", accent: "text-slate-600" };
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-blue-50/50 via-white/50 to-transparent" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-orange-400/10 blur-[120px]" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 md:py-16 relative z-10">
        {/* Hero header card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm mb-8 hover:shadow-md transition-shadow">
          <div className="h-1 bg-gradient-to-r from-blue-700 via-sky-400 to-orange-500 animate-gradient-x" />
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                <button
                  onClick={() => router.push("/")}
                  className="mt-1 flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors bg-white border border-slate-200 rounded-xl p-2 shadow-sm"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 break-words leading-tight">{incident.title}</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-mono text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60">ID: {incident.id}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getSeverityBadge(incident.severity).bg} ${getSeverityBadge(incident.severity).text} border border-current border-opacity-20`}>
                      {incident.severity}
                    </span>
                  </div>

                  {/* MITRE Tags */}
                  {incident.mitre_tags && incident.mitre_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                      {incident.mitre_tags.map((tag) => (
                        <span key={tag} className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                          <span className="text-blue-500">⚡</span> {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Judge Feature: Threat Intelligence Enrichment */}
                  {incident.threat_intel_enrichment && incident.threat_intel_enrichment.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2">
                      {incident.threat_intel_enrichment.map((enrichment, idx) => (
                        <span key={idx} className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                          {enrichment}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch lg:items-center flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                    <select 
                      value={incident.status} 
                      onChange={(e) => handleAction('status', e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="false_positive">False Positive</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Assignee</span>
                    <select 
                      value={incident.assignee} 
                      onChange={(e) => handleAction('assignee', e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="Unassigned">Unassigned</option>
                      <option value="Analyst-1">Analyst-1</option>
                      <option value="Sec-Team-Alpha">Sec-Team-Alpha</option>
                    </select>
                  </div>
                </div>

                <div className="h-px sm:h-8 sm:w-px bg-slate-200" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-center shadow-sm">
                    <div className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Risk Score</div>
                    <div className="text-2xl font-black text-slate-900">{incident.score}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-center shadow-sm">
                    <div className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Confidence</div>
                    <div className="text-2xl font-black text-slate-900">{(incident.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
                <button
                  onClick={handleExportMarkdown}
                  className="px-6 py-4 sm:py-0 text-white bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 transition-all rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Signals & Events */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Detection Rules */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-200 bg-white">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Detection Rules Triggered
                </h2>
              </div>
              <div className="divide-y divide-slate-200">
                {incident.signals.map((signal, idx) => (
                  <div key={idx} className="group px-6 py-5 hover:bg-slate-50 transition-colors duration-200">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{signal.rule_name}</div>
                        <div className="text-sm text-slate-600 mt-2">{signal.evidence}</div>
                      </div>
                      <div className="bg-orange-50 text-orange-800 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border border-orange-200 group-hover:bg-orange-100 transition-colors">
                        +{signal.points} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Event Timeline */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-200 bg-white">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Event Timeline ({incident.event_count} events)
                </h2>
              </div>
              <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
                {incident.events.map((evt, idx) => (
                  <div key={evt.id || idx} className="px-6 py-6 hover:bg-slate-50 transition-colors duration-150">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                          evt.event_type.includes("FAIL") 
                            ? "bg-red-50 text-red-700 border border-red-200" 
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {evt.event_type}
                        </span>
                        <span className="text-xs text-slate-500">{new Date(evt.ts).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Source</span>
                        <div className="text-slate-900 font-medium mt-1">{evt.source}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">User</span>
                        <div className="text-slate-900 font-medium mt-1">{evt.username || "—"}</div>
                      </div>
                      <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">IP Address</span>
                        <div className="text-slate-900 font-medium mt-1">{evt.ip || "—"}</div>
                      </div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-[13px] leading-relaxed font-mono text-slate-300 break-words whitespace-pre-wrap overflow-x-hidden shadow-inner font-semibold">
                      {evt.raw}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: AI Analysis & Chat */}
          <div className="space-y-6">
            
            {/* AI Analysis */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  AI Analysis
                </h2>
                {incident.explanation && (
                  <button 
                    onClick={handleTriggerAIAnalysis} 
                    disabled={aiLoading}
                    className="text-xs px-3 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {aiLoading ? "Regenerating..." : "Regenerate"}
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {!incident.explanation ? (
                  <div className="text-center py-8">
                    <Zap className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600 mb-4">No analysis available for this incident.</p>
                    <button
                      onClick={handleTriggerAIAnalysis}
                      disabled={aiLoading}
                      className="group w-full px-4 py-3 text-white bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-sm font-semibold rounded-xl transition-all hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                      {aiLoading ? "Analyzing..." : "Analyze with Gemini"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Summary</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{incident.explanation.summary}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Why Flagged</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{incident.explanation.why_flagged}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Attack Pattern</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{incident.explanation.likely_attack_pattern}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Recommended Actions</h3>
                      <ul className="space-y-2">
                        {incident.explanation.recommended_actions.map((action, i) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Audit Log & Notes */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-200 bg-white">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Case Notes & Audit Trail
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto border border-slate-100 rounded-lg p-4 bg-slate-50">
                  {incident.audit_log && incident.audit_log.length > 0 ? (
                    incident.audit_log.map((log, idx) => (
                      <div key={idx} className="flex gap-3 text-xs text-slate-600 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                        <div className="text-slate-400 font-mono min-w-fit text-[10px] pt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-blue-700">{log.user}</div>
                          <div className="text-slate-600 mt-0.5">{log.action}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 text-xs py-4">No audit entries yet</div>
                  )}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input 
                    type="text" 
                    value={noteInput} 
                    onChange={(e) => setNoteInput(e.target.value)} 
                    placeholder="Add an analyst note..." 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    Add Note
                  </button>
                </form>
              </div>
            </section>

            {/* Chat Section */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px] shadow-sm">
              <div className="px-6 py-5 border-b border-slate-200 bg-white">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  Investigator Chat
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm">Ask questions about this incident</p>
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                        msg.sender === "user" 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "bg-white text-slate-900 border border-slate-200"
                      }`}>
                        {msg.text}
                        
                        {msg.citations && msg.citations.length > 0 && (
                          <div className={`mt-3 pt-2 border-t ${msg.sender === "user" ? "border-blue-400" : "border-slate-300"} text-xs space-y-1`}>
                            <span className="font-semibold block">Evidence:</span>
                            {msg.citations.map((cite, cIdx) => (
                              <div key={cIdx} className="text-xs opacity-90 truncate">
                                • {cite}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-900 px-4 py-3 rounded-lg text-xs flex items-center gap-2 border border-slate-200">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 p-6 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    Send
                  </button>
                </form>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}