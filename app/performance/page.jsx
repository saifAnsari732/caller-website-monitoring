"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../../components/Header';
import {
  Target,
  Activity,
  Users,
  RefreshCw,
  Loader2,
  Award,
  Sparkles,
  TrendingUp,
  Download,
  Printer,
  Sliders,
  CheckCircle2,
  X,
  PhoneCall,
  Flame,
  Check
} from 'lucide-react';

export default function PerformancePage() {
  const [agents, setAgents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Target Adjust Modal
  const [editingAgent, setEditingAgent] = useState(null);
  const [callTargetInput, setCallTargetInput] = useState(50);
  const [convTargetInput, setConvTargetInput] = useState(5);
  const [updatingTarget, setUpdatingTarget] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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

  const filteredAgents = useMemo(() => {
    return teamFilter === 'ALL'
      ? agents
      : agents.filter(a => a.team === teamFilter);
  }, [agents, teamFilter]);

  // Ranked telecallers for podium
  const rankedAgents = useMemo(() => {
    return [...filteredAgents].sort((a, b) => {
      const aScore = (a.todaysCalls || 0) * 2 + (a.connected || 0) * 3 + (a.interested || 0) * 5 + (a.closed || 0) * 10;
      const bScore = (b.todaysCalls || 0) * 2 + (b.connected || 0) * 3 + (b.interested || 0) * 5 + (b.closed || 0) * 10;
      return bScore - aScore;
    });
  }, [filteredAgents]);

  const uniqueTeams = useMemo(() => {
    return ['ALL', ...Array.from(new Set(agents.map(a => a.team).filter(Boolean)))];
  }, [agents]);

  // Open Target Edit
  const openTargetModal = (agent) => {
    setEditingAgent(agent);
    setCallTargetInput(agent.targetCalls || 50);
    setConvTargetInput(agent.targetConversions || 5);
    setUpdateSuccess(false);
  };

  // Submit Target Update
  const handleSaveTarget = async (e) => {
    e.preventDefault();
    if (!editingAgent) return;
    setUpdatingTarget(true);

    try {
      const res = await fetch('/api/telecallers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAgent.id,
          daily_call_target: Number(callTargetInput),
          daily_conversion_target: Number(convTargetInput)
        })
      });
      if (res.ok) {
        setUpdateSuccess(true);
        setTimeout(() => {
          setEditingAgent(null);
          fetchPerformance();
        }, 600);
      }
    } catch (err) {
      console.error('Target save failed:', err);
    } finally {
      setUpdatingTarget(false);
    }
  };

  // Export Matrix CSV
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const rows = [
      'Rank,Telecaller,EmployeeID,Team,ShiftStatus,AssignedLeads,CallsDialed,TargetCalls,Connected,Interested,ClosedDeals,TargetProgress',
      ...rankedAgents.map((a, idx) => {
        const prog = Math.min(100, Math.round(((a.todaysCalls || 0) / (a.targetCalls || 50)) * 100));
        return `"${idx + 1}","${a.name}","${a.employee_id || ''}","${a.team}","${a.shiftStatus}",${a.assignedLeads || 0},${a.todaysCalls || 0},${a.targetCalls || 50},${a.connected || 0},${a.interested || 0},${a.closed || 0},"${prog}%"`;
      })
    ];
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KisanIndia_Agent_Performance_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <div className="print:hidden">
        <Header
          title="Telecaller Performance &amp; Live Velocity Matrix"
          subtitle="Real-time telecaller productivity tracking, dynamic call targets, leaderboard podium &amp; floor telemetry"
        />
      </div>

      <main className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6 print:p-0">
        {/* Top Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            {uniqueTeams.map(team => (
              <button
                key={team}
                onClick={() => setTeamFilter(team)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer ${
                  teamFilter === team
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                {team === 'ALL' ? 'All Sales Teams' : team}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Scorecard</span>
            </button>

            <button
              onClick={() => { setLoading(true); fetchPerformance(); }}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors"
              title="Refresh Performance Matrix"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* Podium Leaderboard Cards (Top 3) */}
        {rankedAgents.length >= 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
            {/* Rank 2 (Silver) */}
            {rankedAgents[1] ? (
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-300">
                      2
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Rank 2 • Silver</span>
                      <h4 className="text-sm font-bold text-slate-900">{rankedAgents[1].name}</h4>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {rankedAgents[1].connected} Connected
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                  <span>Calls: <strong className="text-slate-900">{rankedAgents[1].todaysCalls}</strong></span>
                  <span>Won: <strong className="text-emerald-600">{rankedAgents[1].closed}</strong></span>
                  <span>Target: <strong className="text-slate-900">{rankedAgents[1].targetCalls || 50}</strong></span>
                </div>
              </div>
            ) : <div />}

            {/* Rank 1 (Gold) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold flex items-center justify-center text-base shadow-md shadow-amber-500/30">
                    1
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
                      <Sparkles size={12} />
                      Top Performer • Gold
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{rankedAgents[0].name}</h4>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300">
                  {rankedAgents[0].connected} Connected
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-200/60 flex justify-between text-xs text-slate-700">
                <span>Calls: <strong className="text-slate-900 font-bold">{rankedAgents[0].todaysCalls}</strong></span>
                <span>Interested: <strong className="text-indigo-600 font-bold">{rankedAgents[0].interested}</strong></span>
                <span>Won: <strong className="text-emerald-600 font-bold">{rankedAgents[0].closed}</strong></span>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            {rankedAgents[2] ? (
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 font-bold flex items-center justify-center text-sm border border-amber-200">
                      3
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Rank 3 • Bronze</span>
                      <h4 className="text-sm font-bold text-slate-900">{rankedAgents[2].name}</h4>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {rankedAgents[2].connected} Connected
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                  <span>Calls: <strong className="text-slate-900">{rankedAgents[2].todaysCalls}</strong></span>
                  <span>Won: <strong className="text-emerald-600">{rankedAgents[2].closed}</strong></span>
                  <span>Target: <strong className="text-slate-900">{rankedAgents[2].targetCalls || 50}</strong></span>
                </div>
              </div>
            ) : <div />}
          </div>
        )}

        {/* Matrix & Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Matrix */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  <h3 className="text-sm font-heading font-bold text-slate-900">
                    Telecaller Comparison &amp; Goal Target Matrix
                  </h3>
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
                      <th className="py-3.5 px-4">Closed</th>
                      <th className="py-3.5 px-6 text-right">Target Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
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
                          <td className="py-4 px-4 font-bold tabular-nums text-emerald-600">{agent.closed}</td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => openTargetModal(agent)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-semibold border border-slate-200/80 transition-colors cursor-pointer"
                            >
                              Adjust Target
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Call Target Progress */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target size={18} className="text-blue-600" />
                <h3 className="text-sm font-heading font-bold text-slate-900">Daily Call Target Velocity</h3>
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

          {/* Live Floor Activity Timeline Sidebar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[640px]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                <h3 className="text-sm font-heading font-bold text-slate-900">Live Floor Activity Stream</h3>
              </div>
            </div>
            <div className="p-4 bg-blue-50/60 border-b border-blue-100 text-xs text-blue-900 font-medium leading-relaxed">
              Real-time MongoDB Call &amp; Lead disposition events verifying floor telecaller activity
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

      {/* Adjust Target Modal */}
      {editingAgent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Adjust Daily Targets
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update performance targets for <strong>{editingAgent.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingAgent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {updateSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check size={16} />
                <span>Target updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Daily Call Target (Calls / Day)
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={callTargetInput}
                  onChange={e => setCallTargetInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Daily Conversion / Win Target (Deals / Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={convTargetInput}
                  onChange={e => setConvTargetInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTarget}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {updatingTarget ? 'Saving...' : 'Save Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
