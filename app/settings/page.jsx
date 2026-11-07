"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Facebook,
  Loader2,
  X,
  ChevronDown,
  Check,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Search,
  RefreshCw,
  Copy,
  Plus,
  Trash2,
  GitFork,
  Sliders,
  KeyRound,
  Globe,
  SlidersHorizontal,
  ExternalLink,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Link2,
  CheckSquare,
  Lock,
  ChevronRight
} from 'lucide-react';

const CRM_FIELDS = [
  { value: 'name', label: 'Prospect / Firm Name (name)' },
  { value: 'mobile', label: 'Primary Mobile Number (mobile)' },
  { value: 'email', label: 'Email Address (email)' },
  { value: 'city', label: 'City / District (city)' },
  { value: 'state', label: 'State / Region (state)' },
  { value: 'business_type', label: 'Dealership / Business Type (business_type)' },
  { value: 'product_interest', label: 'Product / Volume Interest (product_interest)' },
  { value: 'notes', label: 'Call / Thread Notes & Meta Inbox (notes)' }
];

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('FORMS'); // 'FORMS' | 'WEBHOOK' | 'OAUTH'

  // Sync states
  const [syncingFormId, setSyncingFormId] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [isFbModalOpen, setIsFbModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // OAuth Form States
  const [customToken, setCustomToken] = useState('');
  const [savingFb, setSavingFb] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Field mapping state for currently edited form
  const [currentMapping, setCurrentMapping] = useState({});

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 6000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Fetch status error:', e);
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Open Real Meta OAuth Flow
  const handleLaunchMetaOAuth = () => {
    const redirectUri = `${window.location.origin}/api/meta/oauth/callback`;
    const appId = status?.appId || '1007200718473332';
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=pages_show_list,pages_read_engagement,pages_manage_ads,pages_manage_metadata,leads_retrieval,ads_management,ads_read&response_type=code&state=kisan_meta_oauth_${Date.now()}`;

    const width = 640;
    const height = 720;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'Meta OAuth 2.0',
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no`
    );

    const onMessage = (event) => {
      if (event.data?.type === 'META_OAUTH_SUCCESS') {
        window.removeEventListener('message', onMessage);
        showToast(`Connected Facebook Page "${event.data.pageName}" via Meta OAuth 2.0!`);
        fetchStatus();
      }
    };
    window.addEventListener('message', onMessage);
  };

  // Full Meta Refresh (Sync real campaigns, forms & leads from Meta Graph API)
  const handleFullMetaSync = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch('/api/meta/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: customToken.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Meta Sync complete! Synced ${data.formsSynced} forms & ${data.realLeadsIngested} leads.`);
        await fetchStatus();
      } else {
        showToast(`Sync alert: ${data.error || 'Failed to complete Meta Sync'}`);
      }
    } catch (e) {
      console.error(e);
      showToast('Error syncing with Meta Graph API.');
    } finally {
      setSyncingAll(false);
    }
  };

  // Sync leads for a specific real Meta Lead Form
  const handleSyncSingleForm = async (formId, formName) => {
    setSyncingFormId(formId);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_FORM_LEADS', formId, count: 10 })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Synced ${data.syncedCount} real leads from "${formName}"!`);
        fetchStatus();
      } else {
        showToast(`Notice: ${data.error || 'No new leads found on Meta'}`);
      }
    } catch (e) {
      console.error(e);
      showToast('Error connecting to Meta Graph API.');
    } finally {
      setSyncingFormId(null);
    }
  };

  // Open Field Mapping Modal for a real form
  const handleOpenFieldMapping = async (form) => {
    setEditingForm(form);
    setCurrentMapping(form.fieldMapping || {});
    setIsMappingModalOpen(true);
    setLoadingQuestions(true);

    try {
      const res = await fetch('/api/meta/forms');
      const data = await res.json();
      const matched = (data.forms || []).find(f => f.id === form.formId);
      if (matched && matched.questions) {
        setAvailableQuestions(matched.questions);
      } else {
        setAvailableQuestions([
          { key: 'full_name', label: 'Full Name', mappedTo: 'name' },
          { key: 'phone_number', label: 'Phone Number', mappedTo: 'mobile' },
          { key: 'email', label: 'Email Address', mappedTo: 'email' },
          { key: 'city', label: 'City / District', mappedTo: 'city' },
          { key: 'inbox_url', label: 'Facebook Messenger Inbox URL', mappedTo: 'notes' }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Save updated Field Mapping to MongoDB
  const handleSaveFieldMapping = async () => {
    if (!editingForm) return;
    try {
      const res = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_FORM_INTEGRATION',
          formId: editingForm.formId,
          formName: editingForm.formName,
          pageName: editingForm.pageName,
          campaignAction: editingForm.campaignAction || 'existing',
          campaignName: editingForm.campaignName,
          distributionRule: editingForm.distributionRule || 'ROUND_ROBIN',
          assignedTeam: editingForm.assignedTeam || 'North Region Sales',
          assignedCallerId: editingForm.assignedCallerId || '',
          assignedCallerName: editingForm.assignedCallerName || 'Auto Round-Robin',
          customizeFields: true,
          fieldMapping: currentMapping,
          captureCount: 0
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Field mapping updated for "${editingForm.formName}"!`);
        setIsMappingModalOpen(false);
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to save field mapping.');
    }
  };

  // Toggle Form active state
  const handleToggleForm = async (formId) => {
    try {
      const res = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_FORM', formId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Form status updated.');
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const metaForms = status?.metaForms || [];
  const filteredForms = metaForms.filter(f =>
    (f.formName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.campaignName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.formId || '').includes(searchQuery)
  );

  const stats = status?.stats || {
    totalMetaLeads: 0,
    todayLeads: 0,
    assignedLeads: 0,
    unassignedLeads: 0,
    convertedLeads: 0,
    urgentZeroLossLeads: 0
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Lead Ads Integration Hub"
        subtitle="Live Facebook & Instagram Lead Ads sync, real OAuth 2.0 connection, leadgen forms routing & webhook telemetry"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        {banner && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{banner}</span>
            </div>
            <button onClick={() => setBanner(null)} className="text-emerald-700 hover:text-emerald-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Hero Card: Connected Facebook Page & Live Meta Status */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 lg:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md shadow-[#1877F2]/20">
                f
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-heading font-extrabold text-slate-900">
                    {status?.pageName || 'Kisan Choice'}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Meta Graph v21.0 Connected
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Page ID: {status?.pageId || '933429549844450'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Ad Account: <strong className="text-slate-700">{status?.adAccountId || 'act_1796071777698019'} (Kisan Kumar)</strong> • Meta App: <strong className="text-slate-700">kisanGroups ({status?.appId || '1007200718473332'})</strong>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleLaunchMetaOAuth}
                className="px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Facebook size={15} />
                <span>Launch Meta OAuth 2.0</span>
              </button>

              <button
                onClick={handleFullMetaSync}
                disabled={syncingAll}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {syncingAll ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                <span>Sync All Forms & Leads</span>
              </button>

              <button
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound size={14} />
                <span>Token</span>
              </button>
            </div>
          </div>

          {/* Collapsible Token Update Drawer */}
          {showTokenInput && (
            <div className="pt-5 pb-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound size={14} className="text-blue-600" /> Page Access Token & System Credentials
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Valid Meta Token Active</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Paste Meta Page Access Token (EAAOUCzEKyHQB...)"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={handleFullMetaSync}
                    disabled={syncingAll || !customToken.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Save & Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Real Live Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Real Leads</div>
              <div className="text-2xl font-heading font-extrabold text-slate-900 mt-1 tabular-nums">
                {stats.totalMetaLeads}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Ingested from Meta Lead Ads</div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/60">
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Today Leads</div>
              <div className="text-2xl font-heading font-extrabold text-blue-700 mt-1 tabular-nums">
                {stats.todayLeads}
              </div>
              <div className="text-[11px] text-blue-600 mt-0.5 font-medium">Live incoming pipeline</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/60">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Assigned to Agents</div>
              <div className="text-2xl font-heading font-extrabold text-emerald-700 mt-1 tabular-nums">
                {stats.assignedLeads}
              </div>
              <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">Cyclic Round-Robin Pool</div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/60">
              <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Active Lead Forms</div>
              <div className="text-2xl font-heading font-extrabold text-indigo-700 mt-1 tabular-nums">
                {metaForms.length}
              </div>
              <div className="text-[11px] text-indigo-600 mt-0.5 font-medium">Page: Kisan Choice</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Linked Real Forms | Webhook Health & Telemetry */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('FORMS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'FORMS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Real Meta Lead Forms ({metaForms.length})
            </button>
            <button
              onClick={() => setActiveTab('WEBHOOK')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'WEBHOOK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Webhook & Zero-Loss Engine
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search forms or campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* TAB 1: Real Meta Lead Forms Table */}
        {activeTab === 'FORMS' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-sm text-slate-900">
                  Live Facebook & Instagram Lead Ads Forms
                </h3>
                <p className="text-xs text-slate-500">
                  Real forms bound to Page "Kisan Choice" (ID: 933429549844450) with automated cyclic distribution
                </p>
              </div>
              <button
                onClick={handleFullMetaSync}
                disabled={syncingAll}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={13} className={syncingAll ? 'animate-spin' : ''} />
                <span>Refresh from Meta</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Lead Form & Meta ID</th>
                    <th className="py-3.5 px-4">Mapped Campaign</th>
                    <th className="py-3.5 px-4">Distribution Strategy</th>
                    <th className="py-3.5 px-4">Assigned Team</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Captured</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredForms.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        No lead forms found. Click "Sync All Forms & Leads" to pull forms from Meta Graph API.
                      </td>
                    </tr>
                  ) : (
                    filteredForms.map((form) => {
                      const isSyncing = syncingFormId === form.formId;
                      return (
                        <tr key={form.formId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{form.formName}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              ID: {form.formId}
                            </div>
                          </td>

                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {form.campaignName || 'Facebook Meta Lead Ads'}
                          </td>

                          <td className="py-4 px-4 font-medium text-slate-600">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {form.distributionRule === 'LOAD_BALANCED' ? 'Load-Balanced Pool' : 'Auto Round-Robin'}
                            </span>
                          </td>

                          <td className="py-4 px-4 font-semibold text-slate-800">
                            {form.assignedTeam || 'North Region Sales'}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => handleToggleForm(form.formId)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                form.active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {form.active !== false ? 'Active' : 'Paused'}
                            </button>
                          </td>

                          <td className="py-4 px-4 text-right font-heading font-bold text-slate-900 tabular-nums">
                            {form.leadsCaptured || 0}
                          </td>

                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSyncSingleForm(form.formId, form.formName)}
                                disabled={isSyncing}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                title="Fetch fresh leads from Meta"
                              >
                                {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                <span>Sync Leads</span>
                              </button>

                              <button
                                onClick={() => handleOpenFieldMapping(form)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Configure question mapping"
                              >
                                <SlidersHorizontal size={12} />
                                <span>Fields</span>
                              </button>
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

        {/* TAB 2: Webhook Health & Zero-Loss Engine */}
        {activeTab === 'WEBHOOK' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-slate-900">
                    Real-time Meta Leadgen Webhook
                  </h3>
                  <p className="text-xs text-slate-500">Live webhook listener subscribed to Meta Page events</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Callback URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://caller-app-1.onrender.com/api/webhooks/meta"
                      className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://caller-app-1.onrender.com/api/webhooks/meta');
                        showToast('Webhook URL copied to clipboard!');
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Verify Token
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={status?.verifyToken || 'OILFLOW_CRM_SECRET_2026'}
                      className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(status?.verifyToken || 'OILFLOW_CRM_SECRET_2026');
                        showToast('Verify token copied!');
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <Check size={14} /> <span>Facebook Page Webhook Subscribed (`leadgen`)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <Check size={14} /> <span>Automatic Cyclic Round-Robin distribution</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <Check size={14} /> <span>Zero Lead Loss protection active</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity size={22} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-slate-900">
                    Zero-Loss Protection Engine
                  </h3>
                  <p className="text-xs text-slate-500">Automated fallback for missing or malformed lead fields</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  When leads are submitted via Facebook or Instagram ads with missing phone numbers, foreign prefixes, or network drops, the Zero-Loss engine:
                </p>
                <ul className="space-y-2 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <span>Saves all raw form field data directly to MongoDB without dropping the prospect.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <span>Flags the record with an <strong className="text-rose-600 font-bold">[Urgent]</strong> tag for senior supervisor inspection.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                    <span>Preserves the direct Facebook Business Inbox URL for one-tap direct messaging.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Urgent Zero-Loss Queue</span>
                <span className="font-bold text-slate-900 tabular-nums">{stats.urgentZeroLossLeads} Leads</span>
              </div>
            </div>
          </div>
        )}

        {/* Real Field Mapping Modal */}
        {isMappingModalOpen && editingForm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    Field Mapping: {editingForm.formName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Map Facebook Meta lead form questions to CRM prospect attributes
                  </p>
                </div>
                <button
                  onClick={() => setIsMappingModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {loadingQuestions ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs">Fetching real form questions from Meta Graph API...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      <span>Meta Lead Question</span>
                      <span>Target CRM Field</span>
                    </div>

                    {availableQuestions.map((q) => {
                      const selectedField = currentMapping[q.key] || q.mappedTo || 'notes';
                      return (
                        <div
                          key={q.key}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate">{q.label || q.key}</div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">{q.key}</div>
                          </div>

                          <div className="w-52">
                            <select
                              value={selectedField}
                              onChange={(e) =>
                                setCurrentMapping((prev) => ({ ...prev, [q.key]: e.target.value }))
                              }
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              {CRM_FIELDS.map((cf) => (
                                <option key={cf.value} value={cf.value}>
                                  {cf.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
                <button
                  onClick={() => setIsMappingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFieldMapping}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Save Mapping
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
