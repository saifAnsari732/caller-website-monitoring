"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';
import {
  Users,
  Phone,
  MessageCircle,
  TrendingUp,
  RefreshCw,
  Zap,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
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
  SlidersHorizontal,
  Layers,
  ChevronDown,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  Check,
  UserPlus
} from 'lucide-react';

const STATUS_STYLES = {
  'Fresh Inquiry': 'bg-sky-50 text-sky-700 border-sky-200',
  'Fresh Lead': 'bg-sky-50 text-sky-700 border-sky-200',
  'Assigned': 'bg-blue-50 text-blue-700 border-blue-200',
  'Connected': 'bg-teal-50 text-teal-700 border-teal-200',
  'Follow Up': 'bg-amber-50 text-amber-700 border-amber-200',
  'Callback': 'bg-amber-50 text-amber-700 border-amber-200',
  'Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'Distributor Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'Trader Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
  'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
  'Not Connected': 'bg-slate-100 text-slate-600 border-slate-200',
  'Wrong Number': 'bg-rose-50 text-rose-700 border-rose-200',
  'Rejected': 'bg-rose-50 text-rose-700 border-rose-200'
};

const ALL_STATUS_OPTIONS = [
  'Fresh Inquiry',
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

const TAG_OPTIONS = ['Hot', 'Warm', 'Cold', 'VIP'];

function formatLeadDate(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redistributing, setRedistributing] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [actionBanner, setActionBanner] = useState(null);
  const [activeTab, setActiveTab] = useState('LEADS'); // 'LEADS' | 'CALLERS' | 'CAMPAIGNS' | 'SLA'

  // Dashboard Leads Table States (Matching Screenshot Layout & Server Pagination for Total Leads)
  const [workbenchLeads, setWorkbenchLeads] = useState([]);
  const [workbenchLoading, setWorkbenchLoading] = useState(true);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Multi-Filter States
  const [dateFilter, setDateFilter] = useState('ALL');
  const [callerFilter, setCallerFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [campaignFilter, setCampaignFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection & Assignment States
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkCallerId, setBulkCallerId] = useState('ROUND_ROBIN');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);

  // Modals for Actions & Quick Edit
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Drawer: 360° Inspector
  const [inspectorLeadId, setInspectorLeadId] = useState(null);
  const [inspectorData, setInspectorData] = useState(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  // Column Visibility matching NeoDove specifications
  const [showColMenu, setShowColMenu] = useState(false);
  const [columns, setColumns] = useState({
    no: true,
    name: true,
    number: true,
    email: true,
    campaign: true,
    creationDate: true,
    updatedAt: true,
    stage: true,
    tag: true,
    userAssigned: true,
    followUpTime: true,
    leadStatus: true,
    dealAmount: true,
    lastCallDate: true,
    callAttemptCount: true,
    joinAs: true,
    startTimeline: true,
    city: true,
    action: true
  });

  const COLUMN_LABELS = {
    no: 'No.',
    name: 'Name',
    number: 'Number',
    email: 'Email',
    campaign: 'Campaign Name',
    creationDate: 'Creation Date',
    updatedAt: 'Updated at',
    stage: 'Lead Stage',
    tag: 'Tag',
    userAssigned: 'User Assigned',
    followUpTime: 'Follow-Up Time',
    leadStatus: 'Lead Status',
    dealAmount: 'Deal Amount',
    lastCallDate: 'Last Call Date',
    callAttemptCount: 'Call Attempt Count',
    joinAs: 'आप_किस_रूप_में_जुड़ना_चाहते_हैं?',
    startTimeline: 'आप_कब_शुरू_करना_चाहेंगे?',
    city: 'City',
    action: 'Action'
  };

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
    campaign_name: '',
    business_type: '',
    product_interest: '',
    assigned_to: ''
  });
  const [savingLead, setSavingLead] = useState(false);

  // Fetch Dashboard Stats (KPIs, Teams, Campaigns)
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

  // Fetch Workbench Leads (All total leads with server-side pagination & multi-filters)
  const fetchWorkbenchLeads = useCallback(async () => {
    setWorkbenchLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (stageFilter && stageFilter !== 'ALL') params.set('status', stageFilter);
      if (callerFilter && callerFilter !== 'ALL') params.set('callerId', callerFilter);
      if (campaignFilter && campaignFilter !== 'ALL') params.set('campaign', campaignFilter);
      if (dateFilter && dateFilter !== 'ALL') params.set('dateRange', dateFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();
      if (json.leads) setWorkbenchLeads(json.leads);
      if (json.total !== undefined) setTotalLeadsCount(json.total);
      if (json.totalPages !== undefined) setTotalPages(json.totalPages);
      if (json.campaigns) setCampaignOptions(json.campaigns);
      if (json.users) setUsersList(json.users);
    } catch (err) {
      console.error('Fetch workbench leads error:', err);
    } finally {
      setWorkbenchLoading(false);
    }
  }, [page, limit, searchQuery, stageFilter, callerFilter, campaignFilter, dateFilter]);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 20000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  useEffect(() => {
    fetchWorkbenchLeads();
  }, [fetchWorkbenchLeads]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => {
      setActiveMenuId(null);
      setShowColMenu(false);
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const showToast = (msg) => {
    setActionBanner(msg);
    setTimeout(() => setActionBanner(null), 5000);
  };

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFilter !== 'ALL') count++;
    if (callerFilter !== 'ALL') count++;
    if (stageFilter !== 'ALL') count++;
    if (campaignFilter !== 'ALL') count++;
    if (searchQuery.trim() !== '') count++;
    return count;
  }, [dateFilter, callerFilter, stageFilter, campaignFilter, searchQuery]);

  const resetAllFilters = () => {
    setDateFilter('ALL');
    setCallerFilter('ALL');
    setStageFilter('ALL');
    setCampaignFilter('ALL');
    setSearchQuery('');
    setPage(1);
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
        fetchWorkbenchLeads();
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
        body: JSON.stringify({ action: 'SYNC_FORM_LEADS', count: 25 })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Meta Sync: Ingested ${json.syncedCount} new leads from Meta Ads.`);
        fetchDashboard();
        fetchWorkbenchLeads();
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
          email: '',
          city: '',
          campaign_name: '',
          business_type: '',
          product_interest: '',
          assigned_to: ''
        });
        showToast(`Lead created successfully! Assigned to: ${json.lead?.assigned_to?.name || 'Telecaller'}`);
        fetchDashboard();
        fetchWorkbenchLeads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLead(false);
    }
  };

  // Bulk status update for selected leads
  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedLeadIds.length === 0) return;
    setBulkUpdatingStatus(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          status: bulkStatus
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Updated status of ${selectedLeadIds.length} leads to "${bulkStatus}"!`);
        setSelectedLeadIds([]);
        setBulkStatus('');
        fetchDashboard();
        fetchWorkbenchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBulkUpdatingStatus(false);
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
        showToast(`Assigned ${selectedLeadIds.length} captured leads to ${callerName}!`);
        setSelectedLeadIds([]);
        setBulkCallerId('ROUND_ROBIN');
        fetchDashboard();
        fetchWorkbenchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBulkAssigning(false);
    }
  };

  // Save Quick Edit for a lead
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLead?._id && !editingLead?.id) return;
    setSavingEdit(true);
    try {
      const targetId = editingLead._id || editingLead.id;
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: targetId,
          name: editingLead.name,
          mobile: editingLead.mobile,
          email: editingLead.email,
          campaign_name: editingLead.campaign_name,
          status: editingLead.status,
          lead_status: editingLead.lead_status,
          priority: editingLead.priority,
          city: editingLead.city,
          state: editingLead.state,
          deal_amount: editingLead.deal_amount,
          follow_up_time: editingLead.follow_up_time,
          join_as: editingLead.join_as,
          start_timeline: editingLead.start_timeline,
          call_attempts: editingLead.call_attempts,
          assigned_to: editingLead.assigned_to?._id || editingLead.assigned_to || editingLead.assignedToId || null,
          notes: editingLead.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Lead ${editingLead.name} updated successfully!`);
        setEditingLead(null);
        fetchDashboard();
        fetchWorkbenchLeads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId, leadName) => {
    if (!window.confirm(`Are you sure you want to delete lead "${leadName}"?`)) return;
    try {
      const res = await fetch(`/api/leads?id=${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Lead "${leadName}" removed.`);
        fetchDashboard();
        fetchWorkbenchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Timeline drawer
  const openInspector = async (leadId) => {
    setInspectorLeadId(leadId);
    setLoadingInspector(true);
    try {
      const res = await fetch(`/api/leads?detailId=${leadId}`);
      const data = await res.json();
      setInspectorData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInspector(false);
    }
  };

  // Export CSV with All 18 NeoDove Fields (UTF-8 encoded)
  const handleExportCSV = () => {
    const headers = [
      'No.',
      'Name',
      'Number',
      'Email',
      'Campaign Name',
      'Creation Date',
      'Updated at',
      'Lead Stage',
      'Tag',
      'User Assigned',
      'Follow-Up Time',
      'Lead Status',
      'Deal Amount',
      'Last Call Date',
      'Call Attempt Count',
      'आप_किस_रूप_में_जुड़ना_चाहते_हैं?',
      'आप_कब_शुरू_करना_चाहेंगे?',
      'City'
    ];

    const rows = workbenchLeads.map((l, idx) => {
      const no = (page - 1) * limit + idx + 1;
      const tag = l.priority === 'High' || l.priority === 'VIP' ? 'Hot' : (l.tags?.[0] || 'Hot');
      const assignedName = l.assigned_to?.name || l.assignedTo || 'Unassigned';
      const followUp = l.follow_up_time ? formatLeadDate(l.follow_up_time) : '—';
      const lastCall = l.last_contacted_at ? formatLeadDate(l.last_contacted_at) : '—';
      const dealAmt = l.deal_amount ? `₹${l.deal_amount}` : '—';
      const joinAs = l.join_as || l.business_type || '—';
      const startTimeline = l.start_timeline || l.product_interest || '—';
      const city = l.city || l.state || '—';

      return [
        no,
        l.name || '',
        l.mobile || '',
        l.email || '',
        l.campaign_name || 'Agra',
        formatLeadDate(l.createdAt),
        formatLeadDate(l.updatedAt || l.createdAt),
        l.status || 'Fresh Inquiry',
        tag,
        assignedName,
        followUp,
        l.lead_status || 'In-Progress',
        dealAmt,
        lastCall,
        l.call_attempts || 0,
        joinAs,
        startTimeline,
        city
      ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Dashboard_Leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const startIndex = totalLeadsCount === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalLeadsCount);

  // Selection state on current page
  const pageIds = workbenchLeads.map(l => l._id || l.id);
  const isAllPageSelected = pageIds.length > 0 && pageIds.every(id => selectedLeadIds.includes(id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const removeSet = new Set(pageIds);
      setSelectedLeadIds(selectedLeadIds.filter(id => !removeSet.has(id)));
    } else {
      const combined = new Set([...selectedLeadIds, ...pageIds]);
      setSelectedLeadIds(Array.from(combined));
    }
  };

  const isFreshWorkspace = Boolean(
    (data?.isFreshUser || totalLeadsCount === 0) &&
    !workbenchLoading &&
    !loading &&
    (!searchQuery || searchQuery.trim() === '') &&
    stageFilter === 'ALL' &&
    callerFilter === 'ALL' &&
    campaignFilter === 'ALL' &&
    dateFilter === 'ALL'
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="CRM Operations Command Center"
        subtitle={
          user?.name
            ? `${user.name.toUpperCase()} — Real-Time Telecalling, Meta Lead Capture & Sales Pipeline Hub`
            : "Real-Time Telecalling, Meta Lead Capture & Sales Pipeline Hub"
        }
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-5 flex-1">
        {/* Dynamic Action / Notification Toast Banner */}
        {actionBanner && (
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-700 text-xs font-semibold flex items-center justify-between shadow-lg">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              {actionBanner}
            </span>
            <button onClick={() => setActionBanner(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}



        {/* 1. EASY-TO-USE MULTI-BUTTON ACTION HUB */}
        <div className="crm-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Zap size={14} className="text-blue-600" /> Quick Operations &amp; 1-Click Action Hub
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live MongoDB &amp; Meta Graph v21.0
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

            {/* Sync Meta Ads Leads Button */}
            <button
              onClick={handleSyncMetaLeads}
              disabled={syncingMeta}
              className="px-4 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {syncingMeta ? <Loader2 size={15} className="animate-spin text-white" /> : <RefreshCw size={15} />}
              Sync Meta Ads Leads
            </button>

            {/* Follow-ups Due Today Button */}
            <Link
              href="/followups"
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Calendar size={15} className="text-amber-600" />
              Callbacks Due Today ({kpis.pendingFollowups})
            </Link>

            {/* Re-balance SLA Stuck Leads */}
            <button
              onClick={handleAutoRedistributeSLA}
              disabled={redistributing}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {redistributing ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <RefreshCw size={15} className="text-emerald-600" />}
              Auto-Distribute Stuck Leads
            </button>

            {/* Export Report CSV Button */}
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer ml-auto"
            >
              <Download size={15} /> Export Leads CSV
            </button>
          </div>
        </div>

        {/* 2. 4-METRIC KPI SECTION */}
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
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                {totalLeadsCount || kpis.totalLeads}
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
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                {totalCalls}
              </p>
              <span className="text-xs font-semibold text-emerald-600 group-hover:underline flex items-center gap-0.5">
                {connectedCalls} Connected <ChevronRight size={13} />
              </span>
            </div>
          </Link>

          {/* Metric 3: Qualified Hot Prospects */}
          <Link
            href="/campaigns"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-colors block group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qualified Hot Prospects</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {kpis.closedDeals} Deals Won
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-heading font-extrabold text-indigo-600 tracking-tight">
                {kpis.interestedLeads}
              </p>
              <span className="text-xs font-semibold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                {kpis.conversionRate}% Win Rate <ChevronRight size={13} />
              </span>
            </div>
          </Link>

          {/* Metric 4: Callbacks & SLA Alert */}
          <Link
            href="/followups"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-colors block group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Callbacks &amp; SLA Alert</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                kpis.overdueFollowups > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {kpis.overdueFollowups > 0 ? `${kpis.overdueFollowups} Overdue` : 'On Schedule'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                {loading ? '—' : kpis.pendingFollowups}
              </p>
              <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-0.5">
                Callback Hub <ChevronRight size={13} />
              </span>
            </div>
          </Link>
        </div>

        {/* 3. PRIMARY OPERATIONAL WORKBENCH WITH CAPTURED LEADS (NEODOVE STYLE TABLE) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Switcher Tabs Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('LEADS')}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'LEADS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
                }`}
              >
                <Layers size={14} className={activeTab === 'LEADS' ? 'text-blue-100' : 'text-blue-600'} />
                Live Captured Leads ({totalLeadsCount || rawRecentLeads.length})
              </button>
              <button
                onClick={() => setActiveTab('CALLERS')}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'CALLERS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
                }`}
              >
                <Users size={14} className={activeTab === 'CALLERS' ? 'text-blue-100' : 'text-slate-600'} />
                Active Telecaller Floor ({team.length})
              </button>
              <button
                onClick={() => setActiveTab('CAMPAIGNS')}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'CAMPAIGNS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
                }`}
              >
                <Target size={14} className={activeTab === 'CAMPAIGNS' ? 'text-blue-100' : 'text-[#1877F2]'} />
                Meta Campaigns ({campaigns.length})
              </button>
              {kpis.slaBreachCount > 0 && (
                <button
                  onClick={() => setActiveTab('SLA')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'SLA'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Clock size={14} />
                  Urgent SLA Waiting ({kpis.slaBreachCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchDashboard();
                  fetchWorkbenchLeads();
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw size={14} className={loading || workbenchLoading ? 'animate-spin' : ''} />
              </button>
              <Link
                href="/leads"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                Open Full CRM Leads View <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* TAB 1: CAPTURED LEADS WORKBENCH (NEODOVE STYLE TABLE AS PER SCREENSHOT) */}
          {activeTab === 'LEADS' && (
            <div className="flex flex-col">
              {/* TOP MULTI-DROPDOWN FILTER CONTROL BAR */}
              <div className="p-3.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                {/* Left: Filter dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Date Dropdown */}
                  <div className="relative">
                    <select
                      value={dateFilter}
                      onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                      className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3.5 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">Date ▾</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                    </select>
                  </div>

                  {/* Users Dropdown */}
                  <div className="relative">
                    <select
                      value={callerFilter}
                      onChange={(e) => { setCallerFilter(e.target.value); setPage(1); }}
                      className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3.5 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">Users ▾</option>
                      <option value="UNASSIGNED">Unassigned Only</option>
                      {(usersList.length > 0 ? usersList : team).map(u => (
                        <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stage Dropdown */}
                  <div className="relative">
                    <select
                      value={stageFilter}
                      onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
                      className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3.5 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">Stage ▾</option>
                      {ALL_STATUS_OPTIONS.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Campaign Dropdown */}
                  <div className="relative">
                    <select
                      value={campaignFilter}
                      onChange={(e) => { setCampaignFilter(e.target.value); setPage(1); }}
                      className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3.5 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">Campaign ▾</option>
                      {(campaignOptions.length > 0 ? campaignOptions : campaigns.map(c => c.name)).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Purple Active Filters Pill */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetAllFilters}
                      className="border border-[#7C3AED] text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Clear all active filters"
                    >
                      <Filter size={13} className="text-[#7C3AED]" />
                      <span>Filters</span>
                      <span className="w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[10px] flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                      <X size={13} className="text-[#7C3AED] ml-0.5" />
                    </button>
                  )}

                  {/* Save Filter / Clear Filters Button */}
                  {activeFilterCount > 0 ? (
                    <button
                      onClick={resetAllFilters}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <button
                      onClick={() => showToast('Filters saved for quick access!')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                      Save Filter
                    </button>
                  )}
                </div>

                {/* Right side search & utilities */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <div className="relative w-full sm:w-56">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by number"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Export CSV Download Button */}
                  <button
                    onClick={handleExportCSV}
                    title="Download CSV"
                    className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors shadow-2xs"
                  >
                    <Download size={15} />
                  </button>

                  {/* Column Visibility Toggle Button */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShowColMenu(!showColMenu)}
                      title="Toggle Columns"
                      className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      <SlidersHorizontal size={15} />
                    </button>

                    {showColMenu && (
                      <div className="absolute right-0 top-full mt-2 w-64 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 text-xs space-y-1">
                        <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white">
                          Display Columns (NeoDove View)
                        </p>
                        {Object.keys(columns).map((colKey) => (
                          <label key={colKey} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={columns[colKey]}
                              onChange={(e) => setColumns({ ...columns, [colKey]: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600 accent-blue-600"
                            />
                            <span className="truncate">{COLUMN_LABELS[colKey] || colKey}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STICKY BULK ACTION BAR */}
              {selectedLeadIds.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50/90 border-b border-purple-200/90 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs animate-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#7C3AED] text-white text-xs font-extrabold shadow-2xs">
                      {selectedLeadIds.length}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckSquare size={14} className="text-[#7C3AED]" />
                        <span><strong className="text-[#7C3AED] font-extrabold">{selectedLeadIds.length}</strong> Captured Leads Selected</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Assign to telecaller pool or perform bulk status update in one click
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Bulk Assignment */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200/90 shadow-2xs">
                      <select
                        value={bulkCallerId}
                        onChange={(e) => setBulkCallerId(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                      >
                        <option value="ROUND_ROBIN">Auto Round-Robin Pool</option>
                        {(usersList.length > 0 ? usersList : team).map(t => (
                          <option key={t.id || t._id} value={t.id || t._id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkAssign}
                        disabled={bulkAssigning}
                        className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        {bulkAssigning ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            Assign Telecaller
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bulk Status Update */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200/90 shadow-2xs">
                      <select
                        value={bulkStatus}
                        onChange={(e) => setBulkStatus(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                      >
                        <option value="">Set Stage...</option>
                        {ALL_STATUS_OPTIONS.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkStatusUpdate}
                        disabled={bulkUpdatingStatus || !bulkStatus}
                        className="px-3.5 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        {bulkUpdatingStatus ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Stage'
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedLeadIds([])}
                      className="text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer font-medium flex items-center gap-1"
                    >
                      <X size={13} />
                      Deselect All
                    </button>
                  </div>
                </div>
              )}

              {/* CAPTURED LEADS TABLE (EXACT MATCH TO SCREENSHOT COLUMNS) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#FAFBFD] border-b border-slate-200/80 sticky top-0 z-10">
                    <tr className="text-[12px] font-bold text-blue-700 whitespace-nowrap">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={toggleSelectAllPage}
                          aria-label="Select all leads on this page"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                      </th>
                      {columns.no && <th className="py-3 px-3 font-bold text-blue-700">No.</th>}
                      {columns.name && <th className="py-3 px-4 font-bold text-blue-700">Name</th>}
                      {columns.number && <th className="py-3 px-4 font-bold text-blue-700">Number</th>}
                      {columns.email && <th className="py-3 px-4 font-bold text-blue-700">Email</th>}
                      {columns.campaign && <th className="py-3 px-4 font-bold text-blue-700">Campaign Name</th>}
                      {columns.creationDate && <th className="py-3 px-4 font-bold text-blue-700">Creation Date</th>}
                      {columns.updatedAt && <th className="py-3 px-4 font-bold text-blue-700">Updated at</th>}
                      {columns.stage && <th className="py-3 px-4 font-bold text-blue-700">Lead Stage</th>}
                      {columns.tag && <th className="py-3 px-3 font-bold text-blue-700">Tag</th>}
                      {columns.userAssigned && <th className="py-3 px-4 font-bold text-blue-700">User Assigned</th>}
                      {columns.followUpTime && <th className="py-3 px-4 font-bold text-blue-700">Follow-Up Time</th>}
                      {columns.leadStatus && <th className="py-3 px-4 font-bold text-blue-700">Lead Status</th>}
                      {columns.dealAmount && <th className="py-3 px-4 font-bold text-blue-700">Deal Amount</th>}
                      {columns.lastCallDate && <th className="py-3 px-4 font-bold text-blue-700">Last Call Date</th>}
                      {columns.callAttemptCount && <th className="py-3 px-4 font-bold text-blue-700 text-center">Call Attempt Count</th>}
                      {columns.joinAs && <th className="py-3 px-4 font-bold text-blue-700">आप_किस_रूप_में_जुड़ना_चाहते_हैं?</th>}
                      {columns.startTimeline && <th className="py-3 px-4 font-bold text-blue-700">आप_कब_शुरू_करना_चाहेंगे?</th>}
                      {columns.city && <th className="py-3 px-4 font-bold text-blue-700">City</th>}
                      {columns.action && <th className="py-3 px-4 font-bold text-blue-700 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {workbenchLoading ? (
                      <tr>
                        <td colSpan="20" className="py-16 text-center text-slate-400">
                          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-xs font-semibold text-slate-600">Loading leads...</p>
                        </td>
                      </tr>
                    ) : workbenchLeads.length === 0 ? (
                      <tr>
                        <td colSpan="20" className="py-16 text-center">
                          {isFreshWorkspace ? (
                            <div className="max-w-md mx-auto space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs border border-blue-100">
                                <UserPlus size={22} />
                              </div>
                              <h4 className="text-sm font-bold text-slate-800">Your Lead Pipeline is Fresh &amp; Ready</h4>
                              <p className="text-xs text-slate-500">
                                No leads have been captured in your workspace yet. Click below to add your first lead manually or sync live Meta Ads leads.
                              </p>
                              <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                  onClick={() => setShowAddLeadModal(true)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Plus size={14} /> Add New Lead
                                </button>
                                <button
                                  onClick={handleSyncMetaLeads}
                                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <RefreshCw size={14} /> Sync Meta Ads
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-400">
                              <ShieldAlert size={30} className="mx-auto mb-2 text-slate-300" />
                              <p className="text-sm font-bold text-slate-700">No matching captured leads found</p>
                              <p className="text-xs text-slate-400 mt-1">Try resetting filters or clicking &ldquo;Sync Meta Ads Leads&rdquo; above.</p>
                              {activeFilterCount > 0 && (
                                <button
                                  onClick={resetAllFilters}
                                  className="mt-3 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  Clear All Filters
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      workbenchLeads.map((lead, idx) => {
                        const leadId = lead._id || lead.id;
                        const isChecked = selectedLeadIds.includes(leadId);
                        const rowNumber = (page - 1) * limit + idx + 1;
                        const tagLabel = lead.priority === 'High' || lead.priority === 'VIP' ? 'Hot' : 'Hot';
                        const assignedName = lead.assigned_to?.name || lead.assignedTo || 'Unassigned';

                        return (
                          <tr
                            key={leadId}
                            className={`hover:bg-slate-50/70 transition-colors border-b border-slate-100 ${
                              isChecked ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td
                              className="py-3.5 px-3 text-center cursor-pointer select-none"
                              onClick={(e) => {
                                if (e.target.tagName !== 'INPUT') {
                                  setSelectedLeadIds(prev =>
                                    prev.includes(leadId) ? prev.filter(i => i !== leadId) : [...prev, leadId]
                                  );
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedLeadIds(prev =>
                                    prev.includes(leadId) ? prev.filter(i => i !== leadId) : [...prev, leadId]
                                  );
                                }}
                                aria-label={`Select row ${rowNumber}`}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                            </td>

                            {/* No. (Row Index Number) */}
                            {columns.no && (
                              <td className="py-3.5 px-3 font-semibold text-slate-700 tabular-nums">
                                {rowNumber}
                              </td>
                            )}

                            {/* Name */}
                            {columns.name && (
                              <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                                {lead.name || '—'}
                              </td>
                            )}

                            {/* Number */}
                            {columns.number && (
                              <td className="py-3.5 px-4 font-medium text-slate-800 tabular-nums whitespace-nowrap">
                                {lead.mobile || '—'}
                              </td>
                            )}

                            {/* Email */}
                            {columns.email && (
                              <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap max-w-[170px] truncate" title={lead.email}>
                                {lead.email || ''}
                              </td>
                            )}

                            {/* Campaign Name */}
                            {columns.campaign && (
                              <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                                {lead.campaign_name || 'Agra'}
                              </td>
                            )}

                            {/* Creation Date */}
                            {columns.creationDate && (
                              <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-[11px] tabular-nums">
                                {formatLeadDate(lead.createdAt)}
                              </td>
                            )}

                            {/* Updated at */}
                            {columns.updatedAt && (
                              <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-[11px] tabular-nums">
                                {formatLeadDate(lead.updatedAt || lead.createdAt)}
                              </td>
                            )}

                            {/* Lead Stage */}
                            {columns.stage && (
                              <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                                {lead.status || 'Fresh Inquiry'}
                              </td>
                            )}

                            {/* Tag */}
                            {columns.tag && (
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/70">
                                  {tagLabel}
                                </span>
                              </td>
                            )}

                            {/* User Assigned */}
                            {columns.userAssigned && (
                              <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                                {assignedName}
                              </td>
                            )}

                            {/* Follow-Up Time */}
                            {columns.followUpTime && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px] tabular-nums">
                                {lead.follow_up_time ? formatLeadDate(lead.follow_up_time) : '—'}
                              </td>
                            )}

                            {/* Lead Status */}
                            {columns.leadStatus && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                                {lead.lead_status || 'In-Progress'}
                              </td>
                            )}

                            {/* Deal Amount */}
                            {columns.dealAmount && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium tabular-nums">
                                {lead.deal_amount ? `₹${Number(lead.deal_amount).toLocaleString('en-IN')}` : '—'}
                              </td>
                            )}

                            {/* Last Call Date */}
                            {columns.lastCallDate && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px] tabular-nums">
                                {lead.last_contacted_at ? formatLeadDate(lead.last_contacted_at) : '—'}
                              </td>
                            )}

                            {/* Call Attempt Count */}
                            {columns.callAttemptCount && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] tabular-nums">
                                  {lead.call_attempts || 0}
                                </span>
                              </td>
                            )}

                            {/* आप_किस_रूप_में_जुड़ना_चाहते_हैं? */}
                            {columns.joinAs && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 max-w-[200px] truncate" title={lead.join_as || lead.business_type}>
                                {lead.join_as || lead.business_type || '—'}
                              </td>
                            )}

                            {/* आप_कब_शुरू_करना_चाहेंगे? */}
                            {columns.startTimeline && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 max-w-[180px] truncate" title={lead.start_timeline || lead.product_interest}>
                                {lead.start_timeline || lead.product_interest || '—'}
                              </td>
                            )}

                            {/* City */}
                            {columns.city && (
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 font-medium">
                                {lead.city || lead.state || '—'}
                              </td>
                            )}

                            {/* Action: Edit + 3-dots */}
                            {columns.action && (
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5 relative">
                                  <button
                                    onClick={() => setEditingLead({ ...lead, id: leadId })}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[#C4B5FD] text-[#6D28D9] bg-[#FAF5FF] hover:bg-[#F3E8FF] transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>

                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setActiveMenuId(activeMenuId === leadId ? null : leadId)}
                                      className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                                      title="More actions"
                                    >
                                      <MoreVertical size={15} />
                                    </button>

                                    {activeMenuId === leadId && (
                                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-xs">
                                        <a
                                          href={`https://wa.me/91${String(lead.mobile).slice(-10)}?text=${encodeURIComponent(`Namaste ${lead.name} ji, regarding your inquiry.`)}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                                        >
                                          <MessageCircle size={14} className="text-emerald-600" />
                                          <span>WhatsApp Chat</span>
                                        </a>
                                        <button
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            openInspector(leadId);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium text-left cursor-pointer"
                                        >
                                          <Eye size={14} className="text-blue-600" />
                                          <span>View Timeline</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            setEditingLead({ ...lead, id: leadId });
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium text-left cursor-pointer"
                                        >
                                          <Edit3 size={14} className="text-purple-600" />
                                          <span>Quick Edit Lead</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            handleDeleteLead(leadId, lead.name);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium text-left cursor-pointer border-t border-slate-100"
                                        >
                                          <Trash2 size={14} />
                                          <span>Delete Lead</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 4. BOTTOM PAGINATION BAR (EXACT MATCH TO SCREENSHOT) */}
              <div className="px-5 py-3 border-t border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  {selectedLeadIds.length > 0 ? (
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                      {selectedLeadIds.length} of {totalLeadsCount} selected
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      Total <strong>{totalLeadsCount}</strong> leads captured
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 ml-auto">
                  {/* Items per page: [ 50 ▾ ] */}
                  <div className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span>Items per page:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>

                  {/* 1 - 50 of 607 */}
                  <span className="font-medium text-slate-700 tabular-nums">
                    {startIndex} – {endIndex} of {totalLeadsCount}
                  </span>

                  {/* Previous / Next buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
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
                      <td className="py-4 px-4 font-medium text-slate-700">{lead.city || '—'}</td>
                      <td className="py-4 px-4 font-medium text-slate-700">{lead.assignedTo}</td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          href={`/leads?search=${encodeURIComponent(lead.lead_id)}`}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors shadow-2xs"
                        >
                          Inspect Lead <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD NEW LEAD */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button
              onClick={() => setShowAddLeadModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900">Add New Prospect Lead</h3>
              <p className="text-xs text-slate-500 font-medium">Instantly saves lead to MongoDB and assigns to active telecaller pool</p>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prospect Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter prospect full name"
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
                    placeholder="10-digit mobile number"
                    value={newLeadForm.mobile}
                    onChange={e => setNewLeadForm({ ...newLeadForm, mobile: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="prospect@example.com"
                    value={newLeadForm.email}
                    onChange={e => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City / Region</label>
                  <input
                    type="text"
                    placeholder="Enter city or district"
                    value={newLeadForm.city}
                    onChange={e => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Campaign Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Agra, WFH"
                    value={newLeadForm.campaign_name}
                    onChange={e => setNewLeadForm({ ...newLeadForm, campaign_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Telecaller</label>
                <select
                  value={newLeadForm.assigned_to}
                  onChange={e => setNewLeadForm({ ...newLeadForm, assigned_to: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">Auto Round-Robin Pool</option>
                  {(usersList.length > 0 ? usersList : team).map(u => (
                    <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={savingLead}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {savingLead ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Add Lead &amp; Auto-Assign
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK EDIT LEAD MODAL */}
      {editingLead && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button
              onClick={() => setEditingLead(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Lead Record</h3>
              <p className="text-xs text-slate-500 font-medium">
                Lead ID: <strong className="text-blue-600">{editingLead.lead_id}</strong>
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Prospect Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingLead.name || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={editingLead.mobile || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, mobile: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    placeholder="prospect@example.com"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={editingLead.campaign_name || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, campaign_name: e.target.value })}
                    placeholder="e.g. Agra, WFH"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lead Stage</label>
                  <select
                    value={editingLead.status || 'Fresh Inquiry'}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ALL_STATUS_OPTIONS.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tag</label>
                  <select
                    value={editingLead.priority === 'High' || editingLead.priority === 'VIP' ? 'Hot' : 'Hot'}
                    onChange={(e) => setEditingLead({ ...editingLead, priority: e.target.value === 'Hot' ? 'VIP' : 'Normal' })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {TAG_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">User Assigned</label>
                  <select
                    value={editingLead.assigned_to?._id || editingLead.assigned_to || editingLead.assignedToId || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, assigned_to: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {(usersList.length > 0 ? usersList : team).map(u => (
                      <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City / Region</label>
                  <input
                    type="text"
                    value={editingLead.city || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lead Status</label>
                  <select
                    value={editingLead.lead_status || 'In-Progress'}
                    onChange={(e) => setEditingLead({ ...editingLead, lead_status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="In-Progress">In-Progress</option>
                    <option value="Open">Open</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Deal Amount (₹)</label>
                  <input
                    type="number"
                    value={editingLead.deal_amount || 0}
                    onChange={(e) => setEditingLead({ ...editingLead, deal_amount: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Follow-Up Time</label>
                  <input
                    type="datetime-local"
                    value={editingLead.follow_up_time ? new Date(editingLead.follow_up_time).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingLead({ ...editingLead, follow_up_time: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Call Attempt Count</label>
                  <input
                    type="number"
                    value={editingLead.call_attempts || 0}
                    onChange={(e) => setEditingLead({ ...editingLead, call_attempts: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">आप किस रूप में जुड़ना चाहते हैं?</label>
                  <input
                    type="text"
                    value={editingLead.join_as || editingLead.business_type || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, join_as: e.target.value, business_type: e.target.value })}
                    placeholder="e.g. distributor (डिस्ट्रीब्यूटर), trader (ट्रेडर)"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">आप कब शुरू करना चाहेंगे?</label>
                  <input
                    type="text"
                    value={editingLead.start_timeline || editingLead.product_interest || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, start_timeline: e.target.value, product_interest: e.target.value })}
                    placeholder="e.g. तुरंत, एक सप्ताह के भीतर"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Discussion Notes</label>
                <textarea
                  rows={2}
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  placeholder="Record summary of client discussions..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {savingEdit ? <Loader2 size={13} className="animate-spin" /> : null}
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: LEAD 360° INSPECTOR */}
      {inspectorLeadId && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Lead 360° Inspector {inspectorData?.lead?.lead_id ? `• ${inspectorData.lead.lead_id}` : ''}
                </span>
                <h3 className="text-lg font-bold mt-0.5">{inspectorData?.lead?.name || 'Loading...'}</h3>
              </div>
              <button
                onClick={() => { setInspectorLeadId(null); setInspectorData(null); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {loadingInspector || !inspectorData?.lead ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <a
                    href={`https://wa.me/91${String(inspectorData.lead.mobile).slice(-10)}?text=${encodeURIComponent(`Namaste ${inspectorData.lead.name} ji, regarding your inquiry.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <MessageCircle size={15} /> WhatsApp Chat
                  </a>
                  <button
                    onClick={() => {
                      setEditingLead({ ...inspectorData.lead });
                      setInspectorLeadId(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Edit3 size={15} /> Edit Details
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold">Mobile Number</p>
                    <p className="font-bold text-slate-900 mt-0.5 tabular-nums">+91 {inspectorData.lead.mobile}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Campaign Name</p>
                    <p className="font-bold text-slate-900 mt-0.5">{inspectorData.lead.campaign_name || 'Agra'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Assigned Telecaller</p>
                    <p className="font-bold text-blue-600 mt-0.5">{inspectorData.lead.assigned_to?.name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Pipeline Stage</p>
                    <p className="font-bold text-slate-900 mt-0.5">{inspectorData.lead.status || 'Fresh Inquiry'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Created Date</p>
                    <p className="font-medium text-slate-700 mt-0.5">{formatLeadDate(inspectorData.lead.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Last Updated</p>
                    <p className="font-medium text-slate-700 mt-0.5">{formatLeadDate(inspectorData.lead.updatedAt || inspectorData.lead.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Call Logs History ({inspectorData.calls?.length || 0})
                  </h4>
                  {(!inspectorData.calls || inspectorData.calls.length === 0) ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                      No calls logged yet by mobile app telecallers.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {inspectorData.calls.map((c) => (
                        <div key={c._id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded">
                              {c.status}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                              <Clock size={11} /> {c.duration}s • {new Date(c.start_time).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{c.notes || 'No discussion notes.'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">Caller: {c.caller?.name || 'Telecaller'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
