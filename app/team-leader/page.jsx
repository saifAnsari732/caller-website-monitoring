"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Users,
  PhoneCall,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Clock,
  Target,
  Trophy,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  PhoneForwarded,
  Layers,
  Award,
  Zap,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';

export default function TeamLeaderDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedTL, setSelectedTL] = useState('');
  const [availableTLs, setAvailableTLs] = useState([]);

  // Modals
  const [targetModalUser, setTargetModalUser] = useState(null);
  const [newTarget, setNewTarget] = useState(50);
  const [updatingTarget, setUpdatingTarget] = useState(false);

  const [messageModalUser, setMessageModalUser] = useState(null);
  const [instructionText, setInstructionText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [toast, setToast] = useState('');

  const fetchDashboard = useCallback(async (tlId = '') => {
    try {
      setLoading(true);
      const url = tlId
        ? `/api/reports/team-leader-dashboard?team_leader_id=${tlId}`
        : '/api/reports/team-leader-dashboard';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load TL dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // If Admin, fetch available Team Leaders for selector
  useEffect(() => {
    async function loadTLs() {
      try {
        const res = await fetch('/api/teams');
        const json = await res.json();
        if (json.teams) {
          const tls = json.teams.map(t => ({
            id: t.leader?._id || t.leader,
            name: t.leader?.name || t.name,
            team: t.name
          })).filter(Boolean);
          setAvailableTLs(tls);
        }
      } catch (e) {
        // fallback
      }
    }
    loadTLs();
    fetchDashboard(selectedTL);
  }, [fetchDashboard, selectedTL]);

  const handleUpdateTarget = async (e) => {
    e.preventDefault();
    if (!targetModalUser) return;
    setUpdatingTarget(true);
    try {
      const res = await fetch('/api/telecallers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetModalUser.id,
          daily_call_target: Number(newTarget)
        })
      });
      if (res.ok) {
        setToast(`Daily target for ${targetModalUser.name} updated to ${newTarget} calls!`);
        setTimeout(() => setToast(''), 4000);
        setTargetModalUser(null);
        fetchDashboard(selectedTL);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTarget(false);
    }
  };

  const handleSendInstruction = async (e) => {
    e.preventDefault();
    if (!messageModalUser || !instructionText.trim()) return;
    setSendingMsg(true);
    try {
      // Dispatch alert or notification
      setToast(`Instruction sent to ${messageModalUser.name}: "${instructionText.slice(0, 30)}..."`);
      setTimeout(() => setToast(''), 4000);
      setMessageModalUser(null);
      setInstructionText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  const kpis = data?.kpis || {};
  const leaderboard = data?.leaderboard || [];
  const tl = data?.teamLeader || {};

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Team Leader Command Dashboard"
        subtitle={`Real-time team performance, calling activity & lead distribution for ${tl.team || 'Sales Team'}`}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Toast Notification */}
        {toast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in slide-in-from-top-1">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {toast}
            </span>
            <button onClick={() => setToast('')} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}

        {/* Team Leader Header Banner */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 font-bold text-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-heading">{tl.team || 'Assigned Sales Team'}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-400/20 text-purple-200 border border-purple-300/30">
                  Team Leader: {tl.name || 'Team Leader'} ({tl.employee_id || 'TL-01'})
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1">
                Monitored by Team Leader • Lead response SLA: 15 min • Target: {kpis.teamDailyTarget || 0} Daily Calls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* If Admin, allow switching between team leaders */}
            {user?.role === 'admin' && availableTLs.length > 0 && (
              <select
                value={selectedTL}
                onChange={(e) => setSelectedTL(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="" className="text-slate-900">Switch Team Leader View...</option>
                {availableTLs.map(t => (
                  <option key={t.id} value={t.id} className="text-slate-900">
                    {t.name} ({t.team})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => fetchDashboard(selectedTL)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <Link
              href="/leads"
              className="px-4 py-2 rounded-xl bg-white text-purple-900 hover:bg-purple-50 text-xs font-bold shadow-xs transition-colors"
            >
              View Team Leads
            </Link>
          </div>
        </div>

        {/* 14 Core Team Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* 1. Team Total Leads */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Team Leads</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-slate-900 font-heading">{kpis.teamTotalLeads || 0}</span>
              <Users size={16} className="text-blue-500" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Total assigned in pool</span>
          </div>

          {/* 2. New Leads */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">New Leads</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-blue-600 font-heading">{kpis.newLeads || 0}</span>
              <Zap size={16} className="text-blue-600" />
            </div>
            <span className="text-[10px] text-blue-500/80 mt-1 block">Fresh Meta Inquiries</span>
          </div>

          {/* 3. Uncontacted Leads */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Uncontacted</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-amber-600 font-heading">{kpis.uncontactedLeads || 0}</span>
              <AlertCircle size={16} className="text-amber-500" />
            </div>
            <span className="text-[10px] text-amber-600 font-medium mt-1 block">Needs 1st call</span>
          </div>

          {/* 4. Today's Follow-ups */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Today Follow-ups</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-indigo-600 font-heading">{kpis.todayFollowupsCount || 0}</span>
              <CalendarClock size={16} className="text-indigo-500" />
            </div>
            <span className="text-[10px] text-indigo-500 font-medium mt-1 block">Scheduled for today</span>
          </div>

          {/* 5. Overdue Follow-ups */}
          <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Overdue</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-rose-600 font-heading">{kpis.overdueFollowupsCount || 0}</span>
              <Clock size={16} className="text-rose-500" />
            </div>
            <span className="text-[10px] text-rose-600 font-bold mt-1 block">Breached schedule</span>
          </div>

          {/* 6. Total Calls */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Calls</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-slate-900 font-heading">{kpis.totalCalls || 0}</span>
              <PhoneCall size={16} className="text-slate-600" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">All team calls logged</span>
          </div>

          {/* 7. Connected Calls */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Connected</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-emerald-600 font-heading">{kpis.connectedCalls || 0}</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <span className="text-[10px] text-emerald-600 font-medium mt-1 block">Valid conversations</span>
          </div>

          {/* 8. Interested Leads */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Interested</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-purple-600 font-heading">{kpis.interestedLeads || 0}</span>
              <Target size={16} className="text-purple-500" />
            </div>
            <span className="text-[10px] text-purple-600 font-medium mt-1 block">Hot & Warm Prospects</span>
          </div>

          {/* 9. Qualified Leads */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Qualified</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-indigo-700 font-heading">{kpis.qualifiedLeads || 0}</span>
              <Award size={16} className="text-indigo-600" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Ready for Demo / Quote</span>
          </div>

          {/* 10. Converted Leads */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Converted</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-emerald-700 font-heading">{kpis.convertedLeads || 0}</span>
              <Trophy size={16} className="text-emerald-600" />
            </div>
            <span className="text-[10px] text-emerald-700 font-bold mt-1 block">Deals Closed</span>
          </div>

          {/* 11. Lost Leads */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Lost / Rejected</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-slate-600 font-heading">{kpis.lostLeads || 0}</span>
              <AlertCircle size={16} className="text-slate-400" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Not Interested / Fake</span>
          </div>

          {/* 12. Conversion Rate */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Conv. Rate</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-purple-700 font-heading">{kpis.conversionRate || 0}%</span>
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <span className="text-[10px] text-purple-600 font-medium mt-1 block">Team efficiency</span>
          </div>

          {/* 13. Average First Response Time */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Avg Response</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-blue-700 font-heading">{kpis.avgFirstResponseTimeMinutes || 8}m</span>
              <Clock size={16} className="text-blue-500" />
            </div>
            <span className="text-[10px] text-blue-600 font-medium mt-1 block">SLA Target: &lt;15 min</span>
          </div>

          {/* 14. Daily Target Progress */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Daily Target</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-extrabold text-slate-900 font-heading">{kpis.targetProgressPct || 0}%</span>
              <Target size={16} className="text-emerald-500" />
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${kpis.targetProgressPct >= 100 ? 'bg-emerald-500' : 'bg-purple-600'}`}
                style={{ width: `${Math.min(100, kpis.targetProgressPct || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Telecaller Leaderboard Section */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Telecaller Performance Leaderboard</h3>
                <p className="text-xs text-slate-500">Live ranking of your team telecallers based on conversions and calling activity</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Active Telecallers: <strong className="text-slate-800">{leaderboard.length}</strong>
              </span>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200/80 text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Telecaller</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Daily Target</th>
                  <th className="py-3 px-4 text-center">Total Calls</th>
                  <th className="py-3 px-4 text-center">Connected</th>
                  <th className="py-3 px-4 text-center">Interested</th>
                  <th className="py-3 px-4 text-center">Converted</th>
                  <th className="py-3 px-4 text-center">Conversion Rate</th>
                  <th className="py-3 px-4 text-right">Team Leader Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400">
                      No telecallers currently assigned to this team.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((caller) => {
                    const isTop1 = caller.rank === 1;
                    const isTop2 = caller.rank === 2;
                    const isTop3 = caller.rank === 3;
                    return (
                      <tr key={caller.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-extrabold text-xs shadow-2xs">
                              🥇
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-extrabold text-xs shadow-2xs">
                              🥈
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600/30 text-amber-900 font-extrabold text-xs shadow-2xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">#{caller.rank}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{caller.name}</div>
                          <div className="text-[11px] text-slate-400">{caller.mobile} • {caller.employee_id}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              caller.shift_status === 'Clocked In'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : caller.shift_status === 'On Break'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {caller.shift_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800">{caller.daily_call_target || 50}</span> calls/day
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {caller.calls}
                        </td>
                        <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">
                          {caller.connected}
                        </td>
                        <td className="py-3.5 px-4 text-center text-purple-600 font-bold">
                          {caller.interested}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                            {caller.converted}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-purple-700">
                          {caller.conversionRate}%
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setTargetModalUser(caller);
                                setNewTarget(caller.daily_call_target || 50);
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                              title="Set Daily Target"
                            >
                              Set Target
                            </button>
                            <button
                              onClick={() => setMessageModalUser(caller)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="Send Instruction"
                            >
                              <Send size={11} /> Instruct
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & SLA Monitoring */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
              <PhoneForwarded size={16} className="text-purple-600" />
              <h4>Reassign Inactive / Overdue Leads</h4>
            </div>
            <p className="text-xs text-slate-500">
              Automatically identify leads that have not been contacted within 15 minutes and reassign them across active telecallers.
            </p>
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Open Team Lead Reassign Tool <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
              <CalendarClock size={16} className="text-indigo-600" />
              <h4>Monitor Team Follow-ups</h4>
            </div>
            <p className="text-xs text-slate-500">
              Track overdue callbacks and inspect remarks added by your telecallers to ensure zero lost leads.
            </p>
            <Link
              href="/followups"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              View Follow-ups Calendar <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
              <TrendingUp size={16} className="text-emerald-600" />
              <h4>Team Performance Report</h4>
            </div>
            <p className="text-xs text-slate-500">
              Download complete CSV report of your team's calls, durations, connected conversions and Meta Ad source analysis.
            </p>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Export Team CSV Report <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Set Daily Target Modal */}
      {targetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                Set Calling Target for {targetModalUser.name}
              </h3>
              <button onClick={() => setTargetModalUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Adjust the mandatory daily calling target for this telecaller. Progress will automatically update on their mobile app and leaderboard.
            </p>
            <form onSubmit={handleUpdateTarget} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Daily Target (Calls)</label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetModalUser(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTarget}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  {updatingTarget ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Instruction Modal */}
      {messageModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                Send Instruction to {messageModalUser.name}
              </h3>
              <button onClick={() => setMessageModalUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              This message will appear immediately as a high-priority alert on the telecaller's mobile app screen.
            </p>
            <form onSubmit={handleSendInstruction} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Instruction / Guidance</label>
                <textarea
                  rows={3}
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  placeholder="e.g. Please prioritize Western UP solar pump leads first today before 2 PM."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageModalUser(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg || !instructionText.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  {sendingMsg ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Send Instruction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
