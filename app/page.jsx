"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import Link from 'next/link';
import {
  Users,
  PhoneCall,
  Phone,
  MessageCircle,
  TrendingUp,
  RefreshCw,
  Zap,
  ShieldAlert,
  ChevronRight,
  UserCheck,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  Download,
  Clock,
  MapPin,
  X,
  Target,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  ArrowUpDown,
  Share2
} from 'lucide-react';

const STATUS_STYLES = {
  'Fresh Lead': 'bg-sky-50 text-sky-700 border-sky-200',
  'Assigned': 'bg-blue-50 text-blue-700 border-blue-200',
  'Connected': 'bg-teal-50 text-teal-700 border-teal-200',
  'Follow Up': 'bg-amber-50 text-amber-700 border-amber-200',
  'Callback': 'bg-amber-50 text-amber-700 border-amber-200',
  'Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'Distributor Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'Trader Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'DSS Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'RSS Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'SS Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
  'Not Connected': 'bg-slate-100 text-slate-600 border-slate-200',
  'Wrong Number': 'bg-rose-50 text-rose-700 border-rose-200',
  'Rejected': 'bg-rose-50 text-rose-700 border-rose-200'
};

const ALL_STATUS_OPTIONS = [
  'Fresh Lead',
  'Assigned',
  'Interested',
  'Connected',
  'Follow Up',
  'Callback',
  'Distributor Interested',
  'Trader Interested',
  'Closed',
  'Not Connected',
  'Wrong Number',
  'Rejected'
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redistributing, setRedistributing] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [actionBanner, setActionBanner] = useState(null);
  const [activeTab, setActiveTab] = useState('LEADS'); // 'LEADS' | 'CALLERS' | 'CAMPAIGNS' | 'SLA'

  // Dashboard Leads Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [callerFilter, setCallerFilter] = useState('');
  const [quickPreset, setQuickPreset] = useState('ALL'); // 'ALL' | 'META' | 'WHATSAPP' | 'FRESH' | 'UNASSIGNED' | 'SLA' | 'HOT'

  // Bulk Selection & Assignment States
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkCallerId, setBulkCallerId] = useState('ROUND_ROBIN');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [inlineUpdatingId, setInlineUpdatingId] = useState(null);

  // Modals for 1-Click Actions
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showDialerModal, setShowDialerModal] = useState(false);
  const [dialTargetLead, setDialTargetLead] = useState(null);

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    mobile: '',
    city: 'Indore',
    business_type: 'Distributor',
    product_interest: 'Mustard Oil (15L Tin)'
  });
  const [savingLead, setSavingLead] = useState(false);

  // Dialer Form State
  const [dialerForm, setDialerForm] = useState({
    callerId: '',
    duration: 120,
    status: 'Interested',
    notes: 'Client interested in dealership & wholesale rates.'
  });
  const [savingCall, setSavingCall] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, hubRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/settings-hub')
      ]);
      const [dashJson, hubJson] = await Promise.all([
        dashRes.json(),
        hubRes.json()
      ]);
      if (!dashJson.error) setData(dashJson);
      if (hubJson.campaigns) setCampaigns(hubJson.campaigns);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 15000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  const showToast = (msg) => {
    setActionBanner(msg);
    setTimeout(() => setActionBanner(null), 5000);
  };

  const handleAutoRedistributeSLA = async () => {
    setRedistributing(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'AUTO_REDISTRIBUTE_SLA' })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Successfully re-balanced ${json.redistributedCount} uncontacted leads across active telecallers.`);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRedistributing(false);
    }
  };

  const handleSyncMetaLeads = async () => {
    setSyncingMeta(true);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_FORM_LEADS', count: 3 })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Meta Sync: Ingested ${json.syncedCount} new leads from Meta Ads & assigned to telecallers.`);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.mobile) return;
    setSavingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLeadForm,
          lead_source: 'Direct Phone / Manual CRM Entry'
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowAddLeadModal(false);
        setNewLeadForm({
          name: '',
          mobile: '',
          city: 'Indore',
          business_type: 'Distributor',
          product_interest: 'Mustard Oil (15L Tin)'
        });
        showToast(`Lead created successfully! Assigned to: ${json.lead?.assigned_to?.name || 'Telecaller'}`);
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLead(false);
    }
  };

  const openDialerForLead = (lead) => {
    setDialTargetLead(lead);
    setDialerForm({
      callerId: data?.team?.[0]?.id || '',
      duration: 135,
      status: 'Interested',
      notes: `Discussion with ${lead.name} regarding ${lead.product_interest || lead.productInterest || 'bulk orders'}.`
    });
    setShowDialerModal(true);
  };

  const handleSaveCall = async (e) => {
    e.preventDefault();
    if (!dialTargetLead?.id || !dialerForm.callerId) return;
    setSavingCall(true);
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: dialTargetLead.id,
          callerId: dialerForm.callerId,
          duration: Number(dialerForm.duration) || 60,
          status: dialerForm.status,
          notes: dialerForm.notes
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowDialerModal(false);
        showToast(`Call logged: ${dialTargetLead.name} marked as "${dialerForm.status}"`);
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCall(false);
    }
  };

  // Inline assignment from the Dashboard table
  const handleInlineAssign = async (leadId, userId) => {
    setInlineUpdatingId(leadId);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, assigned_to: userId })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Lead successfully assigned to ${json.lead?.assigned_to?.name || 'Unassigned'}!`);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInlineUpdatingId(null);
    }
  };

  // Inline status change from the Dashboard table
  const handleInlineStatus = async (leadId, newStatus) => {
    setInlineUpdatingId(leadId);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Status updated to "${newStatus}"!`);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInlineUpdatingId(null);
    }
  };

  // Bulk assignment action
  const handleBulkAssign = async () => {
    if (!bulkCallerId || selectedLeadIds.length === 0) return;
    setBulkAssigning(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          assigned_to: bulkCallerId
        })
      });
      const json = await res.json();
      if (json.success) {
        const callerName = bulkCallerId === 'ROUND_ROBIN'
          ? 'Auto Round-Robin Pool'
          : team.find(t => t.id === bulkCallerId)?.name || 'Selected Telecaller';
        showToast(`⚡ Assigned ${selectedLeadIds.length} captured leads to ${callerName}!`);
        setSelectedLeadIds([]);
        setBulkCallerId('ROUND_ROBIN');
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBulkAssigning(false);
    }
  };

  const kpis = data?.kpis || {
    totalTelecallers: 0,
    clockedIn: 0,
    totalLeads: 0,
    freshLeads: 0,
    todaysCalls: 0,
    connectedCalls: 0,
    pendingFollowups: 0,
    overdueFollowups: 0,
    interestedLeads: 0,
    closedDeals: 0,
    slaBreachCount: 0,
    conversionRate: 0
  };

  const totalCalls = kpis.todaysCalls || 0;
  const connectedCalls = kpis.connectedCalls || 0;
  const connectedPct = totalCalls > 0 ? Number(((connectedCalls / totalCalls) * 100).toFixed(1)) : 0;
  const team = data?.team || [];
  const rawRecentLeads = data?.recentLeads || [];
  const slaBreachLeads = data?.slaBreachLeads || [];

  // Available campaigns & sources for dropdown filters
  const campaignOptions = useMemo(() => {
    const set = new Set();
    if (data?.availableCampaigns) {
      data.availableCampaigns.forEach(c => set.add(c));
    }
    campaigns.forEach(c => set.add(c.name));
    rawRecentLeads.forEach(l => {
      if (l.campaign_name) set.add(l.campaign_name);
    });
    return Array.from(set).filter(Boolean);
  }, [data?.availableCampaigns, campaigns, rawRecentLeads]);

  const sourceOptions = useMemo(() => {
    const set = new Set([
      'Facebook Meta Lead Ads',
      'WhatsApp API',
      'Google Sheets',
      'Direct Phone / Manual CRM Entry'
    ]);
    if (data?.availableSources) {
      data.availableSources.forEach(s => set.add(s));
    }
    rawRecentLeads.forEach(l => {
      if (l.lead_source) set.add(l.lead_source);
    });
    return Array.from(set).filter(Boolean);
  }, [data?.availableSources, rawRecentLeads]);

  // Compute preset counts
  const presetCounts = useMemo(() => {
    return {
      ALL: rawRecentLeads.length,
      META: rawRecentLeads.filter(l => {
        const s = (l.lead_source || '').toLowerCase();
        return s.includes('meta') || s.includes('facebook');
      }).length,
      WHATSAPP: rawRecentLeads.filter(l => (l.lead_source || '').toLowerCase().includes('whatsapp')).length,
      FRESH: rawRecentLeads.filter(l => ['Fresh Lead', 'Assigned'].includes(l.status)).length,
      UNASSIGNED: rawRecentLeads.filter(l => !l.assignedTo || l.assignedTo === 'Unassigned').length,
      SLA: rawRecentLeads.filter(l => l.call_attempts === 0 && ['Fresh Lead', 'Assigned'].includes(l.status)).length,
      HOT: rawRecentLeads.filter(l => ['Interested', 'Distributor Interested', 'Trader Interested'].includes(l.status)).length
    };
  }, [rawRecentLeads]);

  // High-performance In-Memory Reactive Filtering
  const filteredLeads = useMemo(() => {
    return rawRecentLeads.filter(lead => {
      // 1. Quick Presets
      if (quickPreset === 'META') {
        const s = (lead.lead_source || '').toLowerCase();
        if (!s.includes('meta') && !s.includes('facebook')) return false;
      } else if (quickPreset === 'WHATSAPP') {
        if (!(lead.lead_source || '').toLowerCase().includes('whatsapp')) return false;
      } else if (quickPreset === 'FRESH') {
        if (!['Fresh Lead', 'Assigned'].includes(lead.status)) return false;
      } else if (quickPreset === 'UNASSIGNED') {
        if (lead.assignedTo && lead.assignedTo !== 'Unassigned') return false;
      } else if (quickPreset === 'SLA') {
        if (lead.call_attempts > 0 || !['Fresh Lead', 'Assigned'].includes(lead.status)) return false;
      } else if (quickPreset === 'HOT') {
        if (!['Interested', 'Distributor Interested', 'Trader Interested'].includes(lead.status)) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (lead.name || '').toLowerCase().includes(q);
        const matchPhone = (lead.mobile || '').includes(q);
        const matchId = (lead.lead_id || '').toLowerCase().includes(q);
        const matchCity = (lead.city || '').toLowerCase().includes(q);
        const matchCamp = (lead.campaign_name || '').toLowerCase().includes(q);
        const matchProd = (lead.product_interest || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId && !matchCity && !matchCamp && !matchProd) return false;
      }

      // 3. Source Filter
      if (sourceFilter) {
        if (!(lead.lead_source || '').toLowerCase().includes(sourceFilter.toLowerCase())) return false;
      }

      // 4. Campaign Filter
      if (campaignFilter) {
        if (lead.campaign_name !== campaignFilter && !(lead.lead_source || '').includes(campaignFilter)) return false;
      }

      // 5. Status Filter
      if (statusFilter) {
        if (lead.status !== statusFilter) return false;
      }

      // 6. Caller Filter
      if (callerFilter) {
        if (callerFilter === 'UNASSIGNED') {
          if (lead.assignedTo && lead.assignedTo !== 'Unassigned') return false;
        } else {
          if (lead.assignedToId !== callerFilter && lead.assignedTo !== callerFilter) return false;
        }
      }

      return true;
    });
  }, [rawRecentLeads, quickPreset, searchQuery, sourceFilter, campaignFilter, statusFilter, callerFilter]);

  // Bulk Selection Toggles
  const isAllFilteredSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredLeads.map(l => l.id));
      setSelectedLeadIds(selectedLeadIds.filter(id => !filteredIds.has(id)));
    } else {
      const combined = new Set([...selectedLeadIds, ...filteredLeads.map(l => l.id)]);
      setSelectedLeadIds(Array.from(combined));
    }
  };

  const toggleLeadSelection = (id) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSourceFilter('');
    setCampaignFilter('');
    setStatusFilter('');
    setCallerFilter('');
    setQuickPreset('ALL');
  };

  const isAnyFilterActive = searchQuery || sourceFilter || campaignFilter || statusFilter || callerFilter || quickPreset !== 'ALL';

  // Helper to format lead capture timestamp
  const formatCaptureTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Helper to render source badge
  const renderSourceBadge = (source) => {
    const s = String(source || '').toLowerCase();
    if (s.includes('meta') || s.includes('facebook')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          Facebook Meta Ads
        </span>
      );
    }
    if (s.includes('whatsapp')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          WhatsApp API
        </span>
      );
    }
    if (s.includes('sheet') || s.includes('google')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Google Sheets
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {source || 'Direct Entry'}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/70">
      <Header
        title="CRM Operations Command Center"
        subtitle="KISAN INDIA PVT LTD — Real-Time Telecalling, Meta Lead Capture & Sales Pipeline Hub"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {/* Action Toast / Notification Banner */}
        {actionBanner && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{actionBanner}</span>
            </div>
            <button onClick={() => setActionBanner(null)} className="text-emerald-700 underline text-xs font-semibold cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* 1. EASY-TO-USE MULTI-BUTTON ACTION HUB */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Zap size={14} className="text-blue-600" /> Quick Operations & 1-Click Action Hub
            </h3>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live MongoDB & Meta Graph v21.0
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action Button: Add Lead */}
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus size={15} /> Add New Lead
            </button>

            {/* Quick Action Button: Dial Next Lead */}
            <button
              onClick={() => {
                const nextLead = filteredLeads.find(l => l.status === 'Fresh Lead' || l.status === 'Assigned') || filteredLeads[0];
                if (nextLead) openDialerForLead(nextLead);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <PhoneCall size={15} /> Open Quick Dialer
            </button>

            {/* Sync Meta Ads Leads Button */}
            <button
              onClick={handleSyncMetaLeads}
              disabled={syncingMeta}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              {syncingMeta ? <Loader2 size={15} className="animate-spin text-blue-400" /> : <Zap size={15} className="text-amber-400" />}
              Sync Meta Ads Leads
            </button>

            {/* Follow-ups Due Today Button */}
            <Link
              href="/followups"
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <Calendar size={15} className="text-amber-600" />
              Callbacks Due Today ({kpis.pendingFollowups})
            </Link>

            {/* Re-balance SLA Stuck Leads */}
            <button
              onClick={handleAutoRedistributeSLA}
              disabled={redistributing}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              {redistributing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Auto-Distribute Stuck Leads
            </button>

            {/* Export Report CSV Button */}
            <Link
              href="/reports"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ml-auto"
            >
              <Download size={15} /> Export Excel / Reports
            </Link>
          </div>
        </div>

        {/* 2. CLEAN & CLEAR 4-METRIC KPI SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Total Leads */}
          <Link
            href="/leads"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-colors block group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Leads Ingested</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {kpis.freshLeads} Fresh in Queue
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-3xl font-heading font-extrabold text-slate-900 tabular-nums">
                {loading ? '—' : kpis.totalLeads}
              </p>
              <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-0.5">
                View All <ChevronRight size={13} />
              </span>
            </div>
          </Link>

          {/* Metric 2: Today's Calls */}
          <Link
            href="/calls"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-colors block group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today&apos;s Calls Logged</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {connectedPct}% Connected
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-3xl font-heading font-extrabold text-slate-900 tabular-nums">
                {loading ? '—' : totalCalls}
              </p>
              <span className="text-xs font-semibold text-emerald-600 group-hover:underline flex items-center gap-0.5">
                {connectedCalls} Connected <ChevronRight size={13} />
              </span>
            </div>
          </Link>

          {/* Metric 3: Qualified Prospects */}
          <Link
            href="/leads?status=Interested"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-colors block group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qualified Hot Prospects</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {kpis.closedDeals} Deals Won
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-3xl font-heading font-extrabold text-indigo-600 tabular-nums">
                {loading ? '—' : kpis.interestedLeads}
              </p>
              <span className="text-xs font-semibold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                {kpis.conversionRate}% Win Rate <ChevronRight size={13} />
              </span>
            </div>
          </Link>

          {/* Metric 4: Follow-ups & SLA Alerts */}
          <Link
            href="/followups"
            className={`bg-white p-5 rounded-2xl border shadow-xs transition-colors block group ${
              kpis.overdueFollowups > 0 ? 'border-amber-300 hover:border-amber-400' : 'border-slate-200/80 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Callbacks & SLA Alert</span>
              {kpis.overdueFollowups > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {kpis.overdueFollowups} Overdue
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  On Schedule
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-3xl font-heading font-extrabold text-slate-900 tabular-nums">
                {loading ? '—' : kpis.pendingFollowups}
              </p>
              <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-0.5">
                Callback Hub <ChevronRight size={13} />
              </span>
            </div>
          </Link>
        </div>

        {/* 3. PRIMARY OPERATIONAL WORKBENCH WITH CAPTURED LEADS & BULK OPERATIONS HUB */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Interactive Switcher Buttons Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab('LEADS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'LEADS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers size={14} />
                Live Captured Leads & Bulk Dialer ({rawRecentLeads.length})
              </button>
              <button
                onClick={() => setActiveTab('CALLERS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'CALLERS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users size={14} />
                Active Telecaller Floor ({team.length})
              </button>
              <button
                onClick={() => setActiveTab('CAMPAIGNS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'CAMPAIGNS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Target size={14} />
                Meta Campaigns ({campaigns.length})
              </button>
              {kpis.slaBreachCount > 0 && (
                <button
                  onClick={() => setActiveTab('SLA')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'SLA' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Clock size={14} />
                  Urgent SLA Waiting ({kpis.slaBreachCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setLoading(true); fetchDashboard(); }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <Link
                href="/leads"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                Open Full CRM Leads View <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* TAB 1: CAPTURED LEADS WORKBENCH WITH COMPREHENSIVE FILTERS & BULK ASSIGN BAR */}
          {activeTab === 'LEADS' && (
            <div className="flex flex-col">
              {/* TOP MULTI-FILTER CONTROL BAR */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
                {/* 1. Quick Presets Filter Pills Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Filter size={12} /> Filters:
                  </span>
                  <button
                    onClick={() => setQuickPreset('ALL')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                      quickPreset === 'ALL'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All Captured ({presetCounts.ALL})
                  </button>
                  <button
                    onClick={() => setQuickPreset('META')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      quickPreset === 'META'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    Meta Ads Leads ({presetCounts.META})
                  </button>
                  <button
                    onClick={() => setQuickPreset('WHATSAPP')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      quickPreset === 'WHATSAPP'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    WhatsApp Inbound ({presetCounts.WHATSAPP})
                  </button>
                  <button
                    onClick={() => setQuickPreset('FRESH')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      quickPreset === 'FRESH'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                    }`}
                  >
                    Fresh in Queue ({presetCounts.FRESH})
                  </button>
                  <button
                    onClick={() => setQuickPreset('UNASSIGNED')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      quickPreset === 'UNASSIGNED'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    Unassigned ({presetCounts.UNASSIGNED})
                  </button>
                  <button
                    onClick={() => setQuickPreset('HOT')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      quickPreset === 'HOT'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    ⭐ Hot / Interested ({presetCounts.HOT})
                  </button>
                </div>

                {/* 2. Detailed Filter Dropdowns & Live Search */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search prospect, phone (+91), L-ID, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Lead Source Filter Dropdown */}
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="">All Sources</option>
                    {sourceOptions.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>

                  {/* Campaign Filter Dropdown */}
                  <select
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="">All Campaigns</option>
                    {campaignOptions.map(cmp => (
                      <option key={cmp} value={cmp}>{cmp}</option>
                    ))}
                  </select>

                  {/* Status Filter Dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="">All Statuses</option>
                    {ALL_STATUS_OPTIONS.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>

                  {/* Telecaller Filter Dropdown */}
                  <select
                    value={callerFilter}
                    onChange={(e) => setCallerFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="">All Telecallers</option>
                    <option value="UNASSIGNED">Unassigned Only</option>
                    {team.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                    ))}
                  </select>

                  {/* Reset Filters Button */}
                  {isAnyFilterActive && (
                    <button
                      onClick={resetAllFilters}
                      className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X size={13} /> Reset Filters
                    </button>
                  )}

                  <span className="text-xs font-medium text-slate-400 ml-auto tabular-nums">
                    Showing <strong>{filteredLeads.length}</strong> of {rawRecentLeads.length} leads
                  </span>
                </div>
              </div>

              {/* FLOATING / STICKY BULK ACTION BAR */}
              {selectedLeadIds.length > 0 && (
                <div className="bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-md animate-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500 text-white text-xs font-bold">
                      {selectedLeadIds.length}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckSquare size={14} className="text-blue-400" />
                        Captured Leads Selected for Bulk Telecaller Assignment
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Assign selected leads in one click to any telecaller or auto-distribute via Round-Robin
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={toggleSelectAllFiltered}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    >
                      {isAllFilteredSelected ? 'Deselect Filtered' : `Select All ${filteredLeads.length} Filtered`}
                    </button>

                    <select
                      value={bulkCallerId}
                      onChange={(e) => setBulkCallerId(e.target.value)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                    >
                      <option value="ROUND_ROBIN">⚡ Auto Round-Robin Pool (Distribute Evenly)</option>
                      {team.map(t => (
                        <option key={t.id} value={t.id}>
                          👤 {t.name} ({t.status === 'Online' ? 'Active' : t.status})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleBulkAssign}
                      disabled={bulkAssigning}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      {bulkAssigning ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <UserCheck size={14} />
                          Assign Selected Leads
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedLeadIds([])}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* CAPTURED LEADS TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                      <th className="py-3.5 pl-6 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="rounded border-slate-300 cursor-pointer text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="py-3.5 px-4">Lead ID & Time</th>
                      <th className="py-3.5 px-4">Prospect & Phone</th>
                      <th className="py-3.5 px-4">Lead Source & Platform</th>
                      <th className="py-3.5 px-4">Campaign Name</th>
                      <th className="py-3.5 px-4">Pipeline Status</th>
                      <th className="py-3.5 px-4">Assigned Telecaller</th>
                      <th className="py-3.5 px-6 text-right">Quick 1-Click Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-14 text-center text-slate-400 font-medium">
                          <ShieldAlert size={28} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No matching captured leads found.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Try resetting filters or clicking &ldquo;Sync Meta Ads Leads&rdquo; above.
                          </p>
                          {isAnyFilterActive && (
                            <button
                              onClick={resetAllFilters}
                              className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              Reset All Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        const isSelected = selectedLeadIds.includes(lead.id);
                        return (
                          <tr
                            key={lead.id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isSelected ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            {/* Checkbox Column */}
                            <td className="py-4 pl-6 pr-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLeadSelection(lead.id)}
                                className="rounded border-slate-300 cursor-pointer text-blue-600 focus:ring-blue-500"
                              />
                            </td>

                            {/* Lead ID & Capture Timestamp */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-xs font-bold text-blue-600 tabular-nums">
                                {lead.lead_id}
                              </span>
                              <span className="block text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock size={11} className="text-slate-400 shrink-0" />
                                {formatCaptureTime(lead.createdAt)}
                              </span>
                            </td>

                            {/* Prospect Name & Phone */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <p className="font-semibold text-slate-900 text-sm">{lead.name}</p>
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                <span className="font-semibold tabular-nums">+91 {lead.mobile}</span>
                              </div>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                {lead.city || 'Indore'} • {lead.business_type || 'Trader'}
                              </span>
                            </td>

                            {/* Source Badge with Logo Styling */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              {renderSourceBadge(lead.lead_source)}
                            </td>

                            {/* Campaign Name */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-800">
                                {lead.campaign_name || 'Meta Lead Campaign'}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                {lead.product_interest || 'Mustard Oil (15L Tin)'}
                              </span>
                            </td>

                            {/* Editable Inline Status Dropdown */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <select
                                value={lead.status}
                                onChange={(e) => handleInlineStatus(lead.id, e.target.value)}
                                disabled={inlineUpdatingId === lead.id}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer focus:outline-none ${
                                  STATUS_STYLES[lead.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {ALL_STATUS_OPTIONS.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </td>

                            {/* Editable Inline Assigned Telecaller Dropdown */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <select
                                value={lead.assignedToId || (team.find(t => t.name === lead.assignedTo)?.id || '')}
                                onChange={(e) => handleInlineAssign(lead.id, e.target.value)}
                                disabled={inlineUpdatingId === lead.id}
                                className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-800 hover:border-slate-300 focus:outline-none cursor-pointer w-40"
                              >
                                <option value="">Unassigned</option>
                                {team.map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            </td>

                            {/* DIRECT 1-CLICK ACTION BUTTONS */}
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openDialerForLead(lead)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                  title="Open Quick Dialer for this lead"
                                >
                                  <Phone size={13} /> Call
                                </button>
                                <a
                                  href={`https://wa.me/91${String(lead.mobile).slice(-10)}?text=${encodeURIComponent(`Namaste ${lead.name} ji, KisanConnect regarding your recent inquiry.`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                  title="Open Direct WhatsApp Chat"
                                >
                                  <MessageCircle size={15} />
                                </a>
                                <Link
                                  href={`/leads?search=${encodeURIComponent(lead.lead_id)}`}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                                >
                                  Details
                                </Link>
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
          )}

          {/* TAB 2: ACTIVE TELECALLER FLOOR */}
          {activeTab === 'CALLERS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                    <th className="py-3.5 px-6">Telecaller Agent</th>
                    <th className="py-3.5 px-4">Live Status</th>
                    <th className="py-3.5 px-4">Assigned Leads</th>
                    <th className="py-3.5 px-4">Calls Made</th>
                    <th className="py-3.5 px-4">Daily Call Target</th>
                    <th className="py-3.5 px-6 text-right">Closed Revenue Deals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {team.map((t) => {
                    const pct = Math.min(100, Math.round((t.calls / (t.target || 50)) * 100));
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 whitespace-nowrap">
                          <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                          <span className="text-[11px] text-slate-400 font-normal">{t.team} • +91 {t.mobile}</span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {t.status}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-semibold text-slate-700 tabular-nums">
                          {t.assignedLeads} leads
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-900 tabular-nums">
                          {t.calls} calls
                        </td>

                        <td className="py-4 px-4">
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] font-semibold mb-1 text-slate-600">
                              <span>{t.calls}/{t.target}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right font-heading font-bold text-emerald-600 tabular-nums text-sm">
                          {t.closedDeals} Closed
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: META CAMPAIGNS */}
          {activeTab === 'CAMPAIGNS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                    <th className="py-3.5 px-6">Campaign Name</th>
                    <th className="py-3.5 px-4">Platform</th>
                    <th className="py-3.5 px-4">Ingested Leads</th>
                    <th className="py-3.5 px-4">Hot Leads</th>
                    <th className="py-3.5 px-4">Assigned Team</th>
                    <th className="py-3.5 px-6 text-right">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {campaigns.map((c) => (
                    <tr key={c.id || c.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-900 text-sm">
                        {c.name}
                        <span className="block text-[11px] text-slate-400 font-normal">Rule: {c.rule}</span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                          {c.platform}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900 tabular-nums">{c.total}</td>
                      <td className="py-4 px-4 font-semibold text-indigo-600 tabular-nums">{c.interested || 0}</td>
                      <td className="py-4 px-4 font-medium text-slate-700">{c.team}</td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-600 tabular-nums text-sm">
                        {c.rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: URGENT SLA LEADS */}
          {activeTab === 'SLA' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-rose-50/60 border-b border-rose-100">
                    <th className="py-3.5 px-6">Lead ID & Prospect</th>
                    <th className="py-3.5 px-4">Mobile</th>
                    <th className="py-3.5 px-4">City</th>
                    <th className="py-3.5 px-4">Assigned Agent</th>
                    <th className="py-3.5 px-6 text-right">Quick Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {slaBreachLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{lead.name}</span>
                        <span className="text-[10px] font-bold text-rose-600">{lead.lead_id} • Uncontacted &gt;15m</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800 tabular-nums">+91 {lead.mobile}</td>
                      <td className="py-4 px-4 font-medium text-slate-700">{lead.city}</td>
                      <td className="py-4 px-4 font-medium text-slate-700">{lead.assignedTo}</td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => openDialerForLead(lead)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs"
                        >
                          <Phone size={13} /> Call Immediately
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD NEW LEAD (1-CLICK POPUP) */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button
              onClick={() => setShowAddLeadModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900">Add New Prospect Lead</h3>
              <p className="text-xs text-slate-500 font-medium">Instantly saves lead to MongoDB and assigns to active telecaller</p>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prospect Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Sharma"
                  value={newLeadForm.name}
                  onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9826012345"
                    value={newLeadForm.mobile}
                    onChange={e => setNewLeadForm({ ...newLeadForm, mobile: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City / Region</label>
                  <input
                    type="text"
                    placeholder="Indore"
                    value={newLeadForm.city}
                    onChange={e => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Business Type</label>
                  <select
                    value={newLeadForm.business_type}
                    onChange={e => setNewLeadForm({ ...newLeadForm, business_type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Distributor">Distributor</option>
                    <option value="Trader">Wholesale Trader</option>
                    <option value="Super Stockist">Super Stockist</option>
                    <option value="Retailer">Retail Store</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Product Requirement</label>
                  <select
                    value={newLeadForm.product_interest}
                    onChange={e => setNewLeadForm({ ...newLeadForm, product_interest: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Mustard Oil (15L Tin)">Mustard Oil (15L Tin)</option>
                    <option value="Soybean Refined Oil">Soybean Refined Oil</option>
                    <option value="Sunflower Oil">Sunflower Oil</option>
                    <option value="Groundnut Oil">Groundnut Oil</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={savingLead}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {savingLead ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Add Lead & Auto-Assign
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK DIALER & DISPOSITION (1-CLICK POPUP) */}
      {showDialerModal && dialTargetLead && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button
              onClick={() => setShowDialerModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900">Click-to-Call Dialer & Disposition</h3>
              <p className="text-xs text-slate-500 font-medium">
                Calling <strong className="text-slate-800">{dialTargetLead.name}</strong> (+91 {dialTargetLead.mobile})
              </p>
            </div>
            <form onSubmit={handleSaveCall} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Telecaller Agent Calling *</label>
                <select
                  required
                  value={dialerForm.callerId}
                  onChange={e => setDialerForm({ ...dialerForm, callerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {team.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.team})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Call Disposition Outcome</label>
                  <select
                    value={dialerForm.status}
                    onChange={e => setDialerForm({ ...dialerForm, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Interested">Interested (Hot)</option>
                    <option value="Follow Up">Follow Up Needed</option>
                    <option value="Connected">Connected & Discussed</option>
                    <option value="Closed">Closed (Deal Won)</option>
                    <option value="Not Connected">Not Connected</option>
                    <option value="Wrong Number">Wrong Number</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    value={dialerForm.duration}
                    onChange={e => setDialerForm({ ...dialerForm, duration: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Call Discussion Notes</label>
                <textarea
                  rows={3}
                  value={dialerForm.notes}
                  onChange={e => setDialerForm({ ...dialerForm, notes: e.target.value })}
                  placeholder="Record summary of client requirements..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={savingCall}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {savingCall ? <Loader2 size={15} className="animate-spin" /> : <PhoneCall size={15} />}
                Save Call Disposition & Update Lead
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
