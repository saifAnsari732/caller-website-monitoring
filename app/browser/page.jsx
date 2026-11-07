"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import {
  Globe,
  FileText,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Users,
  Phone,
  MapPin,
  Layers,
  ArrowUpRight,
  Copy,
  Check,
  X,
  UserCheck,
  Database,
  Inbox
} from 'lucide-react';

export default function BrowserPage() {
  const [forms, setForms] = useState([]);
  const [totalDbMetaLeads, setTotalDbMetaLeads] = useState(0);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [browserData, setBrowserData] = useState(null);

  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [syncingForm, setSyncingForm] = useState(false);
  const [ingestingId, setIngestingId] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [banner, setBanner] = useState(null);

  // Directory filters (left rail)
  const [formSearch, setFormSearch] = useState('');
  const [formFilter, setFormFilter] = useState('ALL'); // ALL | WITH_LEADS | ACTIVE

  // Responses table filters (right panel)
  const [leadSearch, setLeadSearch] = useState('');
  const [crmFilter, setCrmFilter] = useState('ALL'); // ALL | SYNCED | UNSYNCED

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 5000);
  };

  // 1. Fetch all real forms (sorted with leads first by API)
  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/forms');
      const data = await res.json();
      if (Array.isArray(data.forms)) {
        setForms(data.forms);
        setTotalDbMetaLeads(Number(data.totalDbMetaLeads) || 0);
        setSelectedFormId((prev) => {
          if (prev) return prev;
          const firstWithLeads = data.forms.find((f) => (f.leadsCount || 0) > 0);
          return firstWithLeads ? firstWithLeads.id : 'ALL';
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForms(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // 2. Fetch leads for selected form (or ALL)
  const fetchFormLeads = useCallback(async (formId) => {
    if (!formId) return;
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/browser?formId=${encodeURIComponent(formId)}&limit=120`);
      const data = await res.json();
      setBrowserData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFormId) {
      fetchFormLeads(selectedFormId);
    }
  }, [selectedFormId, fetchFormLeads]);

  const selectedForm = useMemo(() => {
    if (selectedFormId === 'ALL') {
      return {
        id: 'ALL',
        name: 'All Connected Meta Forms',
        status: 'ACTIVE',
        leadsCount: totalDbMetaLeads,
        assignedTeam: 'All Regional Teams',
        questions: []
      };
    }
    return forms.find((f) => String(f.id) === String(selectedFormId)) || null;
  }, [forms, selectedFormId, totalDbMetaLeads]);

  // Trigger live Graph API sync into MongoDB for current form (or all forms)
  const handleLiveMetaSync = async () => {
    setSyncingForm(true);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_FORM_LEADS',
          ...(selectedFormId && selectedFormId !== 'ALL' ? { formId: selectedFormId } : {}),
          count: 35
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Synced latest leads from Meta Graph API.');
        await Promise.all([fetchForms(), fetchFormLeads(selectedFormId || 'ALL')]);
      } else {
        showToast(data.error || 'Unable to sync from Meta Graph API.');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error while syncing Meta leads.');
    } finally {
      setSyncingForm(false);
    }
  };

  // Ingest single live lead into CRM MongoDB
  const handleIngestSingleLead = async (lead) => {
    setIngestingId(lead.id);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'INGEST_SINGLE_LEAD',
          formId: selectedFormId === 'ALL' ? '' : selectedFormId,
          leadData: lead
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Lead "${lead.full_name}" pushed to CRM.`);
        fetchFormLeads(selectedFormId);
        fetchForms();
      } else {
        showToast(data.error || 'Failed to push lead to CRM.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error connecting to CRM API.');
    } finally {
      setIngestingId(null);
    }
  };

  const handleCopyId = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  // Filtered forms in left directory
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      if (formFilter === 'WITH_LEADS' && !(f.leadsCount > 0)) return false;
      if (formFilter === 'ACTIVE' && f.status !== 'ACTIVE') return false;
      if (!formSearch.trim()) return true;
      const q = formSearch.toLowerCase();
      return (
        (f.name || '').toLowerCase().includes(q) ||
        String(f.id || '').includes(q)
      );
    });
  }, [forms, formFilter, formSearch]);

  // Filtered leads in right table
  const leads = browserData?.leads || [];
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (crmFilter === 'SYNCED' && !l.inCrm) return false;
      if (crmFilter === 'UNSYNCED' && l.inCrm) return false;
      if (!leadSearch.trim()) return true;
      const q = leadSearch.toLowerCase();
      return (
        (l.full_name || '').toLowerCase().includes(q) ||
        String(l.phone || '').includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.business_type || '').toLowerCase().includes(q) ||
        (l.form_name || '').toLowerCase().includes(q)
      );
    });
  }, [leads, crmFilter, leadSearch]);

  const activeFormsCount = useMemo(
    () => forms.filter((f) => f.status === 'ACTIVE').length,
    [forms]
  );
  const formsWithLeadsCount = useMemo(
    () => forms.filter((f) => (f.leadsCount || 0) > 0).length,
    [forms]
  );
  const sumFormLeads = useMemo(() => {
    const sum = forms.reduce((acc, f) => acc + (Number(f.leadsCount) || 0), 0);
    return Math.max(sum, totalDbMetaLeads);
  }, [forms, totalDbMetaLeads]);

  const getInitials = (name = '') => {
    const clean = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    if (!clean) return 'ML';
    const parts = clean.split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : clean.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Lead Forms & Live Responses Explorer"
        subtitle="Inspect all connected Facebook & Instagram Lead Ads forms for Kisan Choice, review question schemas, and audit synced CRM prospects"
      />

      <main className="px-5 lg:px-7 py-6 space-y-5 flex-1 w-full max-w-none">
        {banner && (
          <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{banner}</span>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Executive Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="crm-card p-5 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Connected Meta Forms
              </p>
              <p className="text-2xl font-heading font-extrabold text-slate-900 mt-1 tabular-nums">
                {forms.length}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                <span className="text-emerald-600 font-semibold">{activeFormsCount} Active</span> · Page: Kisan Choice
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers size={19} />
            </div>
          </div>

          <div className="crm-card p-5 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Forms Generating Leads
              </p>
              <p className="text-2xl font-heading font-extrabold text-blue-700 mt-1 tabular-nums">
                {formsWithLeadsCount}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Sorted automatically at top of directory
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText size={19} />
            </div>
          </div>

          <div className="crm-card p-5 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Captured Prospects
              </p>
              <p className="text-2xl font-heading font-extrabold text-emerald-700 mt-1 tabular-nums">
                {sumFormLeads}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {totalDbMetaLeads} stored in MongoDB CRM
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Database size={19} />
            </div>
          </div>

          <div className="crm-card p-5 flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Selected View Responses
              </p>
              <p className="text-2xl font-heading font-extrabold text-slate-900 mt-1 tabular-nums">
                {loadingLeads ? '…' : leads.length}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium truncate" title={selectedForm?.name}>
                {selectedForm?.name || 'Loading form...'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Users size={19} />
            </div>
          </div>
        </div>

        {/* Full-Width Split Workspace: Left All-Forms Directory | Right Form Responses Inspector */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT RAIL: All 42 Forms Directory */}
          <aside className="xl:col-span-4 crm-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200/80 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-blue-600" />
                  <h2 className="font-heading font-bold text-sm text-slate-900">
                    Lead Forms Directory
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold tabular-nums">
                  {filteredForms.length} / {forms.length}
                </span>
              </div>

              {/* Search across all 42 forms */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search form name or Meta ID..."
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {formSearch && (
                  <button
                    onClick={() => setFormSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Quick Directory Filters */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-xl">
                {[
                  { id: 'ALL', label: `All (${forms.length})` },
                  { id: 'WITH_LEADS', label: `With Leads (${formsWithLeadsCount})` },
                  { id: 'ACTIVE', label: `Active (${activeFormsCount})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFormFilter(tab.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      formFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned "All Connected Forms" Master Option */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setSelectedFormId('ALL')}
                className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  selectedFormId === 'ALL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedFormId === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <Layers size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">All Meta Forms Combined</div>
                    <div
                      className={`text-[11px] truncate ${
                        selectedFormId === 'ALL' ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      Unified feed across all Kisan Choice forms
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-heading font-extrabold tabular-nums shrink-0 ${
                    selectedFormId === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {totalDbMetaLeads}
                </span>
              </button>
            </div>

            {/* Scrollable List of All Forms */}
            <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100">
              {loadingForms ? (
                <div className="py-14 text-center text-xs text-slate-500 space-y-2">
                  <Loader2 size={20} className="animate-spin text-blue-600 mx-auto" />
                  <p>Loading connected Meta forms...</p>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-slate-500 space-y-2">
                  <p className="font-semibold text-slate-700">No forms match this filter</p>
                  <button
                    onClick={() => {
                      setFormFilter('ALL');
                      setFormSearch('');
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset directory filters
                  </button>
                </div>
              ) : (
                filteredForms.map((f) => {
                  const isSelected = String(f.id) === String(selectedFormId);
                  const count = Number(f.leadsCount) || 0;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormId(String(f.id))}
                      className={`w-full px-4 py-3.5 text-left transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              f.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {f.status || 'ACTIVE'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 truncate">
                            #{f.id}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-bold leading-snug line-clamp-2 ${
                            isSelected ? 'text-blue-950' : 'text-slate-900'
                          }`}
                        >
                          {f.name}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-heading font-extrabold tabular-nums ${
                            count > 0
                              ? isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-50 text-blue-700 border border-blue-200/70'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {count} {count === 1 ? 'Lead' : 'Leads'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT MAIN PANEL: Selected Form Inspector & Live Responses Table */}
          <section className="xl:col-span-8 crm-card overflow-hidden flex flex-col">
            {/* Form Detail Header */}
            <div className="p-5 lg:p-6 border-b border-slate-200/80 bg-white space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-heading font-extrabold text-lg text-slate-900">
                      {selectedForm?.name || 'Select a Lead Form'}
                    </h2>
                    {selectedForm && selectedForm.id !== 'ALL' && (
                      <button
                        onClick={() => handleCopyId(selectedForm.id)}
                        title="Copy Meta Form ID"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        <span>ID: {selectedForm.id}</span>
                        {copiedId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    )}
                    {selectedForm?.status && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          selectedForm.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {selectedForm.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedFormId === 'ALL'
                      ? 'Showing captured Meta Lead Ads prospects across all connected Kisan Choice forms'
                      : `Routing Team: ${selectedForm?.assignedTeam || 'North Region Sales'} · Live Meta Graph API + MongoDB CRM records`}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                  <button
                    onClick={() => fetchFormLeads(selectedFormId)}
                    disabled={loadingLeads}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loadingLeads ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={handleLiveMetaSync}
                    disabled={syncingForm}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {syncingForm ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    <span>Sync From Meta</span>
                  </button>

                  <Link
                    href="/meta-leads"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open Pipeline</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Search & CRM Sync Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by prospect name, mobile, city, or profile..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {leadSearch && (
                    <button
                      onClick={() => setLeadSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                  {[
                    { id: 'ALL', label: `All (${leads.length})` },
                    { id: 'SYNCED', label: `In CRM (${leads.filter((l) => l.inCrm).length})` },
                    { id: 'UNSYNCED', label: `Unsynced (${leads.filter((l) => !l.inCrm).length})` }
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setCrmFilter(pill.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        crmFilter === pill.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Question Schema Preview (when available) */}
              {selectedForm?.questions && selectedForm.questions.length > 0 && (
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Form Fields:
                  </span>
                  {selectedForm.questions.map((q) => (
                    <span
                      key={q.key}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium"
                    >
                      {q.label || q.key}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Responses Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Prospect</th>
                    <th className="py-3.5 px-4">Mobile Number</th>
                    <th className="py-3.5 px-4">City & Profile</th>
                    {selectedFormId === 'ALL' && <th className="py-3.5 px-4">Lead Form</th>}
                    <th className="py-3.5 px-4">CRM Assignment</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingLeads ? (
                    <tr>
                      <td colSpan={selectedFormId === 'ALL' ? 7 : 6} className="py-20 text-center text-slate-500">
                        <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2.5" />
                        <p className="font-semibold text-slate-700">Loading form submissions...</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Checking Meta Graph API & synced MongoDB records
                        </p>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={selectedFormId === 'ALL' ? 7 : 6} className="py-16 px-6 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                            <Inbox size={22} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-heading font-bold text-sm text-slate-900">
                              No responses in this form yet
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              This Facebook/Instagram form currently has zero submitted prospects, or no records match your search filter.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2.5 pt-1 flex-wrap">
                            <button
                              onClick={() => setSelectedFormId('ALL')}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              View All {totalDbMetaLeads} Captured Leads
                            </button>
                            <button
                              onClick={handleLiveMetaSync}
                              disabled={syncingForm}
                              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Sync From Meta Graph
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((l) => {
                      const isIngesting = ingestingId === l.id;
                      return (
                        <tr key={`${l.id}-${l.phone}`} className="hover:bg-slate-50/70 transition-colors">
                          {/* Prospect */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-heading font-bold text-[11px] flex items-center justify-center shrink-0 border border-blue-100">
                                {getInitials(l.full_name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate max-w-[200px]">
                                  {l.full_name || 'Meta Prospect'}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {l.lead_id ? l.lead_id : `ID: ${String(l.id).slice(0, 14)}`}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4">
                            {l.phone ? (
                              <a
                                href={`tel:${l.phone}`}
                                className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800 hover:text-blue-600 tabular-nums"
                              >
                                <Phone size={12} className="text-slate-400" />
                                <span>{l.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Not provided</span>
                            )}
                          </td>

                          {/* City & Profile */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 font-semibold text-slate-800">
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{l.city || l.state || 'India'}</span>
                            </div>
                            {(l.business_type || l.product_interest) && (
                              <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
                                {l.business_type || l.product_interest}
                              </div>
                            )}
                          </td>

                          {/* Lead Form (only when viewing ALL) */}
                          {selectedFormId === 'ALL' && (
                            <td className="py-3.5 px-4">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] max-w-[160px] truncate">
                                {l.form_name || l.campaign_name || 'Meta Lead Form'}
                              </span>
                            </td>
                          )}

                          {/* CRM Status & Assigned Telecaller */}
                          <td className="py-3.5 px-4">
                            {l.inCrm ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold">
                                  <CheckCircle2 size={11} />
                                  <span>{l.crmStatus || 'Synced'}</span>
                                </span>
                                {l.assignedCaller && (
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                    <UserCheck size={11} className="text-slate-400" />
                                    <span className="truncate max-w-[130px]">{l.assignedCaller}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                                Not in CRM
                              </span>
                            )}
                          </td>

                          {/* Submitted Time */}
                          <td className="py-3.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                            {l.created_time
                              ? new Date(l.created_time).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              {l.inbox_url && (
                                <a
                                  href={l.inbox_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                                >
                                  <span>Inbox</span>
                                  <ExternalLink size={11} />
                                </a>
                              )}

                              {l.inCrm ? (
                                <Link
                                  href="/leads"
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                                >
                                  <span>Inspect</span>
                                  <ArrowUpRight size={11} />
                                </Link>
                              ) : (
                                <button
                                  onClick={() => handleIngestSingleLead(l)}
                                  disabled={isIngesting}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isIngesting ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <span>Push to CRM</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
