"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import { Plus, Trash2, Loader2, X, Users, Layers } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newTeam, setNewTeam] = useState({
    name: '',
    code: '',
    leadName: '',
    leadMobile: '',
    campaigns: 'Facebook Meta Lead Ads'
  });

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/settings-hub');
      const data = await res.json();
      if (data.settings?.teams) setTeams(data.settings.teams);
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
    if (!newTeam.name.trim()) return;
    setSaving(true);
    try {
      const updated = [
        ...teams,
        {
          name: newTeam.name.trim(),
          code: newTeam.code.trim() || `TM-0${teams.length + 1}`,
          leadName: newTeam.leadName.trim() || 'Team Lead',
          leadMobile: newTeam.leadMobile.trim() || '',
          campaigns: newTeam.campaigns.split(',').map(s => s.trim()).filter(Boolean)
        }
      ];
      await fetch('/api/settings-hub', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: updated })
      });
      setTeams(updated);
      setShowCreateModal(false);
      setNewTeam({ name: '', code: '', leadName: '', leadMobile: '', campaigns: 'Facebook Meta Lead Ads' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (code) => {
    const updated = teams.filter(t => t.code !== code);
    setTeams(updated);
    await fetch('/api/settings-hub', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: updated })
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Sales Teams & Regional Hierarchy"
        subtitle="Structure regional telecalling teams, assign Team Leads & link Meta ad campaigns"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {/* Top Summary Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Active Sales Teams</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{teams.length} Teams</h3>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Total Telecallers</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{telecallers.length} Agents</h3>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Create New Sales Team
          </button>
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            Loading sales teams...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teams.map((t, i) => {
              const members = telecallers.filter(tc => (tc.team || '').toLowerCase() === t.name.toLowerCase());
              return (
                <div key={t.code || i} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200/80 uppercase tracking-wider">
                          {t.code}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-2">{t.name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteTeam(t.code)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Delete Team"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Team Lead */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
                          TL
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Team Lead</p>
                          <p className="text-xs font-bold text-slate-900">{t.leadName || 'Assigned Lead'}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                        Active
                      </span>
                    </div>

                    {/* Members */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 flex items-center justify-between">
                        <span>Assigned Telecallers ({members.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {members.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Available for agent assignment</span>
                        ) : (
                          members.map((m) => (
                            <span key={m._id} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 border border-slate-200/60">
                              <span className={`w-1.5 h-1.5 rounded-full ${m.shift_status === 'Clocked In' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              {m.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Linked Campaigns */}
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Routed Campaigns</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(t.campaigns || []).map((c, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold text-slate-900">Create New Sales Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Enter sales team name"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Team Code</label>
                  <input
                    type="text"
                    value={newTeam.code}
                    onChange={e => setNewTeam({ ...newTeam, code: e.target.value })}
                    placeholder="Optional team code"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Team Lead Name</label>
                  <input
                    type="text"
                    value={newTeam.leadName}
                    onChange={e => setNewTeam({ ...newTeam, leadName: e.target.value })}
                    placeholder="Optional team lead"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Linked Campaigns (comma separated)</label>
                <input
                  type="text"
                  value={newTeam.campaigns}
                  onChange={e => setNewTeam({ ...newTeam, campaigns: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
              >
                {saving ? 'Saving...' : 'Create Sales Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
