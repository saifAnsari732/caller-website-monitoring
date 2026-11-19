"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Plus,
  Trash2,
  Loader2,
  X,
  Users,
  Layers,
  ShieldCheck,
  Award,
  PhoneCall,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [newTeam, setNewTeam] = useState({
    name: '',
    code: '',
    leaderId: '',
    description: '',
    campaigns: 'Facebook - Tractor Subsidies, Meta Ads - Solar Pumps Delhi/UP'
  });

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (data.teams) setTeams(data.teams);
      if (data.teamLeaders) setTeamLeaders(data.teamLeaders);
      if (data.telecallers) setTelecallers(data.telecallers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.name.trim() || !newTeam.code.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeam.name.trim(),
          code: newTeam.code.trim().toUpperCase(),
          leaderId: newTeam.leaderId || (teamLeaders[0]?._id),
          description: newTeam.description.trim(),
          campaigns: newTeam.campaigns.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`Team ${newTeam.name} created successfully!`);
        setTimeout(() => setToast(''), 4000);
        setShowCreateModal(false);
        setNewTeam({ name: '', code: '', leaderId: '', description: '', campaigns: 'Facebook Meta Lead Ads' });
        fetchTeams();
      } else {
        alert(data.error || 'Failed to create team');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (code) => {
    if (!confirm('Are you sure you want to deactivate this team?')) return;
    try {
      await fetch(`/api/teams?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      setToast('Team deactivated successfully');
      setTimeout(() => setToast(''), 4000);
      fetchTeams();
    } catch (e) {
      console.error(e);
    }
  };

  const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Sales Teams & Organizational Hierarchy"
        subtitle="3-tier architecture: Admin → Team Leader → Telecallers with strict access boundaries"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        {toast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {toast}
            </span>
            <button onClick={() => setToast('')} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}

        {/* 3-Tier Hierarchy Architecture Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-6 text-white shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30 inline-block mb-1">
                Multi-Role Security Architecture
              </span>
              <h2 className="text-xl font-bold font-heading">Enterprise Team Structure</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Strict database-enforced RBAC: <strong>Admin</strong> oversees all teams and leads, <strong>Team Leaders</strong> have access strictly to their assigned team's telecallers, calls, and leads, while <strong>Telecallers</strong> only see their assigned leads.
              </p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} /> Create Sales Team
              </button>
            )}
          </div>

          {/* Hierarchy Diagram Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck size={14} /> 1. Admin Role
              </span>
              <p className="text-[11px] text-slate-300">
                Full CRM control: user creation, team creation, global reassignment, all reports, system configurations.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 mb-1">
                <Award size={14} /> 2. Team Leader Role
              </span>
              <p className="text-[11px] text-slate-300">
                Own team access: monitor telecallers, assign team leads, set daily targets, view team leaderboard, review remarks.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                <UserCheck size={14} /> 3. Telecaller Role
              </span>
              <p className="text-[11px] text-slate-300">
                Low-click workflow: click-to-call, WhatsApp templates, disposition selection, mandatory remarks, follow-up scheduling.
              </p>
            </div>
          </div>
        </div>

        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Sales Teams</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-slate-900 font-heading">{teams.length} Teams</span>
              <Layers size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Team Leaders</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-purple-700 font-heading">{teamLeaders.length} Leaders</span>
              <Award size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Telecallers</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-emerald-700 font-heading">{telecallers.length} Agents</span>
              <UserCheck size={20} className="text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div key={team._id || team.code} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                {/* Team Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 font-heading">{team.name}</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                        {team.code}
                      </span>
                    </div>
                    {team.description && (
                      <p className="text-xs text-slate-500 mt-1">{team.description}</p>
                    )}
                  </div>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteTeam(team.code)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Deactivate Team"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Team Leader Box */}
                <div className="p-5 space-y-4">
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                        TL
                      </div>
                      <div>
                        <span className="text-[10.5px] font-bold text-purple-700 uppercase tracking-wider block">Assigned Team Leader</span>
                        <p className="text-sm font-bold text-slate-900">
                          {team.leader?.name || 'Vikram Malhotra'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {team.leader?.mobile || '9876543212'} • {team.leader?.employee_id || 'TL-01'}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/team-leader"
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      TL Dashboard
                    </Link>
                  </div>

                  {/* Telecallers in this team */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">
                        Assigned Telecallers ({team.members?.length || 0})
                      </span>
                      <Link href="/telecallers" className="text-[11px] text-purple-600 font-semibold hover:underline">
                        Manage Roster →
                      </Link>
                    </div>
                    <div className="space-y-1.5">
                      {team.members && team.members.length > 0 ? (
                        team.members.map((member) => (
                          <div
                            key={member._id || member.employee_id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                                TC
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">{member.name}</span>
                                <span className="text-slate-400 text-[11px] ml-2">({member.employee_id})</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 font-semibold">
                                Target: {member.daily_call_target || 50}/day
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                member.shift_status === 'Clocked In'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {member.shift_status || 'Clocked In'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">No telecallers assigned yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Linked Meta Campaigns */}
                  {team.campaigns && team.campaigns.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">Linked Meta Campaigns</span>
                      <div className="flex flex-wrap gap-1.5">
                        {team.campaigns.map((camp, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-semibold"
                          >
                            {camp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Links */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
                <Link
                  href="/leads"
                  className="text-slate-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                >
                  <Users size={13} /> View Team Leads
                </Link>
                <Link
                  href="/reports"
                  className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
                >
                  <TrendingUp size={13} /> Team Reports
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-heading">Create New Sales Team</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="e.g. Eastern Region Agribusiness Team"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Team Code</label>
                <input
                  type="text"
                  required
                  value={newTeam.code}
                  onChange={(e) => setNewTeam({ ...newTeam, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. TEAM-EAST"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Team Leader</label>
                <select
                  value={newTeam.leaderId}
                  onChange={(e) => setNewTeam({ ...newTeam, leaderId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  <option value="">Select Team Leader...</option>
                  {teamLeaders.map((tl) => (
                    <option key={tl._id} value={tl._id}>
                      {tl.name} ({tl.employee_id} - {tl.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Linked Meta Ad Campaigns</label>
                <input
                  type="text"
                  value={newTeam.campaigns}
                  onChange={(e) => setNewTeam({ ...newTeam, campaigns: e.target.value })}
                  placeholder="Campaign 1, Campaign 2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
