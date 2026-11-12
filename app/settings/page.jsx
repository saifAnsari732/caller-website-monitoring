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
  Link2,
  CheckSquare,
  Lock,
  ChevronRight,
  Flame,
  Sparkles,
  Send,
  MessageSquare,
  AlertTriangle,
  Radio,
  FileSpreadsheet,
  Cpu
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
  const [formFilter, setFormFilter] = useState('ALL'); // 'ALL' | 'WITH_LEADS' | 'ACTIVE' | 'PAUSED'
  const [activeTab, setActiveTab] = useState('FORMS'); // 'FORMS' | 'CAPI' | 'QUALITY' | 'WEBHOOK' | 'DIAGNOSTICS'

  // Sync states
  const [syncingFormId, setSyncingFormId] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Token input state
  const [customToken, setCustomToken] = useState('');
  const [savingFb, setSavingFb] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Field mapping state for currently edited form
  const [currentMapping, setCurrentMapping] = useState({});

  // CAPI state
  const [capiConfig, setCapiConfig] = useState({
    pixelId: '',
    enabled: false,
    testEventCode: '',
    autoSendOnInterested: true,
    autoSendOnClosed: true
  });
  const [savingCapi, setSavingCapi] = useState(false);
  const [capiEvents, setCapiEvents] = useState([]);
  const [testingCapi, setTestingCapi] = useState(false);
  const [capiTestResult, setCapiTestResult] = useState(null);

  // Webhook Simulator state
  const [simFormId, setSimFormId] = useState('');
  const [simName, setSimName] = useState('Rajesh Agro Traders');
  const [simMobile, setSimMobile] = useState('9876543210');
  const [simProduct, setSimProduct] = useState('Mustard Oil 15L Tin Dealership');
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Token Health Diagnostic state
  const [tokenHealth, setTokenHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 6000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/status');
      const data = await res.json();
      setStatus(data);
      if (data.metaCapiConfig) setCapiConfig(data.metaCapiConfig);
      if (data.metaCapiLogs) setCapiEvents(data.metaCapiLogs);
    } catch (e) {
      console.error('Fetch status error:', e);
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchTokenHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/meta/token-health');
      const data = await res.json();
      setTokenHealth(data);
    } catch (err) {
      console.error('Token health fetch failed:', err);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (activeTab === 'DIAGNOSTICS' && !tokenHealth) {
      fetchTokenHealth();
    }
  }, [activeTab, tokenHealth, fetchTokenHealth]);

  // Open Real Meta OAuth Flow
  const handleLaunchMetaOAuth = () => {
    let redirectUri = `${window.location.origin}/api/meta/oauth/callback`;
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      redirectUri = 'https://caller-website-monitoring.vercel.app/api/meta/oauth/callback';
    }
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
        showToast('Meta OAuth 2.0 connected successfully! Long-lived token stored.');
        fetchStatus();
        window.removeEventListener('message', onMessage);
      }
    };
    window.addEventListener('message', onMessage);
  };

  // Full Meta Sync
  const handleFullMetaSync = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_ALL_ACTIVE_FORMS', countPerForm: 10 })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Meta Sync: Ingested ${data.syncedCount || 0} leads across ${data.formsChecked || 0} forms.`);
        fetchStatus();
      } else {
        showToast(`Sync warning: ${data.error || 'No new leads found.'}`);
      }
    } catch (e) {
      showToast('Error syncing forms.');
    } finally {
      setSyncingAll(false);
    }
  };

  // Sync a single Meta form
  const handleSyncSingleForm = async (formId, formName) => {
    setSyncingFormId(formId);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_SINGLE_FORM', formId, count: 20 })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Synced ${data.syncedCount || 0} leads from "${formName}".`);
        fetchStatus();
      } else {
        showToast(data.error || 'No new leads on this form.');
      }
    } catch (e) {
      showToast('Sync failed.');
    } finally {
      setSyncingFormId(null);
    }
  };

  // Open Field Mapping Modal
  const handleOpenFieldMapping = async (form) => {
    setEditingForm(form);
    setIsMappingModalOpen(true);
    setLoadingQuestions(true);
    setCurrentMapping(form.fieldMapping || {});

    try {
      const res = await fetch(`/api/meta/forms?formId=${form.formId}`);
      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setAvailableQuestions(data.questions);
      } else {
        setAvailableQuestions([
          { key: 'full_name', label: 'Full Name', mappedTo: 'name' },
          { key: 'phone_number', label: 'Phone Number', mappedTo: 'mobile' },
          { key: 'email', label: 'Email Address', mappedTo: 'email' },
          { key: 'city', label: 'City', mappedTo: 'city' },
          { key: 'business_type', label: 'Business Type', mappedTo: 'business_type' },
          { key: 'product_interest', label: 'Product Interest', mappedTo: 'product_interest' }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Save updated Field Mapping
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

  // Save CAPI Config
  const handleSaveCapiConfig = async (e) => {
    e.preventDefault();
    setSavingCapi(true);
    try {
      const res = await fetch('/api/meta/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CONFIG',
          ...capiConfig
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Meta Conversions API (CAPI) settings updated!');
        fetchStatus();
      }
    } catch (err) {
      showToast('Failed to save CAPI settings.');
    } finally {
      setSavingCapi(false);
    }
  };

  // Test-Fire CAPI Event
  const handleTestCapiEvent = async (eventName = 'QualifiedLead') => {
    setTestingCapi(true);
    setCapiTestResult(null);
    try {
      const res = await fetch('/api/meta/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_EVENT',
          eventName,
          value: eventName === 'Purchase' ? 10000 : 2500,
          testName: 'Kisan Choice Distributor Indore',
          testMobile: '9876543210',
          testEmail: 'distributor@indore.kisanindia.com'
        })
      });
      const data = await res.json();
      setCapiTestResult(data);
      if (data.success) {
        showToast(`CAPI Event "${eventName}" dispatched successfully!`);
        fetchStatus();
      }
    } catch (err) {
      showToast('CAPI test failed.');
    } finally {
      setTestingCapi(false);
    }
  };

  // Run Webhook Simulation
  const handleRunWebhookSimulator = async (e) => {
    e.preventDefault();
    setSimulatingWebhook(true);
    setSimResult(null);

    const payload = {
      object: 'page',
      entry: [
        {
          id: status?.pageId || '933429549844450',
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'leadgen',
              value: {
                ad_id: '12021590483920042',
                form_id: simFormId || status?.metaForms?.[0]?.formId || '1768141694388234',
                leadgen_id: `SIM-${Date.now()}`,
                created_time: Math.floor(Date.now() / 1000),
                campaign_name: 'Sales - Mirzapur 1 -9/2026, 16:00',
                field_data: [
                  { name: 'full_name', values: [simName] },
                  { name: 'phone_number', values: [simMobile] },
                  { name: 'email', values: ['lead@kisanchoice.com'] },
                  { name: 'city', values: ['Indore'] },
                  { name: 'product_interest', values: [simProduct] }
                ]
              }
            }
          ]
        }
      ]
    };

    try {
      const res = await fetch('/api/webhooks/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSimResult(data);
      if (data.success) {
        showToast(`Webhook Ingestion Simulated: Lead ${data.lead_id} assigned to ${data.assignedTo}!`);
        fetchStatus();
      } else {
        showToast(data.error || 'Simulation returned non-success');
      }
    } catch (err) {
      showToast('Webhook simulation failed.');
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const metaForms = status?.metaForms || [];
  const filteredForms = metaForms.filter((f) => {
    if (formFilter === 'WITH_LEADS' && !(Number(f.leadsCaptured) > 0)) return false;
    if (formFilter === 'ACTIVE' && f.active === false) return false;
    if (formFilter === 'PAUSED' && f.active !== false) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (f.formName || '').toLowerCase().includes(q) ||
      (f.campaignName || '').toLowerCase().includes(q) ||
      String(f.formId || '').includes(q)
    );
  });

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
        title="Meta Lead Ads Enterprise Integration Suite"
        subtitle="Graph v21.0 sync, Conversions API (CAPI), AI anti-spam scoring, live webhook simulator & zero-loss telemetry"
      />

      <main className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full max-w-none">
        {banner && (
          <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{banner}</span>
            </div>
            <button onClick={() => setBanner(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Hero Card: Connected Facebook Page & Live Meta Status */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-7 relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 absolute top-0 left-0 right-0" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                <Facebook size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-heading font-extrabold text-slate-900">
                    {status?.pageName || 'Kisan Choice'}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Meta Graph v21.0 Active
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
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Facebook size={15} />
                <span>Launch Meta OAuth 2.0</span>
              </button>

              <button
                onClick={handleFullMetaSync}
                disabled={syncingAll}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {syncingAll ? <Loader2 size={15} className="animate-spin text-white" /> : <RefreshCw size={15} />}
                <span>Sync All Forms &amp; Leads</span>
              </button>

              <button
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound size={14} className="text-slate-500" />
                <span>Token</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Real Leads</span>
              <span className="text-2xl font-bold font-heading text-slate-900 tabular-nums">{stats.totalMetaLeads}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Ingested from Meta Lead Ads</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Today Leads</span>
              <span className="text-2xl font-bold font-heading text-blue-800 tabular-nums">{stats.todayLeads}</span>
              <p className="text-[11px] text-blue-600 mt-0.5">Live incoming pipeline</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Assigned to Agents</span>
              <span className="text-2xl font-bold font-heading text-emerald-800 tabular-nums">{stats.assignedLeads}</span>
              <p className="text-[11px] text-emerald-600 mt-0.5">Cyclic Round-Robin Pool</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/70">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Active Lead Forms</span>
              <span className="text-2xl font-bold font-heading text-indigo-800 tabular-nums">{metaForms.length}</span>
              <p className="text-[11px] text-indigo-600 mt-0.5">Page: Kisan Choice</p>
            </div>
          </div>
        </div>

        {/* 5 Enterprise Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 rounded-2xl overflow-x-auto">
          {[
            { id: 'FORMS', label: `Real Meta Lead Forms (${metaForms.length})`, icon: FileSpreadsheet },
            { id: 'CAPI', label: 'Conversions API (CAPI)', icon: Zap },
            { id: 'QUALITY', label: 'AI Lead Quality & Anti-Spam', icon: Sparkles },
            { id: 'WEBHOOK', label: 'Webhook & Live Simulator', icon: Radio },
            { id: 'DIAGNOSTICS', label: 'Token & Scopes Health', icon: Cpu }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Real Meta Lead Forms */}
        {activeTab === 'FORMS' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search forms by name, campaign, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {['ALL', 'WITH_LEADS', 'ACTIVE', 'PAUSED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      formFilter === f
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'ALL' ? 'All Forms' : f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Forms Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6">Lead Form &amp; Meta ID</th>
                      <th className="py-3.5 px-4">Mapped Campaign</th>
                      <th className="py-3.5 px-4">Distribution Strategy</th>
                      <th className="py-3.5 px-4">Assigned Team</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">Captured</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredForms.map((form) => (
                      <tr key={form.formId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm">{form.formName}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {form.formId}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-medium">
                          {form.campaignName || form.formName}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {form.distributionRule === 'DIRECT_CALLER' ? 'Direct Caller' : 'Auto Round-Robin'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-semibold">
                          {form.assignedTeam || 'North Region Sales'}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleToggleForm(form.formId)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                              form.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {form.active !== false ? 'Active' : 'Paused'}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-900 tabular-nums">
                          {form.leadsCaptured || 0}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleSyncSingleForm(form.formId, form.formName)}
                            disabled={syncingFormId === form.formId}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-[11px] shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            {syncingFormId === form.formId ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            <span>Sync Leads</span>
                          </button>
                          <button
                            onClick={() => handleOpenFieldMapping(form)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                          >
                            Fields
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Meta Conversions API (CAPI) */}
        {activeTab === 'CAPI' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: CAPI Configuration & Test Dispatcher */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-heading font-bold text-slate-900">
                      Server-Side Conversions API (CAPI) Setup
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dispatches offline lead qualification events to Meta for ad optimization
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveCapiConfig} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Meta Pixel / Dataset ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1007200718473332 or 123456789012345"
                      value={capiConfig.pixelId || ''}
                      onChange={(e) => setCapiConfig({ ...capiConfig, pixelId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Meta Events Manager Test Event Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TEST12345 (Found in Meta Events Manager > Test Events tab)"
                      value={capiConfig.testEventCode || ''}
                      onChange={(e) => setCapiConfig({ ...capiConfig, testEventCode: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={capiConfig.autoSendOnInterested}
                        onChange={(e) => setCapiConfig({ ...capiConfig, autoSendOnInterested: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                      />
                      <span>Auto-send <strong className="text-indigo-600">QualifiedLead</strong> event when telecaller marks prospect as Interested</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={capiConfig.autoSendOnClosed}
                        onChange={(e) => setCapiConfig({ ...capiConfig, autoSendOnClosed: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                      />
                      <span>Auto-send <strong className="text-emerald-600">Purchase</strong> event (₹10,000 value) when deal is marked Closed / Won</span>
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingCapi}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      {savingCapi ? 'Saving CAPI...' : 'Save CAPI Configuration'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Test Event Dispatcher */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                    <Send size={16} className="text-blue-600" />
                    <span>Test-Fire Live CAPI Event</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-400">Meta Graph API v21.0</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Test Meta server-side event transmission with SHA-256 hashed phone, email, and city parameters according to Meta specification.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleTestCapiEvent('QualifiedLead')}
                    disabled={testingCapi}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testingCapi ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    <span>Test "QualifiedLead" (₹2,500)</span>
                  </button>

                  <button
                    onClick={() => handleTestCapiEvent('Purchase')}
                    disabled={testingCapi}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testingCapi ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Test "Purchase" (₹10,000)</span>
                  </button>
                </div>

                {capiTestResult && (
                  <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs font-mono space-y-2 mt-3 overflow-x-auto">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Status: {capiTestResult.status}</span>
                      <span>Latency: {capiTestResult.latencyMs}ms</span>
                    </div>
                    <pre className="text-[11px] text-emerald-400 overflow-x-auto">
                      {JSON.stringify(capiTestResult.payloadSent, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Sent Events Audit Table */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col h-[600px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-heading font-bold text-slate-900">
                  Recent CAPI Dispatches
                </h4>
                <span className="text-xs font-bold text-blue-600">{capiEvents.length} Logged</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {capiEvents.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    No CAPI events dispatched yet. Use the buttons on the left to fire your first event.
                  </div>
                ) : (
                  capiEvents.map((evt) => (
                    <div key={evt.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{evt.eventName}</span>
                        <span className="text-[11px] font-semibold text-emerald-600">₹{evt.value}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Lead: <strong className="text-slate-700">{evt.leadName || evt.leadId}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="font-semibold text-blue-600">{evt.status}</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString('en-IN')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI Lead Quality & Anti-Spam */}
        {activeTab === 'QUALITY' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-7 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-slate-900">
                    AI Lead Intent &amp; Anti-Spam Verification Engine
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Evaluates every incoming Facebook &amp; Instagram submission against 4 heuristic layers to filter fake numbers, test inquiries, and score buyer commercial intent before telecaller routing.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Layer 1: Mobile Integrity</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Validates 10-digit Indian mobile prefixes (6, 7, 8, 9) and traps repeated patterns (e.g. 9999999999).
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">+35 Score</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Layer 2: Fake Name Trap</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Filters out test inputs ("asdf", "test", "demo", "xyz") and ensures minimum 2 alphabetic characters.
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">+25 Score</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Layer 3: Email Validity</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    RFC 5322 syntax validation; boosts genuine business and domain email providers.
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">+20 Score</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Layer 4: Commercial Intent</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Checks explicit business type (Distributor/Trader) &amp; volume requirement selections.
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">+20 Score</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Webhook & Live Simulator */}
        {activeTab === 'WEBHOOK' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Webhook URL & Simulator Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Webhook Credentials Box */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <h4 className="text-sm font-heading font-bold text-slate-900">
                  Meta Graph API Webhook Configuration
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Callback URL (Webhook Receiver)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={status?.webhookUrl || 'https://caller-website-monitoring.vercel.app/api/webhooks/meta'}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(status?.webhookUrl || 'https://caller-website-monitoring.vercel.app/api/webhooks/meta');
                          showToast('Webhook URL copied to clipboard!');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={13} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Verify Token</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={status?.verifyToken || 'KISAN_META_WEBHOOK_VERIFY'}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(status?.verifyToken || 'KISAN_META_WEBHOOK_VERIFY');
                          showToast('Verify Token copied!');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={13} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Webhook Simulator */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                      <Radio size={16} className="text-blue-600" />
                      <span>Interactive Webhook Leadgen Simulator</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Test-fire a mock Meta Lead Ads event to test round-robin routing &amp; ingestion
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRunWebhookSimulator} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Prospect Name</label>
                      <input
                        type="text"
                        value={simName}
                        onChange={(e) => setSimName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={simMobile}
                        onChange={(e) => setSimMobile(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Product Inquired</label>
                    <input
                      type="text"
                      value={simProduct}
                      onChange={(e) => setSimProduct(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={simulatingWebhook}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      {simulatingWebhook ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      <span>Trigger Webhook Test</span>
                    </button>
                  </div>
                </form>

                {simResult && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 size={15} />
                      <span>Ingestion Successful ({simResult.latencyMs}ms)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>Lead ID: <strong className="text-slate-900">{simResult.lead_id}</strong></div>
                      <div>Assigned Telecaller: <strong className="text-blue-700">{simResult.assignedTo}</strong></div>
                      <div>Quality Score: <strong className="text-emerald-700">{simResult.qualityScore}/100</strong></div>
                      <div>Intent Tier: <strong className="text-purple-700">{simResult.qualityTier}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Webhook Event Stream */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col h-[560px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-heading font-bold text-slate-900">
                  Live Webhook Ingestion Log
                </h4>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Zero-Loss Engine Active
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {(status?.metaWebhookLogs || []).length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    No webhook events recorded in this session. Trigger a test event on the left.
                  </div>
                ) : (
                  (status?.metaWebhookLogs || []).map((log) => (
                    <div key={log.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{log.leadName}</span>
                        <span className="text-[11px] font-bold text-blue-600">{log.leadId}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex justify-between">
                        <span>Agent: <strong className="text-slate-700">{log.assignedTo}</strong></span>
                        <span className="text-emerald-600 font-semibold">{log.qualityTier || 'Verified'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-0.5">
                        <span>{log.status} ({log.latencyMs}ms)</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString('en-IN')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Token & Scopes Health */}
        {activeTab === 'DIAGNOSTICS' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-7 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-slate-900">
                    Meta Graph API v21.0 Token &amp; Permission Scopes
                  </h3>
                  <p className="text-xs text-slate-500">Live inspection of granted Facebook &amp; Instagram permissions</p>
                </div>
              </div>
              <button
                onClick={fetchTokenHealth}
                disabled={loadingHealth}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className={loadingHealth ? 'animate-spin' : ''} />
                <span>Re-Check Health</span>
              </button>
            </div>

            {loadingHealth ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <span className="text-xs">Querying Meta Graph API v21.0 debug endpoint...</span>
              </div>
            ) : tokenHealth ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Token Expiration</span>
                    <span className="text-base font-bold text-emerald-700 block mt-1">{tokenHealth.expiresAt}</span>
                    <span className="text-[11px] text-slate-500">{tokenHealth.tokenType}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Facebook Page</span>
                    <span className="text-base font-bold text-slate-900 block mt-1">{tokenHealth.pageName}</span>
                    <span className="text-[11px] text-slate-500">Page ID: {tokenHealth.pageId}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Webhook Subscription</span>
                    <span className="text-base font-bold text-blue-700 block mt-1">leadgen Subscribed</span>
                    <span className="text-[11px] text-slate-500">App ID: {tokenHealth.appId}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                    Verified Meta Graph API Scopes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(tokenHealth.scopes || []).map((sc) => (
                      <div key={sc.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-900 block">{sc.name}</span>
                          <span className="text-[11px] text-slate-500">{sc.description || 'Active Permission'}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                          <Check size={11} />
                          <span>GRANTED</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Real Field Mapping Modal */}
        {isMappingModalOpen && editingForm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
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
