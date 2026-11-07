"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import { Target, Activity, Users, RefreshCw, Loader2 } from 'lucide-react';

export default function PerformancePage() {
  const [agents, setAgents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState('ALL');

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch('/api/telecallers');
      const data = await res.json();
      if (data.telecallers) setAgents(data.telecallers);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const filteredAgents = teamFilter === 'ALL'
    ? agents
    : agents.filter(a => a.team === teamFilter);

  const uniqueTeams = ['ALL', ...Array.from(new Set(agents.map(a => a.team).filter(Boolean)))];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Agent Performance & Target Matrix"
        subtitle="Real-time telecaller comparison matrix, daily call target progress & live activity stream"
      />

      <main className="p-6 lg:p-8 flex-1 space-y-6">
        {/* Team Filter & Live Indicator */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {uniqueTeams.map(team => (
              <button
                key={team}
                onClick={() => setTeamFilter(team)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full shadow-xs transition-all cursor-pointer ${
                  teamFilter === team
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {team === 'ALL' ? 'All Sales Teams' : team}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Live MongoDB Telemetry
            </div>
            <button
              onClick={() => { setLoading(true); fetchPerformance(); }}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors"
              title="Refresh Performance Matrix"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Matrix & Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Matrix */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  <h3 className="text-sm font-heading font-bold text-slate-900">Telecaller Comparison Matrix</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">{filteredAgents.length} Agents</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Telecaller</th>
                      <th className="py-3.5 px-4">Assigned</th>
                      <th className="py-3.5 px-4">Calls Dialed</th>
                      <th className="py-3.5 px-4">Connected</th>
                      <th className="py-3.5 px-4">Interested</th>
                      <th className="py-3.5 px-6">Closed Deals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                          <Loader2 size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                          Loading performance metrics...
                        </td>
                      </tr>
                    ) : (
                      filteredAgents.map((agent) => (
                        <tr key={agent.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              {agent.name?.charAt(0) || 'A'}
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-slate-900 block">{agent.name}</span>
                              <span className="text-[11px] text-slate-400 font-normal">{agent.team}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-semibold tabular-nums text-slate-700">{agent.assignedLeads || 0}</td>
                          <td className="py-4 px-4 font-bold tabular-nums text-slate-900">{agent.todaysCalls}</td>
                          <td className="py-4 px-4 font-bold tabular-nums text-blue-600">{agent.connected}</td>
                          <td className="py-4 px-4 font-bold tabular-nums text-indigo-600">{agent.interested}</td>
                          <td className="py-4 px-6 font-bold tabular-nums text-emerald-600">{agent.closed}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target size={18} className="text-blue-600" />
                <h3 className="text-sm font-heading font-bold text-slate-900">Daily Call Target Progress</h3>
              </div>
              <div className="space-y-5">
                {filteredAgents.map((agent) => {
                  const target = agent.targetCalls || 50;
                  const progress = Math.min(100, Math.round(((agent.todaysCalls || 0) / target) * 100));
                  return (
                    <div key={agent.id}>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                          <p className="text-xs text-slate-500 font-normal">
                            Calls Logged: <strong className="text-slate-800">{agent.todaysCalls}</strong> / {target} • Avg Talk Time: {agent.avgCallDurationSec || 0}s
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-blue-600 tabular-nums">{progress}% Achieved</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.max(4, progress)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Activity Timeline Sidebar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[640px]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                <h3 className="text-sm font-heading font-bold text-slate-900">Live Floor Activity Stream</h3>
              </div>
            </div>
            <div className="p-4 bg-blue-50/60 border-b border-blue-100 text-xs text-blue-900 font-medium leading-relaxed">
              Real-time MongoDB Call & Lead disposition events verifying floor telecaller activity
            </div>

            <div className="flex-1 overflow-y-auto p-6 relative">
              <div className="space-y-4">
                {auditLogs.map((item, idx) => (
                  <div key={item.id || idx} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.agent}</span>
                      <span className="text-[10px] font-semibold text-slate-400 tabular-nums">{item.time}</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                      {item.action}
                    </span>
                    <p className="text-xs text-slate-600 font-normal pt-0.5">{item.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
