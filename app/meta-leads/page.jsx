"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import Link from 'next/link';
import {
  RefreshCw,
  Search,
  Loader2,
  User,
  Phone,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
  GitFork,
  MessageCircle,
  ShieldAlert,
  CheckCircle2,
  Settings
} from 'lucide-react';

const STATUS_COLORS = {
  'Fresh Lead': 'bg-blue-50 text-blue-700 border-blue-200',
  'Assigned': 'bg-blue-50 text-blue-700 border-blue-200',
  'Follow Up': 'bg-amber-50 text-amber-700 border-amber-200',
  'Callback': 'bg-amber-50 text-amber-700 border-amber-200',
  'Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Distributor Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Trader Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Not Connected': 'bg-slate-100 text-slate-600 border-slate-200',
  'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-rose-50 text-rose-600 border-rose-200',
};

export default function MetaLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [kpis, setKpis] = useState({
    total: 0,
    todayCount: 0,
    assignedCount: 0,
    unassignedCount: 0,
    convertedCount: 0,
    zeroLossCount: 0
  });
  const [telecallers, setTelecallers] = useState([]);
  const [metaForms, setMetaForms] = useState([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [callerFilter, setCallerFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [redistributing, setRedistributing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 5000);
  };

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '25' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (campaignFilter) params.set('campaign', campaignFilter);
      if (callerFilter) params.set('callerId', callerFilter);

      const res = await fetch(`/api/meta/leads?${params}`);
      const data = await res.json();

      if (data.leads) {
        setLeads(data.leads);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.kpis) setKpis(data.kpis);
        if (data.telecallers) setTelecallers(data.telecallers);
        if (data.metaForms) setMetaForms(data.metaForms);
        setLastRefresh(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, campaignFilter, callerFilter]);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 10000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, campaignFilter, callerFilter]);

  const handleSyncFromMetaForm = async () => {
    setSyncing(true);
    try {
      const targetForm = metaForms[0]?.formId || '';
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_FORM_LEADS', formId: targetForm, count: 2 })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Synced ${data.syncedCount} new leads from "${data.formName}" and auto-assigned to telecallers!`);
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleRedistributeUnassigned = async () => {
    setRedistributing(true);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REDISTRIBUTE_UNASSIGNED' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRedistributing(false);
    }
  };

  const handleInlineAssign = async (leadId, assigned_to) => {
    setUpdatingId(leadId);
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, assigned_to })
      });
      fetchLeads();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInlineStatus = async (leadId, status) => {
    setUpdatingId(leadId);
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status })
      });
      fetchLeads();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Live Lead Capture Stream"
        subtitle="Real-time Facebook & Instagram Lead Ads ingestion, form field mapping & instant telecaller distribution"
      />

      <main className="p-6 lg:p-8 space-y-5 flex-1">
        {banner && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{banner}</span>
            </div>
            <button onClick={() => setBanner(null)} className="text-emerald-700 underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Executive Meta KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Meta Leads</p>
            <p className="text-2xl font-heading font-extrabold text-slate-900 mt-1 tabular-nums">{kpis.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Captured Today</p>
            <p className="text-2xl font-heading font-extrabold text-blue-700 mt-1 tabular-nums">{kpis.todayCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Auto-Assigned</p>
            <p className="text-2xl font-heading font-extrabold text-indigo-700 mt-1 tabular-nums">{kpis.assignedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Unassigned Queue</p>
            <p className="text-2xl font-heading font-extrabold text-amber-700 mt-1 tabular-nums">{kpis.unassignedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Closed Deals</p>
            <p className="text-2xl font-heading font-extrabold text-emerald-700 mt-1 tabular-nums">{kpis.convertedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">Zero-Loss Urgent</p>
            <p className="text-2xl font-heading font-extrabold text-rose-700 mt-1 tabular-nums">{kpis.zeroLossCount}</p>
          </div>
        </div>

        {/* Filters & Meta Form Sync Action Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, phone, L-1001..."
                className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
            >
              <option value="">All Dispositions</option>
              {Object.keys(STATUS_COLORS).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <select
              value={callerFilter}
              onChange={e => setCallerFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
            >
              <option value="">All Telecallers</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {telecallers.map(tc => (
                <option key={tc._id} value={tc._id}>{tc.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {kpis.unassignedCount > 0 && (
              <button
                onClick={handleRedistributeUnassigned}
                disabled={redistributing}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <GitFork size={14} /> Route {kpis.unassignedCount} Unassigned
              </button>
            )}

            <button
              onClick={handleSyncFromMetaForm}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Sync Form Leads
            </button>

            <Link
              href="/settings"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Settings size={14} /> OAuth & Form Setup
            </Link>

            <button
              onClick={() => { setLoading(true); fetchLeads(); }}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer transition-colors"
              title={lastRefresh ? `Updated ${timeAgo(lastRefresh)}` : 'Refresh'}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Meta Leads Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading && leads.length === 0 ? (
            <div className="p-14 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={24} className="animate-spin mb-3 text-blue-600" />
              <p className="text-xs font-semibold">Loading Meta leads from MongoDB...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-14 text-center text-slate-400">
              <Zap size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No Meta leads match the filter</p>
              <p className="text-xs mt-1">Click &ldquo;Sync Form Leads&rdquo; or &ldquo;Test Meta Lead Capture&rdquo; in the header to ingest leads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/80">
                    <th className="py-3.5 px-5">Lead ID & Campaign</th>
                    <th className="py-3.5 px-4">Prospect & Business</th>
                    <th className="py-3.5 px-4">Mobile & WhatsApp</th>
                    <th className="py-3.5 px-4">Location & Product</th>
                    <th className="py-3.5 px-4">Pipeline Disposition</th>
                    <th className="py-3.5 px-4">Assigned Telecaller</th>
                    <th className="py-3.5 px-5 text-right">Captured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leads.map((lead) => {
                    const isUrgent = lead.tags?.includes('Urgent');
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600 tabular-nums">{lead.leadId}</span>
                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold">
                                <ShieldAlert size={10} /> ZERO-LOSS
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate max-w-[170px]">
                            {lead.campaignName}
                          </p>
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-900 text-sm">{lead.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{lead.businessType}</p>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 tabular-nums">+91 {lead.mobile}</span>
                            <a
                              href={`https://wa.me/91${String(lead.mobile).slice(-10)}?text=${encodeURIComponent(`Namaste ${lead.name} ji, KisanConnect Meta Inquiry regarding ${lead.productInterest}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                              title="Open WhatsApp Chat"
                            >
                              <MessageCircle size={13} />
                            </a>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800">{lead.productInterest}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {lead.city || 'Indore'}{lead.state ? `, ${lead.state}` : ''}
                          </p>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <select
                            value={lead.status}
                            disabled={updatingId === lead.id}
                            onChange={(e) => handleInlineStatus(lead.id, e.target.value)}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-600'}`}
                          >
                            {Object.keys(STATUS_COLORS).map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <select
                            value={lead.assignedToId || ''}
                            disabled={updatingId === lead.id}
                            onChange={(e) => handleInlineAssign(lead.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Unassigned</option>
                            {telecallers.map(tc => (
                              <option key={tc._id} value={tc._id}>{tc.name}</option>
                            ))}
                          </select>
                        </td>

                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <span className="text-xs font-medium text-slate-500 tabular-nums">{timeAgo(lead.createdAt)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500">
                Page <span className="font-extrabold text-slate-900 tabular-nums">{page}</span> of{' '}
                <span className="font-extrabold text-slate-900 tabular-nums">{totalPages}</span> •{' '}
                <span className="font-extrabold text-slate-900 tabular-nums">{total}</span> Meta leads
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
