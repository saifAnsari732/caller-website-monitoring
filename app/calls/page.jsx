"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  PhoneCall,
  Calendar,
  Clock,
  PlayCircle,
  PauseCircle,
  Search,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  User
} from 'lucide-react';

const OUTCOME_BADGE = {
  'Interested': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Distributor Interested': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Trader Interested': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Follow Up': 'text-amber-700 bg-amber-50 border-amber-200',
  'Callback': 'text-amber-700 bg-amber-50 border-amber-200',
  'Connected': 'text-blue-700 bg-blue-50 border-blue-200',
  'Closed': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Not Connected': 'text-slate-600 bg-slate-100 border-slate-200',
  'Wrong Number': 'text-rose-700 bg-rose-50 border-rose-200',
  'Rejected': 'text-rose-700 bg-rose-50 border-rose-200',
};

export default function CallsPage() {
  const [summaryData, setSummaryData] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [callerFilter, setCallerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState(null);

  // Click-to-Call Dialer Modal
  const [showDialModal, setShowDialModal] = useState(false);
  const [dialForm, setDialForm] = useState({
    leadId: '',
    callerId: '',
    duration: 135,
    status: 'Interested',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCalls = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (callerFilter) params.set('callerId', callerFilter);
      if (dateFilter) params.set('date', dateFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/calls?${params.toString()}`);
      const data = await res.json();
      if (data.summaryData) setSummaryData(data.summaryData);
      if (data.callLogs) setCallLogs(data.callLogs);
      if (data.telecallers) setTelecallers(data.telecallers);
      if (data.leads) setLeads(data.leads);
    } catch (e) {
      console.error('Calls fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [callerFilter, dateFilter, search]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleLogDialerCall = async (e) => {
    e.preventDefault();
    if (!dialForm.leadId || !dialForm.callerId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dialForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowDialModal(false);
        setDialForm({ leadId: '', callerId: '', duration: 135, status: 'Interested', notes: '' });
        fetchCalls();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Call Monitoring & Dispositions"
        subtitle="Real-time call logs, agent talk-time breakdown, disposition outcomes & audio playback"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {/* Top Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
              />
            </div>

            <select
              value={callerFilter}
              onChange={(e) => setCallerFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 min-w-[180px] cursor-pointer"
            >
              <option value="">All Telecallers</option>
              {telecallers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {(callerFilter || dateFilter || search) && (
              <button
                onClick={() => { setCallerFilter(''); setDateFilter(''); setSearch(''); }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => { setLoading(true); fetchCalls(); }}
              className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Call Logs"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => {
                setDialForm({
                  leadId: leads[0]?.id || '',
                  callerId: telecallers[0]?.id || '',
                  duration: 140,
                  status: 'Interested',
                  notes: 'Client inquired about bulk 15L Mustard Oil tins rate list.'
                });
                setShowDialModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <PhoneCall size={15} /> Log Click-to-Call Disposition
            </button>
          </div>
        </div>

        {/* Agent Call Summary Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Telecaller Talk-Time & Connectivity Summary</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Aggregated directly from MongoDB Call documents</p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {callLogs.length} Total Calls Logged
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Period</th>
                  <th className="py-3.5 px-6">Telecaller</th>
                  <th className="py-3.5 px-6">Total Calls Dialed</th>
                  <th className="py-3.5 px-6">Connected Calls</th>
                  <th className="py-3.5 px-6">Connectivity Rate</th>
                  <th className="py-3.5 px-6">Total Talk Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {summaryData.map((row, idx) => {
                  const connRate = row.total > 0 ? Math.round((row.connected / row.total) * 100) : 0;
                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 text-slate-500 font-medium">{row.date}</td>
                      <td className="py-3.5 px-6 text-slate-900 font-semibold flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center justify-center border border-blue-200/60">
                          {row.name?.[0] || 'T'}
                        </div>
                        <span>{row.name}</span>
                      </td>
                      <td className="py-3.5 px-6 font-bold tabular-nums text-slate-900">{row.total}</td>
                      <td className="py-3.5 px-6 font-bold tabular-nums text-emerald-600">{row.connected}</td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
                          {connRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-700 font-semibold tabular-nums">{row.duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Call Logs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Detailed Call Disposition & Recording Log</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Every mobile & web call synced with lead timeline</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lead, phone, agent, notes..."
                className="pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Call ID & Time</th>
                  <th className="py-3.5 px-6">Telecaller</th>
                  <th className="py-3.5 px-6">Lead / Prospect</th>
                  <th className="py-3.5 px-6">Disposition</th>
                  <th className="py-3.5 px-6">Duration</th>
                  <th className="py-3.5 px-6">Audio Playback</th>
                  <th className="py-3.5 px-6">Call Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <Loader2 size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                      Loading call history...
                    </td>
                  </tr>
                ) : callLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                      No calls match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  callLogs.map((log) => {
                    const isPlaying = playingId === log.rawId;
                    return (
                      <tr key={log.rawId || log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block tabular-nums">{log.id}</span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> {log.time}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User size={13} className="text-blue-600" />
                            <span>{log.agent}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-slate-900">{log.leadName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                            {log.leadId ? `${log.leadId} • ` : ''}+91 {log.leadMobile}
                          </p>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${OUTCOME_BADGE[log.outcome] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="font-bold text-slate-800 tabular-nums">{log.duration}</span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {log.durationSec > 0 ? (
                            <button
                              onClick={() => setPlayingId(isPlaying ? null : log.rawId)}
                              className={`flex items-center gap-2 rounded-full px-3 py-1.5 border text-[11px] font-semibold transition-all cursor-pointer ${
                                isPlaying
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border-slate-200'
                              }`}
                            >
                              {isPlaying ? <PauseCircle size={15} className="text-blue-600" /> : <PlayCircle size={15} className="text-blue-600" />}
                              <div className="w-14 h-1.5 bg-slate-300 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${isPlaying ? 'w-3/4 bg-blue-600 animate-pulse' : 'w-1/3 bg-blue-600'}`} />
                              </div>
                              <span className="tabular-nums">{log.duration}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">Unanswered (0s)</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-600 max-w-[240px] truncate font-medium" title={log.notes}>
                          {log.notes}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Click-to-Call Disposition Modal */}
      {showDialModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button
              onClick={() => setShowDialModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900">Log Call & Lead Disposition</h3>
              <p className="text-xs text-slate-500 font-medium">Saves call record to MongoDB and updates lead status automatically</p>
            </div>
            <form onSubmit={handleLogDialerCall} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Prospect Lead *</label>
                <select
                  required
                  value={dialForm.leadId}
                  onChange={e => setDialForm({ ...dialForm, leadId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.lead_id} — {l.name} (+91 {l.mobile})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Telecaller Agent *</label>
                <select
                  required
                  value={dialForm.callerId}
                  onChange={e => setDialForm({ ...dialForm, callerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {telecallers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.team || 'Sales'})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Call Outcome</label>
                  <select
                    value={dialForm.status}
                    onChange={e => setDialForm({ ...dialForm, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Interested">Interested</option>
                    <option value="Distributor Interested">Distributor Interested</option>
                    <option value="Trader Interested">Trader Interested</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Callback">Callback</option>
                    <option value="Connected">Connected</option>
                    <option value="Closed">Closed (Deal Won)</option>
                    <option value="Not Connected">Not Connected</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    value={dialForm.duration}
                    onChange={e => setDialForm({ ...dialForm, duration: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Conversation Summary / Notes</label>
                <textarea
                  rows={3}
                  value={dialForm.notes}
                  onChange={e => setDialForm({ ...dialForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Enter client discussion notes..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Save Call Disposition
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
