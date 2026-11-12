"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  UserCheck,
  UserPlus,
  Eye,
  Clock,
  X,
  Trophy,
  History,
  Award,
  Loader2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export default function TelecallerManagementPage() {
  const [activeTab, setActiveTab] = useState('ROSTER');
  const [telecallers, setTelecallers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaller, setSelectedCaller] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    mobile: '',
    team: 'North Region Sales',
    targetCalls: 50,
    targetConversions: 5,
    password: ''
  });

  const fetchTelecallers = useCallback(async () => {
    try {
      const res = await fetch('/api/telecallers');
      const data = await res.json();
      if (data.telecallers) setTelecallers(data.telecallers);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelecallers();
  }, [fetchTelecallers]);

  const handleToggleAccountStatus = async (caller) => {
    try {
      await fetch('/api/telecallers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: caller.id,
          status: caller.active ? 'disabled' : 'active'
        })
      });
      fetchTelecallers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShiftChange = async (id, shift_status) => {
    try {
      await fetch('/api/telecallers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, shift_status })
      });
      fetchTelecallers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!newAgent.name || !newAgent.mobile || !newAgent.password) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/telecallers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewAgent({
          name: '',
          email: '',
          mobile: '',
          team: 'North Region Sales',
          targetCalls: 50,
          targetConversions: 5,
          password: ''
        });
        fetchTelecallers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Telecaller Roster & Shift Control"
        subtitle="Onboard telecallers, manage shift attendance, track daily call targets & inspect live audit logs"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl flex-wrap">
            {[
              { id: 'ROSTER', label: `Agents & Targets (${telecallers.length})`, icon: UserCheck },
              { id: 'ATTENDANCE', label: 'Shift & Attendance', icon: Clock },
              { id: 'LEADERBOARD', label: 'Leaderboard', icon: Trophy },
              { id: 'AUDIT', label: 'Live Audit Log', icon: History }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); fetchTelecallers(); }}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus size={15} /> Onboard New Telecaller
            </button>
          </div>
        </div>

        {/* TAB 1: ROSTER & TARGETS */}
        {activeTab === 'ROSTER' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100">
                    <th className="p-4 pl-6">Telecaller & Team</th>
                    <th className="p-4">Floor Status</th>
                    <th className="p-4">Assigned Leads</th>
                    <th className="p-4">Daily Call Target</th>
                    <th className="p-4">Conversion Target</th>
                    <th className="p-4">Access State</th>
                    <th className="p-4 pr-6 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <Loader2 size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                        Loading telecallers from MongoDB...
                      </td>
                    </tr>
                  ) : (
                    telecallers.map((t) => {
                      const callProgressPct = Math.min(100, Math.round((t.todaysCalls / (t.targetCalls || 50)) * 100));
                      const convProgressPct = Math.min(100, Math.round((t.closed / (t.targetConversions || 5)) * 100));
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-all">
                          <td className="p-4 pl-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200/80">
                              {t.name?.[0] || 'T'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {t.name}
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                                  {t.employee_id || 'EMP'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium">+91 {t.mobile} â€¢ {t.team}</div>
                            </div>
                          </td>

                          <td className="p-4">
                            <select
                              value={t.shiftStatus === 'On Leave' ? 'Clocked Out' : t.shiftStatus}
                              onChange={(e) => handleShiftChange(t.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                                t.status === 'Online'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <option value="Clocked In">Clocked In (Online)</option>
                              <option value="On Break">On Break</option>
                              <option value="Clocked Out">Clocked Out</option>
                            </select>
                          </td>

                          <td className="p-4 font-extrabold text-slate-800 tabular-nums">
                            {t.assignedLeads || 0} Leads
                          </td>

                          <td className="p-4">
                            <div className="space-y-1 w-36">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span>{t.todaysCalls} / {t.targetCalls}</span>
                                <span className="text-slate-400">{callProgressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${callProgressPct}%` }}></div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-1 w-36">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span>{t.closed} / {t.targetConversions} deals</span>
                                <span className="text-slate-400">{convProgressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${convProgressPct}%` }}></div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => handleToggleAccountStatus(t)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                t.active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {t.active ? 'Active' : 'Disabled'}
                            </button>
                          </td>

                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => setSelectedCaller(t)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold transition-all cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SHIFT & ATTENDANCE */}
        {activeTab === 'ATTENDANCE' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Today&apos;s Telecaller Shift Attendance Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100">
                    <th className="p-3.5 pl-4">Telecaller</th>
                    <th className="p-3.5">Team</th>
                    <th className="p-3.5">Shift Status</th>
                    <th className="p-3.5">Clock-In Time</th>
                    <th className="p-3.5">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {telecallers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 pl-4 font-bold text-slate-900">{t.name}</td>
                      <td className="p-3.5 text-slate-500">{t.team}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          t.shiftStatus === 'Clocked In' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.shiftStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-800">{t.loginTime}</td>
                      <td className="p-3.5 font-bold text-emerald-600">{t.lastActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'LEADERBOARD' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Award size={24} className="text-amber-500" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Telecaller Performance Leaderboard</h3>
                <p className="text-xs text-slate-500">Ranked by closed deals and connected calls</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[...telecallers].sort((a, b) => (b.closed - a.closed) || (b.todaysCalls - a.todaysCalls)).map((agent, index) => (
                <div key={agent.id} className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center ${
                      index === 0 ? 'bg-amber-400 text-slate-900 shadow-xs' : index === 1 ? 'bg-slate-300 text-slate-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{agent.team}</span>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{agent.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{agent.todaysCalls} Calls â€¢ {agent.connected} Connected â€¢ Avg {agent.avgCallDurationSec}s</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold">
                    <span>Closed Deals: <strong className="text-emerald-600 text-sm">{agent.closed}</strong></span>
                    <span className="text-purple-600">Interested: {agent.interested}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOG */}
        {activeTab === 'AUDIT' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Real-Time Agent Activity Audit Log</h3>
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">{log.agent}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] rounded-md">{log.action}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1">{log.details}</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Telecaller Profile Modal */}
        {selectedCaller && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative border border-slate-200">
              <button onClick={() => setSelectedCaller(null)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
                <X size={16} />
              </button>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{selectedCaller.team}</span>
                <h3 className="text-lg font-extrabold text-slate-900">{selectedCaller.name}</h3>
                <p className="text-xs text-slate-500">+91 {selectedCaller.mobile} â€¢ {selectedCaller.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <p className="text-slate-400 font-semibold">Assigned Leads</p>
                  <p className="text-lg font-extrabold text-slate-900">{selectedCaller.assignedLeads}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Calls Logged</p>
                  <p className="text-lg font-extrabold text-blue-600">{selectedCaller.todaysCalls}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Interested Pipeline</p>
                  <p className="text-lg font-extrabold text-purple-600">{selectedCaller.interested}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Closed Won Deals</p>
                  <p className="text-lg font-extrabold text-emerald-600">{selectedCaller.closed}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboard New Agent Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative border border-slate-200">
              <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
                <X size={16} />
              </button>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Onboard New Telecaller Agent</h3>
                <p className="text-xs text-slate-500">Creates mobile app login credentials & adds to Round-Robin pool</p>
              </div>
              <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newAgent.name}
                    onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    placeholder="Enter telecaller full name"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Number (Login ID) *</label>
                  <input
                    type="text"
                    required
                    value={newAgent.mobile}
                    onChange={e => setNewAgent({ ...newAgent, mobile: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Login Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newAgent.password}
                    onChange={e => setNewAgent({ ...newAgent, password: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    placeholder="Set login password (min 6 characters)"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Sales Team</label>
                  <input
                    type="text"
                    value={newAgent.team}
                    onChange={e => setNewAgent({ ...newAgent, team: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    placeholder="North Region Sales"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Daily Call Target</label>
                    <input
                      type="number"
                      value={newAgent.targetCalls}
                      onChange={e => setNewAgent({ ...newAgent, targetCalls: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Deals</label>
                    <input
                      type="number"
                      value={newAgent.targetConversions}
                      onChange={e => setNewAgent({ ...newAgent, targetConversions: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Create Telecaller Account
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
