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
  Cpu,
  Save,
  Eye,
  EyeOff,
  UserCheck,
  Share2
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
  const [activeTab, setActiveTab] = useState('INTEGRATION'); // 'INTEGRATION' | 'FORMS' | 'CAPI' | 'QUALITY' | 'WEBHOOK' | 'DIAGNOSTICS'
  const [integrationModeTab, setIntegrationModeTab] = useState('OAUTH'); // 'OAUTH' | 'MANUAL'

  // Sync states
  const [syncingFormId, setSyncingFormId] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Manual Setup State
  const [manualToken, setManualToken] = useState('');
  const [manualAppId, setManualAppId] = useState('');
  const [manualAppSecret, setManualAppSecret] = useState('');
  const [manualPageId, setManualPageId] = useState('');
  const [manualPageName, setManualPageName] = useState('');
  const [manualAdAccountId, setManualAdAccountId] = useState('');
  const [manualFormId, setManualFormId] = useState('');
  const [manualVerifyToken, setManualVerifyToken] = useState('');
  const [manualWebhookUrl, setManualWebhookUrl] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);
  const [showManualSecret, setShowManualSecret] = useState(false);
  const [testingManual, setTestingManual] = useState(false);
  const [manualTestResult, setManualTestResult] = useState(null);
  const [savingManual, setSavingManual] = useState(false);

  // Test Lead Webhook Sender State
  const [testLeadModalOpen, setTestLeadModalOpen] = useState(false);
  const [testLeadFormId, setTestLeadFormId] = useState('');
  const [testLeadName, setTestLeadName] = useState('');
  const [testLeadPhone, setTestLeadPhone] = useState('');
  const [testLeadEmail, setTestLeadEmail] = useState('');
  const [testLeadCity, setTestLeadCity] = useState('');
  const [testLeadState, setTestLeadState] = useState('');
  const [testLeadBusiness, setTestLeadBusiness] = useState('');
  const [testLeadProduct, setTestLeadProduct] = useState('');
  const [sendingTestLead, setSendingTestLead] = useState(false);
  const [testLeadResult, setTestLeadResult] = useState(null);

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
  const [simName, setSimName] = useState('');
  const [simMobile, setSimMobile] = useState('');
  const [simProduct, setSimProduct] = useState('');
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Token Health Diagnostic state
  const [tokenHealth, setTokenHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // NeoDove & Multi-Webhook Hub State
  const [neodoveConfig, setNeodoveConfig] = useState({
    enabled: false,
    webhookUrl: '',
    apiKey: '',
    secretToken: '',
    autoSync: false,
    leadsCaptured: 0,
    leadsSyncedOut: 0
  });
  const [savingNeoConfig, setSavingNeoConfig] = useState(false);
  const [testingNeoSync, setTestingNeoSync] = useState(false);
  const [simulatingNeoInbound, setSimulatingNeoInbound] = useState(false);
  const [simulatingWebInbound, setSimulatingWebInbound] = useState(false);
  const [neoSimResult, setNeoSimResult] = useState(null);
  const [webSimResult, setWebSimResult] = useState(null);
  const [neoSimForm, setNeoSimForm] = useState({
    name: 'Vikram Singh (Distributor)',
    mobile: '9826012345',
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    campaign_name: 'NeoDove Oil Inflow',
    stage: 'Interested'
  });
  const [webSimForm, setWebSimForm] = useState({
    name: 'Pooja Sharma',
    mobile: '9893012345',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    campaign_name: 'Google Ads Landing Page',
    lead_source: 'Website Landing Page'
  });

  const fetchNeoConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/neodove');
      const data = await res.json();
      if (data.config) {
        setNeodoveConfig(data.config);
      }
    } catch (e) {
      console.error('Fetch NeoDove config error:', e);
    }
  }, []);

  const handleSaveNeoConfig = async (e) => {
    e?.preventDefault();
    setSavingNeoConfig(true);
    try {
      const res = await fetch('/api/integrations/neodove', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neodoveConfig)
      });
      const data = await res.json();
      if (data.success) {
        showToast('NeoDove CRM synchronization settings saved successfully!');
        fetchNeoConfig();
      } else {
        showToast('Failed to save NeoDove settings: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      showToast('Error saving settings: ' + e.message);
    } finally {
      setSavingNeoConfig(false);
    }
  };

  const handleTestNeoSync = async () => {
    setTestingNeoSync(true);
    try {
      const res = await fetch('/api/integrations/neodove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testLead: true })
      });
      const data = await res.json();
      if (data.success) {
        showToast('NeoDove Ping Dispatched! Response: ' + JSON.stringify(data.syncResult?.statusCode || 'OK'));
        fetchNeoConfig();
      } else {
        showToast('NeoDove test failed: ' + (data.syncResult?.error || data.error || 'Check webhook URL'));
      }
    } catch (e) {
      showToast('Connection test error: ' + e.message);
    } finally {
      setTestingNeoSync(false);
    }
  };

  const handleSimulateNeoLead = async (e) => {
    e.preventDefault();
    setSimulatingNeoInbound(true);
    setNeoSimResult(null);
    try {
      const res = await fetch('/api/webhooks/neodove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neoSimForm)
      });
      const data = await res.json();
      setNeoSimResult(data);
      if (data.success) {
        showToast(`NeoDove Inbound Simulated! Lead ${data.results?.[0]?.lead_id} assigned to ${data.results?.[0]?.assigned_to}`);
        fetchNeoConfig();
      } else {
        showToast('Simulation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      showToast('Simulation error: ' + e.message);
    } finally {
      setSimulatingNeoInbound(false);
    }
  };

  const handleSimulateWebLead = async (e) => {
    e.preventDefault();
    setSimulatingWebInbound(true);
    setWebSimResult(null);
    try {
      const res = await fetch('/api/webhooks/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webSimForm)
      });
      const data = await res.json();
      setWebSimResult(data);
      if (data.success) {
        showToast(`Landing Page Lead Simulated! Lead ${data.results?.[0]?.lead_id} assigned to ${data.results?.[0]?.assigned_to}`);
      } else {
        showToast('Simulation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      showToast('Simulation error: ' + e.message);
    } finally {
      setSimulatingWebInbound(false);
    }
  };

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 6000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/status');
      const data = await res.json();
      setStatus(data);

      if (data.integrationMode) {
        setIntegrationModeTab(data.integrationMode);
      }
      if (data.appId) setManualAppId(data.appId);
      if (data.pageId) setManualPageId(data.pageId);
      if (data.pageName) setManualPageName(data.pageName);
      if (data.adAccountId) setManualAdAccountId(data.adAccountId);
      if (data.verifyToken) setManualVerifyToken(data.verifyToken);
      if (data.webhookUrl) setManualWebhookUrl(data.webhookUrl);

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
    fetchNeoConfig();
    const interval = setInterval(() => {
      fetchStatus();
      fetchNeoConfig();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchNeoConfig]);

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
    const appId = status?.appId || manualAppId || '1007200718473332';
    const configId = status?.configId || '2583186895497299';

    // Facebook Login for Business strictly requires config_id, response_type=code, and auth_type=rerequest
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(
      appId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&config_id=${encodeURIComponent(
      configId
    )}&response_type=code&auth_type=rerequest&state=kisan_meta_oauth_${Date.now()}`;

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

  // Test Manual Connection against Graph API
  const handleTestManualConnection = async () => {
    if (!manualToken || manualToken.trim().length < 15) {
      showToast('Please enter a valid Meta Access Token (starts with EAA...)');
      return;
    }
    setTestingManual(true);
    setManualTestResult(null);

    try {
      const res = await fetch('/api/meta/manual-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          accessToken: manualToken.trim(),
          appId: manualAppId.trim(),
          pageId: manualPageId.trim()
        })
      });
      const data = await res.json();
      setManualTestResult(data);
      if (data.success) {
        showToast(`Token Verified: Connected to "${data.pageName}" with ${data.formsCount} forms!`);
        if (data.pageId) setManualPageId(data.pageId);
        if (data.pageName) setManualPageName(data.pageName);
      } else {
        showToast(`Validation Failed: ${data.error || 'Invalid Meta Token'}`);
      }
    } catch (err) {
      showToast('Connection test failed: ' + err.message);
    } finally {
      setTestingManual(false);
    }
  };

  // Save and Activate Manual Setup
  const handleSaveManualConfig = async (e) => {
    if (e) e.preventDefault();
    if (!manualToken && !status?.hasToken) {
      showToast('Please provide a valid Meta Access Token.');
      return;
    }
    setSavingManual(true);

    try {
      const res = await fetch('/api/meta/manual-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_MANUAL_CONFIG',
          accessToken: manualToken.trim(),
          appId: manualAppId.trim(),
          appSecret: manualAppSecret.trim(),
          pageId: manualPageId.trim(),
          pageName: manualPageName.trim(),
          adAccountId: manualAdAccountId.trim(),
          verifyToken: manualVerifyToken.trim(),
          webhookUrl: manualWebhookUrl.trim(),
          primaryFormId: manualFormId.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Manual Setup Activated Successfully!');
        fetchStatus();
      } else {
        showToast(data.error || 'Failed to save manual setup.');
      }
    } catch (err) {
      showToast('Failed to save: ' + err.message);
    } finally {
      setSavingManual(false);
    }
  };

  // Send Test Lead through Real Webhook Ingestion Engine
  const openTestLeadModal = () => {
    if (!testLeadFormId && status?.metaForms?.[0]?.formId) {
      setTestLeadFormId(status.metaForms[0].formId);
    }
    setTestLeadPhone('98' + Math.floor(10000000 + Math.random() * 90000000));
    setTestLeadResult(null);
    setTestLeadModalOpen(true);
  };

  const handleSendTestLead = async (e) => {
    if (e) e.preventDefault();
    setSendingTestLead(true);
    setTestLeadResult(null);

    const activeFormId = testLeadFormId || status?.metaForms?.[0]?.formId || '';
    const activeForm = (status?.metaForms || []).find(f => String(f.formId) === String(activeFormId));

    try {
      const res = await fetch('/api/meta/manual-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_TEST_LEAD',
          formId: activeFormId,
          formName: activeForm?.formName || 'Meta Ads Form',
          prospectName: testLeadName,
          mobileNumber: testLeadPhone,
          emailAddress: testLeadEmail,
          cityName: testLeadCity,
          stateName: testLeadState,
          businessType: testLeadBusiness,
          productInterest: testLeadProduct
        })
      });
      const data = await res.json();
      setTestLeadResult(data);
      if (data.success) {
        showToast(`Meta Lead Ingested & Verified! Lead ID: ${data.lead.lead_id} assigned to ${data.lead.assignedTo}.`);
        fetchStatus();
      } else {
        showToast(data.error || 'Test lead simulation failed.');
      }
    } catch (err) {
      showToast('Error sending test lead: ' + err.message);
    } finally {
      setSendingTestLead(false);
    }
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
          config: capiConfig
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Conversions API (CAPI) configuration saved!');
        fetchStatus();
      } else {
        showToast(data.error || 'Failed to update CAPI config.');
      }
    } catch (e) {
      showToast('Error saving CAPI.');
    } finally {
      setSavingCapi(false);
    }
  };

  // Test Fire CAPI Event
  const handleTestCapiEvent = async (eventName = 'QualifiedLead') => {
    setTestingCapi(true);
    setCapiTestResult(null);
    try {
      const res = await fetch('/api/meta/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_FIRE',
          eventName,
          leadName: 'Vikramaditya Verma (Test)',
          phone: '9876543299',
          email: 'lead@kisanchoice.com',
          city: 'Indore',
          state: 'Madhya Pradesh',
          value: eventName === 'Purchase' ? 25000 : 500
        })
      });
      const data = await res.json();
      setCapiTestResult(data);
      if (data.success) {
        showToast(`CAPI ${eventName} dispatched! Events received: ${data.events_received || 1}`);
        fetchStatus();
      } else {
        showToast(`CAPI warning: ${data.error || 'Failed to dispatch'}`);
      }
    } catch (e) {
      showToast('Failed to fire CAPI event.');
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
          id: status?.pageId || '',
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'leadgen',
              value: {
                ad_id: '',
                form_id: simFormId || status?.metaForms?.[0]?.formId || '',
                leadgen_id: `SIM-${Date.now()}`,
                created_time: Math.floor(Date.now() / 1000),
                campaign_name: status?.metaForms?.[0]?.campaignName || 'Meta Ads Campaign',
                field_data: [
                  { name: 'full_name', values: [simName] },
                  { name: 'phone_number', values: [simMobile] },
                  { name: 'product_interest', values: [simProduct || ''] }
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
        showToast(`Webhook Ingestion Simulated: Lead ${data.lead?.lead_id || data.lead_id} assigned to ${data.lead?.assignedTo || data.assignedTo}!`);
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
        subtitle="Dual Integration (OAuth 2.0 & Manual Token/Webhook), CAPI, Anti-Spam scoring & zero-loss telemetry"
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
                    {status?.pageName || manualPageName || 'Kisan Choice'}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Meta Graph v21.0 Active
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Mode: {status?.integrationMode === 'MANUAL' ? 'Manual Setup' : 'OAuth 2.0'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Page ID: {status?.pageId || manualPageId || 'Not Configured'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Ad Account: <strong className="text-slate-700">{status?.adAccountId || manualAdAccountId || 'Not Configured'}</strong> • App ID: <strong className="text-slate-700">{status?.appId || manualAppId || 'Not Configured'}</strong>
                </p>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  setActiveTab('INTEGRATION');
                  setIntegrationModeTab('OAUTH');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                  integrationModeTab === 'OAUTH' && activeTab === 'INTEGRATION'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Facebook size={15} />
                <span>OAuth 2.0 Flow</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('INTEGRATION');
                  setIntegrationModeTab('MANUAL');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                  integrationModeTab === 'MANUAL' && activeTab === 'INTEGRATION'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <KeyRound size={15} />
                <span>Manual Setup</span>
              </button>

              <button
                onClick={openTestLeadModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Zap size={14} className="text-amber-300" />
                <span>Send Test Lead</span>
              </button>

              <button
                onClick={handleFullMetaSync}
                disabled={syncingAll}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {syncingAll ? <Loader2 size={15} className="animate-spin text-white" /> : <RefreshCw size={15} />}
                <span>Sync Forms</span>
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
              <p className="text-[11px] text-indigo-600 mt-0.5">Page: {status?.pageName || manualPageName}</p>
            </div>
          </div>
        </div>

        {/* 7 Enterprise Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 rounded-2xl overflow-x-auto">
          {[
            { id: 'INTEGRATION', label: 'Dual Integration Hub (OAuth / Manual)', icon: Link2 },
            { id: 'FORMS', label: `Real Meta Lead Forms (${metaForms.length})`, icon: FileSpreadsheet },
            { id: 'NEODOVE', label: 'NeoDove CRM & Multi-Webhook Hub', icon: Share2 },
            { id: 'WEBHOOK', label: 'Webhook & Live Simulator', icon: Radio },
            { id: 'CAPI', label: 'Conversions API (CAPI)', icon: Zap },
            { id: 'QUALITY', label: 'AI Lead Quality & Anti-Spam', icon: Sparkles },
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

        {/* TAB 0: Dual Integration Hub */}
        {activeTab === 'INTEGRATION' && (
          <div className="space-y-6">
            {/* Sub-Switch for OAuth vs Manual */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIntegrationModeTab('OAUTH')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    integrationModeTab === 'OAUTH'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Facebook size={16} />
                  <span>Method 1: Facebook OAuth 2.0 (Automated)</span>
                </button>

                <button
                  onClick={() => setIntegrationModeTab('MANUAL')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    integrationModeTab === 'MANUAL'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <KeyRound size={16} />
                  <span>Method 2: Manual Setup (Token &amp; Webhook)</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Both methods support Zero-Loss Ingestion &amp; Live Round-Robin</span>
              </div>
            </div>

            {/* METHOD 1: OAUTH 2.0 FLOW */}
            {integrationModeTab === 'OAUTH' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                      <Facebook size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-bold text-slate-900">
                        Method 1: Official Facebook OAuth 2.0 Handshake
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        1-Click connection using Facebook Login for Business dialog. Exchanges code for a 60-day auto-renewing Page Access Token and subscribes to real-time Lead Ads notifications.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleLaunchMetaOAuth}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      <Facebook size={16} />
                      <span>Connect with Facebook (OAuth Dialog)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Facebook Page</span>
                    <span className="text-base font-bold text-slate-900 block">{status?.pageName || 'Not Connected'}</span>
                    <span className="text-xs text-slate-500 font-mono">Page ID: {status?.pageId || 'Not Configured'}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Facebook App ID &amp; Config</span>
                    <span className="text-base font-bold text-slate-900 block font-mono">{status?.appId || 'Not Configured'}</span>
                    <span className="text-xs text-slate-500">{status?.configId ? `Config ID: ${status.configId}` : ''}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">OAuth Handshake Scopes</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['leads_retrieval', 'pages_manage_ads', 'pages_show_list', 'pages_read_engagement'].map(sc => (
                        <span key={sc} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                          {sc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-950 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2 text-blue-900">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <span>How OAuth Flow Works</span>
                  </div>
                  <p className="text-blue-800 leading-relaxed text-[11px]">
                    Clicking <strong>Connect with Facebook</strong> opens the official Meta authorization window. Upon approval, Facebook redirects to <code>/api/meta/oauth/callback</code>, securely fetches your permanent Page Access Token, discovers all connected Kisan Choice leadgen forms, and automatically subscribes your page to real-time webhook callbacks.
                  </p>
                </div>
              </div>
            )}

            {/* METHOD 2: MANUAL SETUP FLOW */}
            {integrationModeTab === 'MANUAL' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                      <KeyRound size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-bold text-slate-900">
                        Method 2: Manual Meta Token &amp; Webhook Configuration
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        Directly enter your Meta System User / Page Access Token, App Secret, and configure Webhook Callback URL and Verify Token for permanent, non-expiring lead ingestion.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleTestManualConnection}
                      disabled={testingManual}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {testingManual ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                      <span>Test Connection</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveManualConfig}
                      disabled={savingManual}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {savingManual ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Save &amp; Activate Setup</span>
                    </button>
                  </div>
                </div>

                {/* Manual Credentials Form */}
                <form onSubmit={handleSaveManualConfig} className="space-y-5">
                  {/* Token Row */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <KeyRound size={14} className="text-emerald-600" />
                        <span>Meta Access Token (Page Access Token or System User Token)</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">Starts with EAA...</span>
                    </div>

                    <div className="relative">
                      <input
                        type={showManualToken ? 'text' : 'password'}
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="Paste Meta Page Access Token (EAABw...)"
                        className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowManualToken(!showManualToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showManualToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Generated from <strong>Meta Business Suite &gt; Settings &gt; System Users</strong> with <code>leads_retrieval</code> and <code>pages_manage_ads</code> scopes.
                    </p>
                  </div>

                  {/* App ID & Secret */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Meta App ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualAppId}
                        onChange={(e) => setManualAppId(e.target.value)}
                        placeholder="1007200718473332"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Meta App Secret (for Webhook Signature Verification)
                      </label>
                      <div className="relative">
                        <input
                          type={showManualSecret ? 'text' : 'password'}
                          value={manualAppSecret}
                          onChange={(e) => setManualAppSecret(e.target.value)}
                          placeholder="App Secret from Basic Settings"
                          className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowManualSecret(!showManualSecret)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showManualSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Page ID, Page Name, Ad Account ID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Facebook Page ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualPageId}
                        onChange={(e) => setManualPageId(e.target.value)}
                        placeholder="e.g. 933429549844450"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Page Name
                      </label>
                      <input
                        type="text"
                        value={manualPageName}
                        onChange={(e) => setManualPageName(e.target.value)}
                        placeholder="e.g. Kisan Choice"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Ad Account ID
                      </label>
                      <input
                        type="text"
                        value={manualAdAccountId}
                        onChange={(e) => setManualAdAccountId(e.target.value)}
                        placeholder="e.g. act_1796071777698019"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  {/* Webhook Configuration Details */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio size={16} className="text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Meta Webhook Subscription Credentials
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Zero-Loss Receiver Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          Callback URL (Paste in Meta Developer Console)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={manualWebhookUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/meta`}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(manualWebhookUrl || `${window.location.origin}/api/webhooks/meta`);
                              showToast('Webhook Callback URL copied!');
                            }}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Copy size={13} />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          Verify Token (Paste in Meta Developer Console)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={manualVerifyToken}
                            onChange={(e) => setManualVerifyToken(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(manualVerifyToken);
                              showToast('Verify Token copied!');
                            }}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Copy size={13} />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Connection Result Card */}
                  {manualTestResult && (
                    <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
                      manualTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
                    }`}>
                      <div className="font-bold flex items-center gap-2">
                        {manualTestResult.success ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <span>Connection Diagnostic Passed!</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={16} className="text-red-600 shrink-0" />
                            <span>Connection Diagnostic Failed</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px]">{manualTestResult.message || manualTestResult.error}</p>
                      {manualTestResult.tokenDebug && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                          <div>Expires: <strong className="text-slate-900">{manualTestResult.tokenDebug.expiresAt}</strong></div>
                          <div>Token Type: <strong className="text-slate-900">{manualTestResult.tokenDebug.type}</strong></div>
                          <div>Forms Discovered: <strong className="text-blue-700">{manualTestResult.formsCount || 0}</strong></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Buttons Row */}
                  <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={openTestLeadModal}
                      className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Zap size={14} className="text-purple-600" />
                      <span>Send Test Lead Webhook</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleTestManualConnection}
                        disabled={testingManual}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {testingManual ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                        <span>Test Connection</span>
                      </button>

                      <button
                        type="submit"
                        disabled={savingManual}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        {savingManual ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Save &amp; Activate Manual Setup</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

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
                    {filteredForms.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No Meta lead forms matching your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredForms.map((f) => (
                        <tr key={f.formId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-900">
                            <div>{f.formName}</div>
                            <div className="text-[10px] font-mono text-slate-400">ID: {f.formId}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{f.campaignName || 'Meta Ads'}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">
                              {f.distributionRule || 'ROUND_ROBIN'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{f.assignedTeam || 'North Region Sales'}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              f.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${f.active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{f.active !== false ? 'Active' : 'Paused'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900 tabular-nums">
                            {f.leadsCaptured || 0}
                          </td>
                          <td className="py-3.5 px-6 text-right space-x-1.5">
                            <button
                              onClick={() => handleSyncSingleForm(f.formId, f.formName)}
                              disabled={syncingFormId === f.formId}
                              title="Sync leads from this form"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw size={13} className={syncingFormId === f.formId ? 'animate-spin' : ''} />
                            </button>
                            <button
                              onClick={() => handleOpenFieldMapping(f)}
                              title="Configure Field Mapping"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <SlidersHorizontal size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleForm(f.formId)}
                              title={f.active !== false ? 'Pause Form' : 'Activate Form'}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Activity size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Webhook & Live Simulator */}
        {activeTab === 'WEBHOOK' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                      Test-fire a live Meta Lead Ads event to test round-robin routing &amp; ingestion
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
                        placeholder="Vikramaditya Verma"
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
                        placeholder="9876543299"
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
                      placeholder="Mustard Oil (15L Tin)"
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
                      <div>Lead ID: <strong className="text-slate-900">{simResult.lead?.lead_id || simResult.lead_id}</strong></div>
                      <div>Assigned Telecaller: <strong className="text-blue-700">{simResult.lead?.assignedTo || simResult.assignedTo}</strong></div>
                      <div>Quality Score: <strong className="text-emerald-700">{simResult.lead?.qualityScore || simResult.qualityScore}/100</strong></div>
                      <div>Intent Tier: <strong className="text-purple-700">{simResult.lead?.qualityTier || simResult.qualityTier}</strong></div>
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

        {/* TAB 3: Conversions API (CAPI) */}
        {activeTab === 'CAPI' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-7 space-y-6">
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-slate-900">
                    Meta Conversions API (CAPI) Engine
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Sends server-side qualification events back to Meta Ads to train delivery algorithms on high-value distributor leads.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveCapiConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Meta Pixel / Dataset ID</label>
                    <input
                      type="text"
                      value={capiConfig.pixelId}
                      onChange={(e) => setCapiConfig({ ...capiConfig, pixelId: e.target.value })}
                      placeholder="e.g. 109283746592837"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Test Event Code (Meta Events Manager)</label>
                    <input
                      type="text"
                      value={capiConfig.testEventCode}
                      onChange={(e) => setCapiConfig({ ...capiConfig, testEventCode: e.target.value })}
                      placeholder="e.g. TEST12345"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestCapiEvent('QualifiedLead')}
                      disabled={testingCapi}
                      className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {testingCapi ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                      <span>Test Fire QualifiedLead</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={savingCapi}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingCapi ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save CAPI Settings</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col h-[500px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-heading font-bold text-slate-900">Recent CAPI Dispatches</h4>
                <span className="text-xs font-bold text-blue-600">{capiEvents.length} Logged</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {capiEvents.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    No CAPI events dispatched yet.
                  </div>
                ) : (
                  capiEvents.map((evt) => (
                    <div key={evt.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{evt.eventName}</span>
                        <span className="text-[11px] font-semibold text-emerald-600">₹{evt.value}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">Lead: <strong className="text-slate-700">{evt.leadName}</strong></div>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-1">
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

        {/* TAB 4: AI Lead Quality & Anti-Spam */}
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
                    Evaluates incoming Facebook &amp; Instagram submissions against 4 heuristic layers to score buyer commercial intent before telecaller routing.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Layer 1: Mobile Integrity</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Validates 10-digit Indian mobile prefixes (6, 7, 8, 9) and traps repeated patterns.
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">+35 Score</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Layer 2: Fake Name Trap</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Filters out test inputs ("asdf", "test", "demo", "xyz") and ensures real names.
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

        {/* TAB 2: NeoDove CRM & Multi-Webhook Hub */}
        {activeTab === 'NEODOVE' && (
          <div className="space-y-6">
            {/* Top Overview Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Share2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-heading font-bold text-slate-900">
                        NeoDove CRM &amp; Multi-Source Lead Webhook Hub
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Dual Coexistence Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Preserve full NeoDove capabilities, receive leads via dual webhooks, and mirror native leads back to NeoDove.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchNeoConfig}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh Stats</span>
                  </button>
                </div>
              </div>

              {/* Real-Time Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">
                    NeoDove Inbound Leads
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-heading font-extrabold text-indigo-950 tabular-nums">
                      {neodoveConfig.leadsCaptured || 0}
                    </span>
                    <span className="text-[11px] font-medium text-indigo-600">Captured to CRM</span>
                  </div>
                  <p className="text-[10px] text-indigo-400 mt-1">
                    Last received: {neodoveConfig.lastInboundAt ? new Date(neodoveConfig.lastInboundAt).toLocaleString('en-IN') : 'Awaiting first lead'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
                    Mirrored Out to NeoDove
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-heading font-extrabold text-blue-950 tabular-nums">
                      {neodoveConfig.leadsSyncedOut || 0}
                    </span>
                    <span className="text-[11px] font-medium text-blue-600">Synced to external CRM</span>
                  </div>
                  <p className="text-[10px] text-blue-400 mt-1">
                    Sync Mode: {neodoveConfig.autoSync ? 'Automated Mirroring' : 'Manual / Selective'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                    Universal Website Capture
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-heading font-extrabold text-emerald-950 tabular-nums">
                      Active
                    </span>
                    <span className="text-[11px] font-medium text-emerald-600">Zero Loss Engine</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 mt-1">
                    WordPress, Elementor, Webflow &amp; Landing Pages
                  </p>
                </div>
              </div>

              {/* Webhook Endpoints (1-Click Copy) */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Live Webhook Ingestion Endpoints
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Endpoint 1: NeoDove Webhook */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">POST</span>
                        <span className="font-bold text-xs text-slate-800">NeoDove Inbound Webhook</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={11} /> 200 OK
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Paste this URL into NeoDove Webhook integration panel to mirror every lead into our CRM.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 select-all overflow-x-auto">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/neodove` : '/api/webhooks/neodove'}
                      </code>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/api/webhooks/neodove`;
                          navigator.clipboard.writeText(url);
                          showToast('Copied NeoDove Webhook URL to clipboard!');
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                  </div>

                  {/* Endpoint 2: Universal Landing Page Webhook */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">POST</span>
                        <span className="font-bold text-xs text-slate-800">Website &amp; Landing Page Webhook</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={11} /> 200 OK
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Connect any website form, Elementor, Webflow, or Zapier to auto-ingest and distribute leads.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 select-all overflow-x-auto">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/leads` : '/api/webhooks/leads'}
                      </code>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/api/webhooks/leads`;
                          navigator.clipboard.writeText(url);
                          showToast('Copied Universal Webhook URL to clipboard!');
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Outbound NeoDove Mirroring & Sync Configuration */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 lg:p-7 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Outbound NeoDove Mirroring (Bidirectional Parity)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, any lead captured via Meta Ads, Website, or CSV will automatically be synced to your external NeoDove CRM.
                </p>
              </div>

              <form onSubmit={handleSaveNeoConfig} className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Enable NeoDove Outbound Forwarding</span>
                    <span className="text-[11px] text-slate-500">Forward leads in real-time to external NeoDove endpoint</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={neodoveConfig.enabled || false}
                      onChange={(e) => setNeodoveConfig({ ...neodoveConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      External NeoDove Webhook URL
                    </label>
                    <input
                      type="url"
                      value={neodoveConfig.webhookUrl || ''}
                      onChange={(e) => setNeodoveConfig({ ...neodoveConfig, webhookUrl: e.target.value })}
                      placeholder="https://api.neodove.com/v1/leads/webhook-ingest"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NeoDove API Key / Secret Token (Optional)
                    </label>
                    <input
                      type="password"
                      value={neodoveConfig.apiKey || ''}
                      onChange={(e) => setNeodoveConfig({ ...neodoveConfig, apiKey: e.target.value })}
                      placeholder="nd_live_sk_..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto-Sync Ingested Leads</span>
                    <span className="text-[11px] text-slate-500">Mirror Meta Ads and Website leads immediately upon ingestion</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={neodoveConfig.autoSync || false}
                      onChange={(e) => setNeodoveConfig({ ...neodoveConfig, autoSync: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingNeoConfig}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingNeoConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save NeoDove Configuration</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestNeoSync}
                    disabled={testingNeoSync}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testingNeoSync ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <Send size={14} />}
                    <span>Dispatch Ping Test</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Webhook Ingestion Simulators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Simulator 1: NeoDove Inbound Simulator */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Radio size={16} className="text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">Simulate NeoDove Inbound Webhook</h4>
                </div>

                <form onSubmit={handleSimulateNeoLead} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Prospect Name</label>
                    <input
                      type="text"
                      value={neoSimForm.name}
                      onChange={(e) => setNeoSimForm({ ...neoSimForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Mobile (10 digits)</label>
                      <input
                        type="tel"
                        value={neoSimForm.mobile}
                        onChange={(e) => setNeoSimForm({ ...neoSimForm, mobile: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">City / District</label>
                      <input
                        type="text"
                        value={neoSimForm.city}
                        onChange={(e) => setNeoSimForm({ ...neoSimForm, city: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">State / Region</label>
                      <input
                        type="text"
                        value={neoSimForm.state}
                        onChange={(e) => setNeoSimForm({ ...neoSimForm, state: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Lead Stage</label>
                      <select
                        value={neoSimForm.stage}
                        onChange={(e) => setNeoSimForm({ ...neoSimForm, stage: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Interested">Interested</option>
                        <option value="Callback Scheduled">Callback Scheduled</option>
                        <option value="Converted">Converted</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={simulatingNeoInbound}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {simulatingNeoInbound ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    <span>Test NeoDove Lead Ingestion</span>
                  </button>
                </form>

                {neoSimResult && (
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-indigo-900 font-bold">
                      <span>Ingestion Result:</span>
                      <span className="text-emerald-700 font-mono">200 OK</span>
                    </div>
                    <p className="text-slate-700 font-medium">
                      Lead ID: <span className="font-bold">{neoSimResult.results?.[0]?.lead_id}</span> • Assigned to: <span className="font-bold text-indigo-700">{neoSimResult.results?.[0]?.assigned_to}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Routing Strategy: {neoSimResult.results?.[0]?.routingMethod} • Activity logged to timeline
                    </p>
                  </div>
                )}
              </div>

              {/* Simulator 2: Website / Landing Page Simulator */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Globe size={16} className="text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">Simulate Website Form Ingestion</h4>
                </div>

                <form onSubmit={handleSimulateWebLead} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Prospect Name</label>
                    <input
                      type="text"
                      value={webSimForm.name}
                      onChange={(e) => setWebSimForm({ ...webSimForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Mobile (10 digits)</label>
                      <input
                        type="tel"
                        value={webSimForm.mobile}
                        onChange={(e) => setWebSimForm({ ...webSimForm, mobile: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">City / District</label>
                      <input
                        type="text"
                        value={webSimForm.city}
                        onChange={(e) => setWebSimForm({ ...webSimForm, city: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">State / Region</label>
                      <input
                        type="text"
                        value={webSimForm.state}
                        onChange={(e) => setWebSimForm({ ...webSimForm, state: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Campaign Tag</label>
                      <input
                        type="text"
                        value={webSimForm.campaign_name}
                        onChange={(e) => setWebSimForm({ ...webSimForm, campaign_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={simulatingWebInbound}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {simulatingWebInbound ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    <span>Test Website Form Ingestion</span>
                  </button>
                </form>

                {webSimResult && (
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-emerald-900 font-bold">
                      <span>Ingestion Result:</span>
                      <span className="text-emerald-700 font-mono">200 OK</span>
                    </div>
                    <p className="text-slate-700 font-medium">
                      Lead ID: <span className="font-bold">{webSimResult.results?.[0]?.lead_id}</span> • Assigned to: <span className="font-bold text-emerald-700">{webSimResult.results?.[0]?.assigned_to}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Routing Strategy: {webSimResult.results?.[0]?.routingMethod} • Activity logged to timeline
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {testLeadModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Zap size={18} className="text-amber-500" />
                    <span>Send Test Meta Lead &amp; Verify DB Ingestion</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fires a simulated Meta Lead Ads webhook event and tests round-robin assignment &amp; DB storage
                  </p>
                </div>
                <button
                  onClick={() => setTestLeadModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                <form onSubmit={handleSendTestLead} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Lead Form</label>
                    <select
                      value={testLeadFormId}
                      onChange={(e) => setTestLeadFormId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      {(status?.metaForms || []).map((f) => (
                        <option key={f.formId} value={f.formId}>
                          {f.formName} ({f.formId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prospect Full Name</label>
                      <input
                        type="text"
                        value={testLeadName}
                        onChange={(e) => setTestLeadName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (10 digits)</label>
                      <input
                        type="tel"
                        value={testLeadPhone}
                        onChange={(e) => setTestLeadPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={testLeadEmail}
                        onChange={(e) => setTestLeadEmail(e.target.value)}
                        placeholder="e.g. ramesh@example.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City / District</label>
                      <input
                        type="text"
                        value={testLeadCity}
                        onChange={(e) => setTestLeadCity(e.target.value)}
                        placeholder="e.g. Varanasi"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Business Type (Answer)</label>
                      <input
                        type="text"
                        value={testLeadBusiness}
                        onChange={(e) => setTestLeadBusiness(e.target.value)}
                        placeholder="e.g. Distributor / Trader"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Product Requirement (Answer)</label>
                      <input
                        type="text"
                        value={testLeadProduct}
                        onChange={(e) => setTestLeadProduct(e.target.value)}
                        placeholder="e.g. Dealership Inquiry"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={sendingTestLead}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {sendingTestLead ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>Trigger Real Ingestion Now</span>
                    </button>
                  </div>
                </form>

                {/* Test Lead Verification Result */}
                {testLeadResult && (
                  <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
                    testLeadResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
                  }`}>
                    <div className="font-bold flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 size={16} />
                      <span>{testLeadResult.message}</span>
                    </div>

                    {testLeadResult.lead && (
                      <div className="space-y-1.5 pt-1 text-[11px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>CRM Lead ID: <strong className="text-blue-700 font-mono">{testLeadResult.lead.lead_id}</strong></div>
                          <div>Assigned Agent: <strong className="text-slate-900">{testLeadResult.lead.assignedTo}</strong></div>
                          <div>Prospect: <strong className="text-slate-900">{testLeadResult.lead.name}</strong></div>
                          <div>Mobile: <strong className="text-slate-900">{testLeadResult.lead.mobile}</strong></div>
                          <div>City: <strong className="text-slate-900">{testLeadResult.lead.city || 'N/A'}</strong></div>
                          <div>Intent Score: <strong className="text-emerald-700">{testLeadResult.lead.qualityScore}/100 ({testLeadResult.lead.qualityTier})</strong></div>
                        </div>
                        <div className="text-slate-600 border-t border-emerald-200 pt-1">
                          Product / Business: <strong>{testLeadResult.lead.product_interest}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Meta Leadgen ID: {testLeadResult.lead.meta_lead_id}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <button
                  onClick={() => setTestLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Field Mapping Modal */}
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
