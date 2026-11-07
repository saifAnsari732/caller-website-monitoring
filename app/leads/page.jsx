"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Search,
  Download,
  UserPlus,
  Phone,
  Loader2,
  Eye,
  ShieldAlert,
  X,
  Upload,
  CheckSquare,
  MessageCircle,
  Calendar,
  Clock
} from 'lucide-react';

const STATUS_COLORS = {
  'Fresh Lead': 'bg-blue-50 text-blue-700 border-blue-200/80',
  'Assigned': 'bg-blue-50 text-blue-700 border-blue-200/80',
  'Connected': 'bg-sky-50 text-sky-700 border-sky-200/80',
  'Follow Up': 'bg-amber-50 text-amber-700 border-amber-200/80',
  'Callback': 'bg-amber-50 text-amber-700 border-amber-200/80',
  'Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  'Distributor Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  'Trader Interested': 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  'Not Connected': 'bg-slate-100 text-slate-600 border-slate-200/80',
  'Wrong Number': 'bg-rose-50 text-rose-700 border-rose-200/80',
  'Rejected': 'bg-rose-50 text-rose-700 border-rose-200/80',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [callerFilter, setCallerFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [urlHydrated, setUrlHydrated] = useState(false);
  const [updating, setUpdating] = useState(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCallerId, setBulkCallerId] = useState('ROUND_ROBIN');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Modals & Inspector Drawer
  const [showAddModal, setShowAddModal] = useState(false);
  const [inspectorLeadId, setInspectorLeadId] = useState(null);
  const [inspectorData, setInspectorData] = useState(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  const [newLead, setNewLead] = useState({
    name: '',
    mobile: '',
    city: '',
    state: 'Madhya Pradesh',
    business_type: 'Distributor',
    product_interest: 'Mustard Oil (15L Tin)',
    assigned_to: '',
    notes: ''
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qStatus = sp.get('status');
      const qSearch = sp.get('search');
      const qCampaign = sp.get('campaign');
      const qSource = sp.get('source');
      if (qStatus) setStatusFilter(qStatus);
      if (qSearch) setSearch(qSearch);
      if (qCampaign) setCampaignFilter(qCampaign);
      if (qSource) setSourceFilter(qSource);
      setUrlHydrated(true);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!urlHydrated) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (callerFilter) params.set('callerId', callerFilter);
      if (campaignFilter) params.set('campaign', campaignFilter);
      if (sourceFilter) params.set('source', sourceFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [urlHydrated, search, statusFilter, callerFilter, campaignFilter, sourceFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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

  const handleAssign = async (leadId, userId) => {
    setUpdating(leadId);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, assigned_to: userId }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads(leads.map(l => l._id === leadId ? data.lead : l));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (leadId, status) => {
    setUpdating(leadId);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads(leads.map(l => l._id === leadId ? data.lead : l));
        if (inspectorData?.lead?._id === leadId) {
          setInspectorData({ ...inspectorData, lead: data.lead });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

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
        setSelectedIds([]);
        setBulkCallerId('');
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.mobile) return;
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
          city: '',
          state: 'Madhya Pradesh',
          business_type: 'Distributor',
          product_interest: 'Mustard Oil (15L Tin)',
          assigned_to: '',
          notes: ''
        });
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const header = 'LeadID,Name,Mobile,City,State,BusinessType,ProductInterest,Source,Status,AssignedAgent,CreatedAt';
    const rows = leads.map(l =>
      `"${l.lead_id || ''}","${l.name || ''}","${l.mobile || ''}","${l.city || ''}","${l.state || ''}","${l.business_type || ''}","${l.product_interest || ''}","${l.lead_source || ''}","${l.status || ''}","${l.assigned_to?.name || 'Unassigned'}","${l.createdAt || ''}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `KisanConnect_Leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l._id));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header title="Lead Directory & Assignment Hub" subtitle="Centralized lead operations, bulk telecaller assignment, status filtering & deep timeline inspector" />

      <main className="p-6 lg:p-8 flex-1 flex flex-col space-y-5">
        {/* Top Search & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, city, L-1001..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <select
              value={callerFilter}
              onChange={(e) => setCallerFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Telecallers</option>
              <option value="UNASSIGNED">Unassigned Leads</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="Facebook Meta Lead Ads">Facebook & Instagram Lead Ads</option>
              <option value="Direct Phone / Manual CRM Entry">Direct Manual Entry</option>
            </select>

            {(search || statusFilter || callerFilter || campaignFilter || sourceFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setCallerFilter('');
                  setCampaignFilter('');
                  setSourceFilter('');
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/leads');
                  }
                }}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Reset Filters {campaignFilter ? `(${campaignFilter})` : ''}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus size={15} /> Add Manual Lead
            </button>
          </div>
        </div>

        {/* Bulk Assignment Bar (Visible when checkboxes are selected) */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckSquare size={16} className="text-blue-400" />
              <span>{selectedIds.length} Leads Selected for Bulk Action</span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={bulkCallerId}
                onChange={(e) => setBulkCallerId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
              >
                <option value="ROUND_ROBIN">⚡ Auto Round-Robin Pool (Distribute Evenly)</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.team || 'Sales'})</option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkCallerId || bulkAssigning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                {bulkAssigning ? <Loader2 size={13} className="animate-spin" /> : null}
                {bulkAssigning ? 'Assigning...' : 'Assign Selected Now'}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-400 hover:text-white ml-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Leads Data Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10">
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 pl-5 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedIds.length === leads.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Lead ID</th>
                  <th className="py-3.5 px-4">Prospect & Phone</th>
                  <th className="py-3.5 px-4">Location & Product</th>
                  <th className="py-3.5 px-4">Pipeline Status</th>
                  <th className="py-3.5 px-4">Assigned Telecaller</th>
                  <th className="py-3.5 px-5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-rose-600" />
                      <p className="text-xs font-semibold">Loading leads from MongoDB...</p>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <ShieldAlert size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-bold text-slate-600">No matching leads found</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const isChecked = selectedIds.includes(lead._id);
                    return (
                      <tr key={lead._id} className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-4 pl-5 pr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedIds(
                                isChecked
                                  ? selectedIds.filter(id => id !== lead._id)
                                  : [...selectedIds, lead._id]
                              );
                            }}
                            className="rounded border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-extrabold text-blue-600 tabular-nums">{lead.lead_id}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900 text-sm">{lead.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Phone size={12} className="text-slate-400" />
                            <span className="tabular-nums font-semibold">+91 {lead.mobile}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-800">{lead.product_interest || 'General Oil Inquiry'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {lead.city || 'India'}{lead.state ? `, ${lead.state}` : ''} • {lead.business_type || 'Trader'}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {lead.lead_source || 'Meta Ads'}
                            </span>
                            {lead.campaign_name && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                {lead.campaign_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer focus:outline-none ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
                          >
                            {Object.keys(STATUS_COLORS).map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-4 px-4">
                          {updating === lead._id ? (
                            <Loader2 size={16} className="animate-spin text-rose-600" />
                          ) : (
                            <select
                              value={lead.assigned_to?._id || ''}
                              onChange={(e) => handleAssign(lead._id, e.target.value)}
                              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-800 hover:border-slate-300 focus:outline-none cursor-pointer w-44"
                            >
                              <option value="">Unassigned</option>
                              {users.map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => openInspector(lead._id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye size={14} /> Timeline
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Showing <span className="font-extrabold text-slate-900">{leads.length}</span> leads in directory
            </p>
          </div>
        </div>
      </main>

      {/* SLIDE-OVER LEAD TIMELINE & CALL HISTORY INSPECTOR DRAWER */}
      {inspectorLeadId && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">
                  Lead 360° Inspector {inspectorData?.lead?.lead_id ? `• ${inspectorData.lead.lead_id}` : ''}
                </span>
                <h3 className="text-lg font-extrabold mt-0.5">{inspectorData?.lead?.name || 'Loading...'}</h3>
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
                <Loader2 size={28} className="animate-spin text-rose-600" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Quick Actions */}
                <div className="flex items-center gap-3">
                  <a
                    href={`tel:${inspectorData.lead.mobile}`}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Phone size={14} /> Dial +91 {inspectorData.lead.mobile}
                  </a>
                  <a
                    href={`https://wa.me/91${String(inspectorData.lead.mobile).slice(-10)}?text=${encodeURIComponent(`Namaste ${inspectorData.lead.name} ji, KisanConnect team se sampark kar rahe hain.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14} /> WhatsApp Chat
                  </a>
                </div>

                {/* Metadata Grid */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold">Location</p>
                    <p className="font-bold text-slate-900 mt-0.5">{inspectorData.lead.city || 'N/A'}, {inspectorData.lead.state || 'India'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Business & Product</p>
                    <p className="font-bold text-slate-900 mt-0.5">{inspectorData.lead.business_type || 'Trader'} • {inspectorData.lead.product_interest || 'Oil'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Assigned Telecaller</p>
                    <p className="font-bold text-rose-600 mt-0.5">{inspectorData.lead.assigned_to?.name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Call Attempts</p>
                    <p className="font-bold text-slate-900 mt-0.5">{inspectorData.calls?.length || inspectorData.lead.call_attempts || 0} Calls</p>
                  </div>
                </div>

                {/* Call History */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Logged Calls ({inspectorData.calls?.length || 0})
                  </h4>
                  {(!inspectorData.calls || inspectorData.calls.length === 0) ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                      No calls logged by telecaller yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {inspectorData.calls.map((c) => (
                        <div key={c._id} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[11px] rounded-md">
                              {c.status}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                              <Clock size={11} /> {c.duration}s • {new Date(c.start_time).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{c.notes || 'No notes added.'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Agent: {c.caller?.name || 'Telecaller'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Followups History */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Scheduled Follow-ups ({inspectorData.followups?.length || 0})
                  </h4>
                  {(!inspectorData.followups || inspectorData.followups.length === 0) ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                      No follow-ups scheduled for this lead.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {inspectorData.followups.map((f) => (
                        <div key={f._id} className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Calendar size={13} className="text-amber-600" /> {f.date} at {f.time}
                            </p>
                            <p className="text-slate-600 mt-0.5">{f.notes || 'Follow-up reminder'}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            {f.completed ? 'Completed' : 'Pending'}
                          </span>
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

      {/* ADD MANUAL LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative border border-slate-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Add New Prospect Lead</h3>
              <p className="text-xs text-slate-500">Auto-assigns via Round-Robin if telecaller is left blank</p>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Prospect / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  placeholder="e.g.Ganesh Oil Mill & Traders"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={newLead.mobile}
                  onChange={e => setNewLead({ ...newLead, mobile: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  placeholder="9876543210"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={newLead.city}
                    onChange={e => setNewLead({ ...newLead, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    placeholder="Indore"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Business Type</label>
                  <select
                    value={newLead.business_type}
                    onChange={e => setNewLead({ ...newLead, business_type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="Distributor">Distributor</option>
                    <option value="Trader">Trader</option>
                    <option value="Retail">Retailer</option>
                    <option value="Industrial User">Industrial User</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Interest</label>
                <input
                  type="text"
                  value={newLead.product_interest}
                  onChange={e => setNewLead({ ...newLead, product_interest: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign Telecaller (Optional)</label>
                <select
                  value={newLead.assigned_to}
                  onChange={e => setNewLead({ ...newLead, assigned_to: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="">Auto-Distribute (Round-Robin)</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
              >
                Create & Route Lead
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
