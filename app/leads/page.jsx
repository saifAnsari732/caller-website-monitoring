"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';
import {
  Search,
  Download,
  SlidersHorizontal,
  MoreVertical,
  Filter,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Edit3,
  MessageCircle,
  UserPlus,
  Loader2,
  Phone,
  Calendar,
  Clock,
  UserCheck,
  Trash2,
  Eye,
  ShieldAlert,
  Check,
  ExternalLink
} from 'lucide-react';

const STAGE_OPTIONS = [
  'Fresh Inquiry',
  'Fresh Lead',
  'Assigned',
  'Connected',
  'Interested',
  'Distributor Interested',
  'Trader Interested',
  'Follow Up',
  'Callback',
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

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [dateFilter, setDateFilter] = useState('ALL');
  const [callerFilter, setCallerFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [campaignFilter, setCampaignFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [urlHydrated, setUrlHydrated] = useState(false);

  // Selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCallerId, setBulkCallerId] = useState('ROUND_ROBIN');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals & Popups
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Timeline Inspector Drawer
  const [inspectorLeadId, setInspectorLeadId] = useState(null);
  const [inspectorData, setInspectorData] = useState(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  // Column visibility matching NeoDove specifications
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
  const [newLead, setNewLead] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
    state: '',
    campaign_name: '',
    business_type: '',
    product_interest: '',
    join_as: '',
    start_timeline: '',
    deal_amount: 0,
    lead_status: 'In-Progress',
    assigned_to: '',
    status: 'Fresh Inquiry',
    priority: 'Normal',
    notes: ''
  });
  const [creatingLead, setCreatingLead] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // URL Query Sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qStatus = sp.get('status');
      const qSearch = sp.get('search');
      const qCampaign = sp.get('campaign');
      const qCaller = sp.get('callerId');
      const qDate = sp.get('dateRange');
      if (qStatus) setStageFilter(qStatus);
      if (qSearch) setSearch(qSearch);
      if (qCampaign) setCampaignFilter(qCampaign);
      if (qCaller) setCallerFilter(qCaller);
      if (qDate) setDateFilter(qDate);
      setUrlHydrated(true);
    }
  }, []);

  // Fetch Leads with dynamic filters & server-side pagination
  const fetchLeads = useCallback(async () => {
    if (!urlHydrated) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (stageFilter && stageFilter !== 'ALL') params.set('status', stageFilter);
      if (callerFilter && callerFilter !== 'ALL') params.set('callerId', callerFilter);
      if (campaignFilter && campaignFilter !== 'ALL') params.set('campaign', campaignFilter);
      if (dateFilter && dateFilter !== 'ALL') params.set('dateRange', dateFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
      if (data.users) setUsers(data.users);
      if (data.campaigns) setCampaignOptions(data.campaigns);
      if (data.total !== undefined) setTotalLeads(data.total);
      if (data.totalPages !== undefined) setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  }, [urlHydrated, page, limit, search, stageFilter, callerFilter, campaignFilter, dateFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleOutside = () => {
      setActiveMenuId(null);
      setShowColMenu(false);
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Calculate active filter count for the badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFilter !== 'ALL') count++;
    if (callerFilter !== 'ALL') count++;
    if (stageFilter !== 'ALL') count++;
    if (campaignFilter !== 'ALL') count++;
    if (search.trim() !== '') count++;
    return count;
  }, [dateFilter, callerFilter, stageFilter, campaignFilter, search]);

  const resetAllFilters = () => {
    setDateFilter('ALL');
    setCallerFilter('ALL');
    setStageFilter('ALL');
    setCampaignFilter('ALL');
    setSearch('');
    setPage(1);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/leads');
    }
  };

  // Selection Toggles
  const isAllPageSelected = leads.length > 0 && leads.every(l => selectedIds.includes(l._id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(leads.map(l => l._id));
      setSelectedIds(selectedIds.filter(id => !pageIds.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...leads.map(l => l._id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleLeadSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk Assignment
  const handleBulkAssign = async () => {
    if (!bulkCallerId || selectedIds.length === 0) return;
    setBulkAssigning(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedIds, assigned_to: bulkCallerId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Assigned ${selectedIds.length} leads successfully!`);
        setSelectedIds([]);
        setBulkCallerId('ROUND_ROBIN');
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBulkAssigning(false);
    }
  };

  // Bulk Status Update
  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setBulkAssigning(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedIds, status: bulkStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Updated status of ${selectedIds.length} leads to "${bulkStatus}"!`);
        setSelectedIds([]);
        setBulkStatus('');
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBulkAssigning(false);
    }
  };

  // Create Lead
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.mobile) return;
    setCreatingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewLead({
          name: '',
          mobile: '',
          email: '',
          city: '',
          state: '',
          campaign_name: '',
          business_type: '',
          product_interest: '',
          assigned_to: '',
          status: 'Fresh Inquiry',
          priority: 'Normal',
          notes: ''
        });
        showToast('New lead created successfully!');
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingLead(false);
    }
  };

  // Save Lead Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLead?._id) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: editingLead._id,
          name: editingLead.name,
          mobile: editingLead.mobile,
          email: editingLead.email,
          campaign_name: editingLead.campaign_name,
          status: editingLead.status,
          priority: editingLead.priority,
          city: editingLead.city,
          state: editingLead.state,
          assigned_to: editingLead.assigned_to?._id || editingLead.assigned_to || null,
          lead_status: editingLead.lead_status || 'In-Progress',
          deal_amount: Number(editingLead.deal_amount) || 0,
          follow_up_time: editingLead.follow_up_time || null,
          join_as: editingLead.join_as || '',
          start_timeline: editingLead.start_timeline || '',
          call_attempts: Number(editingLead.call_attempts) || 0,
          notes: editingLead.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Lead ${editingLead.name} updated successfully!`);
        setEditingLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId, leadName) => {
    if (!window.confirm(`Are you sure you want to delete lead "${leadName}"?`)) return;
    try {
      const res = await fetch(`/api/leads?id=${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Lead "${leadName}" removed from directory.`);
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inspector Drawer
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

    const rows = leads.map((l, idx) => {
      const no = (page - 1) * limit + idx + 1;
      const tag = l.priority === 'High' || l.priority === 'VIP' ? 'Hot' : (l.tags?.[0] || 'Hot');
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
        l.assigned_to?.name || 'Unassigned',
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
    link.setAttribute('download', `Kisan_India_Leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startIndex = totalLeads === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalLeads);

  const isFreshDirectory = totalLeads === 0 && !loading && !search && activeFilterCount === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Lead Directory & Management"
        subtitle={
          user?.name
            ? `${user.name.toUpperCase()} — Manage captured prospect leads, assign telecallers, filter pipeline stages & inspect complete audit logs`
            : "Manage captured prospect leads, assign telecallers, filter pipeline stages & inspect complete audit logs"
        }
      />

      <main className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col space-y-4">
        {/* TOAST ALERT BANNER */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
            <Check size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. TOP NEODOVE-STYLE MULTI-DROPDOWN FILTER BAR */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Filter Dropdown Buttons */}
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
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
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
                {STAGE_OPTIONS.map(st => (
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
                {campaignOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Purple Active Filters Pill (Matching Screenshot: Filters 1 ✕) */}
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

            {/* Save / Reset Filter Button */}
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

          {/* Right: Search, Export & Column Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Search by number / name */}
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by number"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Export CSV Download Button (Matching Tray Icon in Screenshot) */}
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

            {/* Add Lead Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
            >
              <UserPlus size={14} /> Add Lead
            </button>
          </div>
        </div>

        {/* 2. STICKY BULK ACTION BAR (Appears on row selection) */}
        {selectedIds.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50/90 border border-purple-200/90 px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#7C3AED] text-white text-xs font-extrabold shadow-2xs">
                {selectedIds.length}
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-[#7C3AED]" />
                  <span><strong className="text-[#7C3AED] font-extrabold">{selectedIds.length}</strong> Leads Selected</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Assign in bulk to telecallers or update pipeline stage
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Telecaller Select */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200/90 shadow-2xs">
                <select
                  value={bulkCallerId}
                  onChange={(e) => setBulkCallerId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  <option value="ROUND_ROBIN">Auto Round-Robin Pool</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  disabled={bulkAssigning}
                  className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {bulkAssigning ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                  Assign Telecaller
                </button>
              </div>

              {/* Status Select */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200/90 shadow-2xs">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  <option value="">Set Stage...</option>
                  {STAGE_OPTIONS.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkStatusChange}
                  disabled={bulkAssigning || !bulkStatus}
                  className="px-3.5 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 text-[#7C3AED] hover:text-[#6D28D9] text-xs font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                >
                  Update Stage
                </button>
              </div>

              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer font-medium flex items-center gap-1"
              >
                <X size={13} />
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* 3. NEODOVE-STYLE LEADS DATA TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto flex-1">
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
                {loading ? (
                  <tr>
                    <td colSpan="12" className="py-16 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-xs font-semibold text-slate-600">Loading leads...</p>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="18" className="py-16 text-center">
                      {isFreshDirectory ? (
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs border border-blue-100">
                            <UserPlus size={22} />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">Your Lead Directory is Fresh &amp; Ready</h4>
                          <p className="text-xs text-slate-500">
                            No prospect leads have been added to your account yet. Add a lead manually or sync directly from Facebook &amp; Instagram Meta Ads.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                              onClick={() => setShowAddModal(true)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <UserPlus size={14} /> Add First Lead
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400">
                          <ShieldAlert size={30} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-sm font-bold text-slate-700">No matching leads found</p>
                          <p className="text-xs text-slate-400 mt-1">Try resetting filters or adjusting search keyword.</p>
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
                  leads.map((lead, idx) => {
                    const isChecked = selectedIds.includes(lead._id);
                    const rowNumber = (page - 1) * limit + idx + 1;
                    const tagLabel = lead.priority === 'High' || lead.priority === 'VIP' ? 'Hot' : 'Hot';

                    return (
                      <tr
                        key={lead._id}
                        className={`hover:bg-slate-50/70 transition-colors border-b border-slate-100 ${
                          isChecked ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-3.5 px-3 text-center cursor-pointer select-none"
                          onClick={(e) => {
                            if (e.target.tagName !== 'INPUT') toggleLeadSelection(lead._id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleLeadSelection(lead._id)}
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

                        {/* Name with Avatar */}
                        {columns.name && (
                          <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {lead.name?.[0]?.toUpperCase() || 'L'}
                              </span>
                              <span title={lead.name}>{lead.name || '—'}</span>
                            </div>
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
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap max-w-[160px] truncate" title={lead.email}>
                            {lead.email || '—'}
                          </td>
                        )}

                        {/* Campaign Name */}
                        {columns.campaign && (
                          <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap max-w-[190px] truncate" title={lead.campaign_name}>
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
                            {lead.assigned_to?.name || 'Unassigned'}
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

                        {/* Action Column: Edit button + 3-dots menu */}
                        {columns.action && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              {/* Edit Button (Matching screenshot purple outline pill) */}
                              <button
                                onClick={() => setEditingLead({ ...lead })}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[#C4B5FD] text-[#6D28D9] bg-[#FAF5FF] hover:bg-[#F3E8FF] transition-colors cursor-pointer"
                              >
                                Edit
                              </button>

                              {/* 3-dots More Actions Menu */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setActiveMenuId(activeMenuId === lead._id ? null : lead._id)}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                                  title="More actions"
                                >
                                  <MoreVertical size={15} />
                                </button>

                                {activeMenuId === lead._id && (
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
                                        openInspector(lead._id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium text-left cursor-pointer"
                                    >
                                      <Eye size={14} className="text-blue-600" />
                                      <span>View Timeline</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setEditingLead({ ...lead });
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium text-left cursor-pointer"
                                    >
                                      <Edit3 size={14} className="text-purple-600" />
                                      <span>Quick Edit Lead</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        handleDeleteLead(lead._id, lead.name);
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

          {/* 4. NEODOVE-STYLE BOTTOM PAGINATION BAR (Exact match to screenshot) */}
          <div className="px-5 py-3 border-t border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              {selectedIds.length > 0 ? (
                <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {selectedIds.length} of {totalLeads} selected
                </span>
              ) : (
                <span className="text-slate-500 font-medium">
                  Total <strong>{totalLeads}</strong> leads captured
                </span>
              )}
            </div>

            {/* Right: Items per page + 1 - 50 of 607 + < > */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Items per page dropdown */}
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
                {startIndex} – {endIndex} of {totalLeads}
              </span>

              {/* Previous / Next Chevron Buttons */}
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
      </main>

      {/* MODAL 1: EDIT LEAD MODAL */}
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
                    {STAGE_OPTIONS.map(st => (
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
                  <label className="font-semibold text-slate-700 block mb-1">User Assigned (Telecaller)</label>
                  <select
                    value={editingLead.assigned_to?._id || editingLead.assigned_to || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, assigned_to: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
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

      {/* MODAL 2: ADD MANUAL LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative border border-slate-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add New Prospect Lead</h3>
              <p className="text-xs text-slate-500 font-medium">Instantly routes and assigns to active telecaller pool</p>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prospect / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  placeholder="Enter prospect full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={newLead.mobile}
                    onChange={e => setNewLead({ ...newLead, mobile: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={newLead.campaign_name}
                    onChange={e => setNewLead({ ...newLead, campaign_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    placeholder="e.g. Agra, WFH"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={newLead.city}
                    onChange={e => setNewLead({ ...newLead, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    placeholder="City / District"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Telecaller</label>
                <select
                  value={newLead.assigned_to}
                  onChange={e => setNewLead({ ...newLead, assigned_to: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">Auto-Distribute (Round-Robin Pool)</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creatingLead}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {creatingLead ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Add Lead to Directory
              </button>
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
