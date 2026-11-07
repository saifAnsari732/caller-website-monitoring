"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageCircle,
  Plus,
  Loader2,
  X,
  RefreshCw
} from 'lucide-react';

export default function FollowupsPage() {
  const [kpis, setKpis] = useState({ dueToday: 0, overdue: 0, upcoming: 0, completed: 0 });
  const [followups, setFollowups] = useState([]);
  const [leads, setLeads] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBucket, setActiveBucket] = useState('ALL');
  const [togglingId, setTogglingId] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newFollowup, setNewFollowup] = useState({
    leadId: '',
    callerId: '',
    date: new Date().toISOString().split('T')[0],
    time: '11:30 AM',
    notes: 'Callback regarding 15L Mustard Oil wholesale quotation'
  });

  const fetchFollowups = useCallback(async () => {
    try {
      const res = await fetch('/api/followups');
      const data = await res.json();
      if (data.kpis) setKpis(data.kpis);
      if (data.followups) setFollowups(data.followups);
      if (data.leads) setLeads(data.leads);
      if (data.telecallers) setTelecallers(data.telecallers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const handleToggleComplete = async (item) => {
    setTogglingId(item.id);
    try {
      await fetch('/api/followups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, completed: !item.completed })
      });
      fetchFollowups();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateFollowup = async (e) => {
    e.preventDefault();
    if (!newFollowup.leadId || !newFollowup.callerId) return;
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFollowup)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchFollowups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = activeBucket === 'ALL'
    ? followups
    : followups.filter(f => f.bucket === activeBucket);

  const badgeStyles = {
    'Overdue': 'text-rose-700 bg-rose-50 border-rose-200',
    'Due Today': 'text-blue-700 bg-blue-50 border-blue-200',
    'Upcoming': 'text-amber-700 bg-amber-50 border-amber-200',
    'Completed': 'text-emerald-700 bg-emerald-50 border-emerald-200'
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Follow-up & Callback Hub"
        subtitle="Track today's callbacks, overdue SLA alerts, upcoming schedules, and completed follow-ups in real time"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveBucket('TODAY')}
            className={`bg-white rounded-2xl border p-5 shadow-xs cursor-pointer transition-all ${
              activeBucket === 'TODAY' ? 'border-blue-600 ring-2 ring-blue-500/15' : 'border-slate-200/80 hover:border-blue-300'
            }`}
          >
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> DUE TODAY
            </p>
            <h2 className="text-3xl font-heading font-extrabold text-slate-900 tabular-nums">{kpis.dueToday}</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Callbacks Scheduled Today</p>
          </div>

          <div
            onClick={() => setActiveBucket('OVERDUE')}
            className={`bg-white rounded-2xl border p-5 shadow-xs cursor-pointer transition-all ${
              activeBucket === 'OVERDUE' ? 'border-rose-600 ring-2 ring-rose-500/15' : 'border-slate-200/80 hover:border-rose-300'
            }`}
          >
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span> ATTENTION NEEDED
            </p>
            <h2 className="text-3xl font-heading font-extrabold text-rose-600 tabular-nums">{kpis.overdue}</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Overdue Follow-ups</p>
          </div>

          <div
            onClick={() => setActiveBucket('UPCOMING')}
            className={`bg-white rounded-2xl border p-5 shadow-xs cursor-pointer transition-all ${
              activeBucket === 'UPCOMING' ? 'border-amber-600 ring-2 ring-amber-500/15' : 'border-slate-200/80 hover:border-amber-300'
            }`}
          >
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> SCHEDULED
            </p>
            <h2 className="text-3xl font-heading font-extrabold text-slate-900 tabular-nums">{kpis.upcoming}</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Upcoming Callbacks</p>
          </div>

          <div
            onClick={() => setActiveBucket('COMPLETED')}
            className={`bg-white rounded-2xl border p-5 shadow-xs cursor-pointer transition-all ${
              activeBucket === 'COMPLETED' ? 'border-emerald-600 ring-2 ring-emerald-500/15' : 'border-slate-200/80 hover:border-emerald-300'
            }`}
          >
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> COMPLETED
            </p>
            <h2 className="text-3xl font-heading font-extrabold text-emerald-600 tabular-nums">{kpis.completed}</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Finished Follow-ups</p>
          </div>
        </div>

        {/* Live Follow-up Schedule Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'ALL', label: `All (${followups.length})` },
                { key: 'TODAY', label: `Due Today (${kpis.dueToday})` },
                { key: 'OVERDUE', label: `Overdue (${kpis.overdue})` },
                { key: 'UPCOMING', label: `Upcoming (${kpis.upcoming})` },
                { key: 'COMPLETED', label: `Completed (${kpis.completed})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveBucket(tab.key)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeBucket === tab.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setLoading(true); fetchFollowups(); }}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer transition-colors"
                title="Refresh Follow-ups"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => {
                  setNewFollowup({
                    leadId: leads[0]?.id || '',
                    callerId: telecallers[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    time: '02:30 PM',
                    notes: 'Follow-up on bulk Mustard Oil 15L tin order'
                  });
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus size={15} /> Schedule Follow-up
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Client / Firm</th>
                  <th className="py-3.5 px-6">Assigned Telecaller</th>
                  <th className="py-3.5 px-6">Scheduled Date & Time</th>
                  <th className="py-3.5 px-6">Callback Notes</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <Loader2 size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                      Loading follow-ups...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                      No follow-ups in this bucket.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-900 text-sm">{item.client}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.leadCode} • +91 {item.mobile} • {item.city}
                        </p>
                      </td>
                      <td className="py-4 px-6 font-semibold text-blue-600 whitespace-nowrap">{item.agent}</td>
                      <td className="py-4 px-6 font-semibold text-slate-700 tabular-nums whitespace-nowrap">{item.time}</td>
                      <td className="py-4 px-6 text-slate-600 max-w-xs truncate font-medium">{item.notes}</td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeStyles[item.status] || 'bg-slate-100 text-slate-600'}`}>
                          {(item.status === 'Overdue' || item.status === 'Due Today') && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {item.mobile && (
                            <a
                              href={`https://wa.me/91${String(item.mobile).slice(-10)}?text=${encodeURIComponent(`Namaste ${item.client} ji, KisanConnect follow-up reminder.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                              title="Send WhatsApp Follow-up"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => handleToggleComplete(item)}
                            disabled={togglingId === item.id}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                              item.completed
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            {item.completed ? 'Reopen' : 'Mark Done'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Schedule Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900">Schedule New Follow-up</h3>
              <p className="text-xs text-slate-500 font-medium">Syncs immediately with telecaller mobile app callback queue</p>
            </div>
            <form onSubmit={handleCreateFollowup} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Lead *</label>
                <select
                  required
                  value={newFollowup.leadId}
                  onChange={e => setNewFollowup({ ...newFollowup, leadId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.lead_id} — {l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Telecaller *</label>
                <select
                  required
                  value={newFollowup.callerId}
                  onChange={e => setNewFollowup({ ...newFollowup, callerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {telecallers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newFollowup.date}
                    onChange={e => setNewFollowup({ ...newFollowup, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={newFollowup.time}
                    onChange={e => setNewFollowup({ ...newFollowup, time: e.target.value })}
                    placeholder="02:30 PM"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Follow-up Agenda / Notes</label>
                <input
                  type="text"
                  value={newFollowup.notes}
                  onChange={e => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Save Follow-up Schedule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
