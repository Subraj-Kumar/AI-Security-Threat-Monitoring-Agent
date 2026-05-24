"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, BarChart3, CheckCircle, ChevronRight, Zap, Loader2, RefreshCw, Activity } from "lucide-react";

type Incident = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  score: number;
  confidence: number;
  last_seen: string;
};

type FilteringMetrics = {
  total_events_processed: number;
  baseline_noise_filtered: number;
  critical_incidents_surfaced: number;
  filtering_effectiveness_percent: number;
  time_saved_percent: number;
  analyst_workload_reduction: string;
};

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestedEvents, setIngestedEvents] = useState(0);
  const [createdIncidents, setCreatedIncidents] = useState(0);
  const [selectedDataset, setSelectedDataset] = useState("synthetic");
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [honeypotRunning, setHoneypotRunning] = useState(false);
  const [honeypotLoading, setHoneypotLoading] = useState(false);
  const [filteringMetrics, setFilteringMetrics] = useState<FilteringMetrics | null>(null);

  const fetchIncidents = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/incidents");
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteringMetrics = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/analytics/filtering-metrics");
      if (res.ok) {
        const data = await res.json();
        setFilteringMetrics(data);
      }
    } catch (err) {
      console.error("Failed to fetch filtering metrics", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIncidents();
    fetchFilteringMetrics();
  }, []);

  const handleIngestDataset = async (datasetType: string) => {
    setIngesting(true);
    setIngestError(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/ingest/dataset/${datasetType}`, { method: "POST" });
      if (!res.ok) {
        if (res.status === 404) {
          const error = await res.json();
          setIngestError(`❌ ${error.detail}`);
        } else {
          setIngestError(`Failed to ingest dataset (HTTP ${res.status})`);
        }
        setIngesting(false);
        return;
      }
      const data = await res.json();
      setIngestedEvents(data.ingested_events || 0);
      setCreatedIncidents(data.created_incidents || 0);
      await fetchIncidents();
      await fetchFilteringMetrics();
    } catch (err) {
      console.error(`Failed to ingest ${datasetType}`, err);
      setIngestError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleSimulateAttack = () => {
    handleIngestDataset("synthetic");
  };

  const handleStartHoneypot = async () => {
    setHoneypotLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/honeypot/start", { method: "POST" });
      const data = await res.json();
      setHoneypotRunning(data.running);
    } catch (err) {
      console.error("Failed to start honeypot", err);
    } finally {
      setHoneypotLoading(false);
    }
  };

  const handleStopHoneypot = async () => {
    setHoneypotLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/honeypot/stop", { method: "POST" });
      const data = await res.json();
      setHoneypotRunning(data.running);
    } catch (err) {
      console.error("Failed to stop honeypot", err);
    } finally {
      setHoneypotLoading(false);
    }
  };

  const checkHoneypotStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/honeypot/status");
      const data = await res.json();
      setHoneypotRunning(data.running);
    } catch (err) {
      console.error("Failed to check honeypot status", err);
    }
  };

  useEffect(() => {
    // Check honeypot status on mount
    checkHoneypotStatus();
  }, []);

  const criticalCount = incidents.filter(i => i.severity === "critical").length;
  const noiseFilteredPercent = ingestedEvents > 0 
    ? (((ingestedEvents - createdIncidents) / ingestedEvents) * 100).toFixed(1)
    : 0;

  const getSeverityStyles = (severity: string) => {
    const styles: Record<string, { bg: string; text: string; accent: string }> = {
      critical: { bg: "bg-red-50", text: "text-red-900", accent: "text-red-600" },
      high: { bg: "bg-orange-50", text: "text-orange-900", accent: "text-orange-600" },
      medium: { bg: "bg-yellow-50", text: "text-yellow-900", accent: "text-yellow-600" },
      low: { bg: "bg-blue-50", text: "text-blue-900", accent: "text-blue-600" },
    };
    return styles[severity] || { bg: "bg-slate-50", text: "text-slate-900", accent: "text-slate-600" };
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-blue-50/50 via-white/50 to-transparent" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-orange-400/10 blur-[120px]" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12 md:py-20 relative z-10">

        {/* Hero header (Instagram-inspired: airy, bold type, subtle gradient accent) */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100 text-xs font-semibold">
              <Shield className="w-4 h-4" />
              Security Operations Center
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
              Incident Triage
              <span className="ml-3 bg-gradient-to-r from-blue-600 via-sky-500 to-orange-500 bg-clip-text text-transparent">Queue</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl font-medium leading-relaxed">
              Review prioritized signals, investigate suspicious activity, and generate high-trust reports with AI-assisted clarity.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleSimulateAttack}
              disabled={ingesting}
              className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 whitespace-nowrap"
            >
              {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {ingesting ? "Ingesting..." : "Simulate Attack"}
            </button>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              disabled={ingesting}
              className="px-4 py-2.5 rounded-xl font-medium text-sm border border-slate-300 bg-white text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:border-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="synthetic">Simulated Enterprise Traffic</option>
              <option value="bots-auth">Splunk BOTS (AD/Auth CSV)</option>
              <option value="suricata">Splunk BOTS (Suricata IDS JSON)</option>
              <option value="live">📡 Live Honeypot Stream</option>
            </select>
            <button
              onClick={async () => {
                setIngesting(true);
                try {
                  if (selectedDataset === "live") {
                    if (!honeypotRunning) {
                      await handleStartHoneypot();
                    }
                    await fetchIncidents();
                    await fetchFilteringMetrics();
                  } else {
                    const res = await fetch(`http://127.0.0.1:8000/ingest/dataset/${selectedDataset}`, { method: "POST" });
                    if (!res.ok) {
                      if (res.status === 404) {
                        const error = await res.json();
                        setIngestError(`❌ ${error.detail}`);
                      } else {
                        setIngestError(`Failed to ingest dataset (HTTP ${res.status})`);
                      }
                      setIngesting(false);
                      return;
                    }
                    const data = await res.json();
                    setIngestedEvents(data.ingested_events || 0);
                    setCreatedIncidents(data.created_incidents || 0);
                    await fetchIncidents();
                    await fetchFilteringMetrics();
                  }
                } catch (err) {
                  console.error(`Failed to ingest ${selectedDataset}`, err);
                  setIngestError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                } finally {
                  setIngesting(false);
                }
              }}
              disabled={ingesting}
              className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 whitespace-nowrap"
            >
              {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedDataset === "live" ? <Activity className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {ingesting ? "Loading..." : selectedDataset === "live" ? "Refresh Live Feed" : "Ingest Dataset"}
            </button>
            {honeypotRunning && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-700 shadow-sm whitespace-nowrap">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  🎯 Honeypot Active
                </div>
                <button
                  onClick={handleStopHoneypot}
                  disabled={honeypotLoading}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 whitespace-nowrap text-sm"
                >
                  {honeypotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  {honeypotLoading ? "Stopping..." : "⛔ Stop"}
                </button>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-slate-200 text-xs text-slate-600 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live
            </div>
            {ingestError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 shadow-sm whitespace-nowrap">
                {ingestError}
              </div>
            )}
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-default">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500/70 to-orange-500/60" />
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Shield className="text-red-600 w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-slate-600 text-sm font-medium">Critical Threats</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">{criticalCount}</p>
              </div>
            </div>
          </div>
          <div className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-default">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500/70 to-amber-400/70" />
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="text-orange-700 w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-slate-600 text-sm font-medium">Active Incidents</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">{incidents.length}</p>
              </div>
            </div>
          </div>
          <div className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-default">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600/70 to-sky-500/70" />
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="text-green-600 w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-slate-600 text-sm font-medium">System Status</p>
                <p className="text-lg font-bold text-green-600 mt-1">Operational</p>
              </div>
            </div>
          </div>
          <div className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-default">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/70 to-teal-500/70" />
            <div className="flex items-start gap-4">
              <div className="bg-emerald-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="text-emerald-600 w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-slate-600 text-sm font-medium">Noise Filtered</p>
                <div className="mt-1">
                  <p className="text-3xl font-bold text-emerald-600">{ingestedEvents > 0 ? `${noiseFilteredPercent}%` : "—"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ingestedEvents > 0 ? `${ingestedEvents} events → ${createdIncidents} incident${createdIncidents !== 1 ? 's' : ''}` : "Run ingestion"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Threat Prioritization Metrics (Judge Feature) */}
        {filteringMetrics && filteringMetrics.total_events_processed > 0 && (
          <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <Shield className="text-blue-600 w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-blue-700 text-sm font-semibold">📊 Raw Events Ingested</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">{filteringMetrics.total_events_processed.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-2">Total security logs processed</p>
                </div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="text-emerald-600 w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-700 text-sm font-semibold">✅ Noise Filtered (Baseline)</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-2">{filteringMetrics.baseline_noise_filtered.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-2">False positives removed: {filteringMetrics.filtering_effectiveness_percent}%</p>
                </div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <Zap className="text-red-600 w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-red-700 text-sm font-semibold">🎯 Critical Incidents Surfaced</p>
                  <p className="text-3xl font-bold text-red-900 mt-2">{filteringMetrics.critical_incidents_surfaced}</p>
                  <p className="text-xs text-red-600 mt-2">{filteringMetrics.analyst_workload_reduction}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incidents Table */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-5">Incident Triage Queue</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading incidents...
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-12 text-center text-slate-600">
                <p>No active incidents. Click <span className="font-semibold">Ingest Sample</span> to simulate an attack.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">Severity</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">Risk Score</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">Confidence</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">Incident</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900">Last Seen</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="group hover:bg-slate-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityStyles(incident.severity).bg} ${getSeverityStyles(incident.severity).text} border border-current border-opacity-20`}>
                            {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm font-semibold text-slate-900">{incident.score}</td>
                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{(incident.confidence * 100).toFixed(0)}%</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{incident.title}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(incident.last_seen).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/incidents/${incident.id}`} className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-semibold text-sm transition-colors">
                            Investigate
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}