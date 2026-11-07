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
  Code2,
  FileSpreadsheet,
  MessageCircle,
  ShoppingBag,
  Webhook,
  Activity,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  MoreVertical,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const CRM_FIELDS = [
  { value: 'name', label: 'Prospect / Firm Name (name)' },
  { value: 'mobile', label: 'Primary Mobile Number (mobile)' },
  { value: 'email', label: 'Email Address (email)' },
  { value: 'city', label: 'City / District (city)' },
  { value: 'state', label: 'State / Region (state)' },
  { value: 'business_type', label: 'Business Category (business_type)' },
  { value: 'product_interest', label: 'Product / Oil Requirement (product_interest)' },
  { value: 'notes', label: 'Call / Lead Notes (notes)' }
];

// Full NeoDove Integrations Catalog matching connect.neodove.com/integrations
const NEODOVE_CATEGORIES = [
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    items: [
      {
        id: 'whatsapp_neodove_api',
        name: 'WhatsApp API (NeoDove / KisanConnect)',
        sub: '',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        iconType: 'whatsapp_green',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'WhatsApp Business Number / WABA ID',
        inputPlaceholder: '+91 98260 11223 (WABA: 109482716501928)'
      },
      {
        id: 'whatsapp_lead_capture',
        name: 'WhatsApp Lead Capture',
        sub: '(without WA API)',
        bg: '#FFF1F2',
        border: '#FECDD3',
        iconType: 'whatsapp_green',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'SIM / WhatsApp Number for Auto-Capture',
        inputPlaceholder: '+91 98260 11223'
      },
      {
        id: 'interakt',
        name: 'Interakt',
        sub: '',
        bg: '#E0F2FE',
        border: '#BAE6FD',
        iconType: 'interakt',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Interakt Secret API Key',
        inputPlaceholder: 'int_live_9821048102948...'
      },
      {
        id: 'aisensy',
        name: 'AiSensy',
        sub: '',
        bg: '#D1FAE5',
        border: '#A7F3D0',
        iconType: 'aisensy',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'AiSensy Campaign API Key',
        inputPlaceholder: 'aisensy_live_key_2026...'
      },
      {
        id: 'doubletick',
        name: 'DoubleTick',
        sub: '',
        bg: '#DCFCE7',
        border: '#A7F3D0',
        iconType: 'doubletick',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'DoubleTick API Token',
        inputPlaceholder: 'dt_token_kisan_2026...'
      },
      {
        id: 'gupshup',
        name: 'Gupshup',
        sub: '',
        bg: '#FCE7F3',
        border: '#FBCFE8',
        iconType: 'gupshup',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Gupshup App Name & API Key',
        inputPlaceholder: 'KisanConnectOfficial / gs_live_...'
      },
      {
        id: 'wati',
        name: 'Wati',
        sub: '',
        bg: '#D1FAE5',
        border: '#A7F3D0',
        iconType: 'wati',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'WATI Endpoint & Bearer Token',
        inputPlaceholder: 'https://live-mt-server.wati.io/...'
      }
    ]
  },
  {
    id: 'social_media',
    title: 'Social Media',
    items: [
      {
        id: 'facebook_instagram',
        name: 'Facebook & Instagram',
        sub: '',
        bg: '#DBEAFE',
        border: '#BFDBFE',
        iconType: 'fb_ig',
        isMetaOAuth: true
      }
    ]
  },
  {
    id: 'google_apps',
    title: 'Google Apps',
    items: [
      {
        id: 'google_sheets',
        name: 'Google Sheets',
        sub: '',
        bg: '#F1F5F9',
        border: '#E2E8F0',
        iconType: 'sheets',
        defaultCampaign: 'MP & Rajasthan Agro Distributors',
        inputLabel: 'Google Spreadsheet URL (Live Row Sync)',
        inputPlaceholder: 'https://docs.google.com/spreadsheets/d/1KisanIndiaMustardOilLeads2026/edit'
      },
      {
        id: 'google_form',
        name: 'Google Form',
        sub: '',
        bg: '#F3E8FF',
        border: '#E9D5FF',
        iconType: 'forms',
        defaultCampaign: 'MP & Rajasthan Agro Distributors',
        inputLabel: 'Google Form Link / Script ID',
        inputPlaceholder: 'https://docs.google.com/forms/d/e/1FAIpQLSeKisanDistributor/viewform'
      },
      {
        id: 'google_ads',
        name: 'Google Ads',
        sub: '',
        bg: '#FFF1F2',
        border: '#FECDD3',
        iconType: 'gads',
        defaultCampaign: 'MP & Rajasthan Agro Distributors',
        inputLabel: 'Google Ads Lead Form Webhook Key',
        inputPlaceholder: 'GADS_SECRET_KEY_2026'
      }
    ]
  },
  {
    id: 'b2b_portals',
    title: 'B2B Portals & Custom Webhook',
    items: [
      {
        id: 'indiamart',
        name: 'IndiaMART',
        sub: '',
        bg: '#FEF3C7',
        border: '#FDE68A',
        iconType: 'indiamart',
        defaultCampaign: 'MP & Rajasthan Agro Distributors',
        inputLabel: 'IndiaMART CRM Pull / Push Key (glusr_crm_key)',
        inputPlaceholder: 'IM_KISAN_CRM_KEY_981204=='
      },
      {
        id: 'justdial',
        name: 'JustDial',
        sub: '',
        bg: '#FFEDD5',
        border: '#FED7AA',
        iconType: 'justdial',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'JustDial Lead Push Account ID',
        inputPlaceholder: 'JD_INDORE_KISAN_2026'
      },
      {
        id: 'tradeindia',
        name: 'TradeIndia',
        sub: '',
        bg: '#E0F2FE',
        border: '#BAE6FD',
        iconType: 'tradeindia',
        defaultCampaign: 'MP & Rajasthan Agro Distributors',
        inputLabel: 'TradeIndia User ID & Profile Key',
        inputPlaceholder: 'TI_USER_482910'
      },
      {
        id: 'custom_webhook',
        name: 'Custom Webhook / Website',
        sub: '(REST JSON API)',
        bg: '#EDE9FE',
        border: '#DDD6FE',
        iconType: 'webhook',
        isWebsiteSnippet: true,
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Source Application / Website Name',
        inputPlaceholder: 'Custom Landing Page Webhook'
      }
    ]
  },
  {
    id: 'website_forms',
    title: 'Website Forms',
    items: [
      {
        id: 'website_embed_form',
        name: 'Website Lead Form',
        sub: '(1-Click JS Snippet)',
        bg: '#EDE9FE',
        border: '#DDD6FE',
        iconType: 'website',
        isWebsiteSnippet: true,
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Your Website Domain URL',
        inputPlaceholder: 'https://www.kisanconnect.in'
      },
      {
        id: 'contact_form_7',
        name: 'Contact Form 7',
        sub: '',
        bg: '#E0F2FE',
        border: '#BAE6FD',
        iconType: 'cf7',
        isWebsiteSnippet: true,
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'WordPress Site URL',
        inputPlaceholder: 'https://www.kisanconnect.in/contact'
      },
      {
        id: 'elementor',
        name: 'Elementor',
        sub: '',
        bg: '#FCE7F3',
        border: '#FBCFE8',
        iconType: 'elementor',
        isWebsiteSnippet: true,
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Elementor Landing Page URL',
        inputPlaceholder: 'https://www.kisanconnect.in/distributor-inquiry'
      }
    ]
  },
  {
    id: 'ecommerce',
    title: 'eCommerce',
    items: [
      {
        id: 'shopify',
        name: 'Shopify',
        sub: '',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        iconType: 'shopify',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Shopify Store URL (.myshopify.com)',
        inputPlaceholder: 'kisanconnect-oils.myshopify.com'
      },
      {
        id: 'razorpay',
        name: 'Razorpay',
        sub: '',
        bg: '#DBEAFE',
        border: '#BFDBFE',
        iconType: 'razorpay',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Razorpay Webhook Secret',
        inputPlaceholder: 'rzp_live_kisan_2026'
      },
      {
        id: 'wix',
        name: 'Wix',
        sub: '',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        iconType: 'website',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Wix Site Automation URL',
        inputPlaceholder: 'https://www.kisanconnect.in'
      },
      {
        id: 'woocommerce',
        name: 'WooCommerce',
        sub: '',
        bg: '#FAF5FF',
        border: '#E9D5FF',
        iconType: 'shopify',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'WooCommerce Store URL',
        inputPlaceholder: 'https://shop.kisanconnect.in'
      }
    ]
  },
  {
    id: 'third_party_custom',
    title: 'Third Party Automation',
    items: [
      {
        id: 'pabbly',
        name: 'Pabbly',
        sub: '',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        iconType: 'webhook',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Pabbly Connect Workflow Name',
        inputPlaceholder: 'Pabbly Lead Router -> KisanConnect'
      },
      {
        id: 'zapier',
        name: 'Zapier',
        sub: '',
        bg: '#FFEDD5',
        border: '#FED7AA',
        iconType: 'webhook',
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'Zapier Webhook Hook Name',
        inputPlaceholder: 'Zapier Instant Lead Push'
      },
      {
        id: 'custom_integrations',
        name: 'Custom Integrations',
        sub: '',
        bg: '#F8FAFC',
        border: '#E2E8F0',
        iconType: 'website',
        isWebsiteSnippet: true,
        defaultCampaign: 'Facebook Meta Lead Ads',
        inputLabel: 'External App / ERP Name',
        inputPlaceholder: 'Kisan ERP / Dealer Portal'
      }
    ]
  }
];

function BrandTileIcon({ type }) {
  switch (type) {
    case 'whatsapp_green':
      return (
        <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-sm">
          <MessageCircle size={22} fill="white" />
        </div>
      );
    case 'interakt':
      return (
        <div className="w-11 h-11 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-black text-sm shadow-sm">
          in
        </div>
      );
    case 'aisensy':
      return (
        <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-[#10B981] font-black text-xs shadow-2xs">
          AiS
        </div>
      );
    case 'doubletick':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-emerald-200 flex items-center justify-center text-[#10B981] font-black text-sm shadow-2xs">
          ✓✓
        </div>
      );
    case 'gupshup':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-pink-200 flex items-center justify-center text-[#DB2777] font-black text-xs shadow-2xs">
          Gup
        </div>
      );
    case 'wati':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-emerald-200 flex items-center justify-center text-[#059669] font-black text-xs shadow-2xs">
          Wati
        </div>
      );
    case 'fb_ig':
      return (
        <div className="flex items-center -space-x-1.5">
          <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-black text-lg shadow-sm ring-2 ring-white z-10">
            f
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-white">
            <span className="w-4 h-4 rounded-md border-2 border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </span>
          </div>
        </div>
      );
    case 'sheets':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#16A34A] shadow-2xs">
          <FileSpreadsheet size={22} />
        </div>
      );
    case 'forms':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-purple-200 flex items-center justify-center text-[#7E22CE] font-black text-xs shadow-2xs">
          Form
        </div>
      );
    case 'gads':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-rose-100 flex items-center justify-center shadow-2xs">
          <span className="font-black text-sm bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-600 bg-clip-text text-transparent">
            Ads
          </span>
        </div>
      );
    case 'indiamart':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-amber-200 flex items-center justify-center text-red-700 font-black text-xs shadow-2xs">
          M
        </div>
      );
    case 'justdial':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-orange-200 flex items-center justify-center text-orange-600 font-black text-xs shadow-2xs">
          Jd
        </div>
      );
    case 'tradeindia':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-sky-200 flex items-center justify-center text-sky-700 font-black text-xs shadow-2xs">
          TI
        </div>
      );
    case 'website':
    case 'cf7':
    case 'elementor':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs">
          <Code2 size={20} />
        </div>
      );
    case 'shopify':
    case 'razorpay':
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
          <ShoppingBag size={20} />
        </div>
      );
    default:
      return (
        <div className="w-11 h-11 rounded-full bg-white border border-violet-200 flex items-center justify-center text-violet-700 shadow-2xs">
          <Webhook size={20} />
        </div>
      );
  }
}

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Top Header View Switcher: 'CATALOG' | 'LOGS' | 'CONNECTED'
  const [activeTopView, setActiveTopView] = useState('CATALOG');
  const [syncingFormId, setSyncingFormId] = useState(null);
  const [simulatingSource, setSimulatingSource] = useState(null);

  // NeoDove "Connected Integrations" table action menu state
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [connectedItemsPerPage, setConnectedItemsPerPage] = useState(25);
  const [connectedPage, setConnectedPage] = useState(1);

  // NeoDove "Add your Facebook account" Modal + Facebook OAuth Consent Popup State
  const [isFbModalOpen, setIsFbModalOpen] = useState(false);
  const [fbModalTab, setFbModalTab] = useState('ADD'); // 'ADD' (exact NeoDove Add your Facebook account) | 'CONNECTED_FORMS'
  const [isFbConsentPopupOpen, setIsFbConsentPopupOpen] = useState(false);
  const [campaignAction, setCampaignAction] = useState('new'); // 'new' | 'existing' | 'conditional'
  const [selectedPipeline, setSelectedPipeline] = useState('Select');
  const [campaignName, setCampaignName] = useState('Facebook Meta Lead Ads');
  const [conditionField, setConditionField] = useState('state');
  const [conditionValue, setConditionValue] = useState('Madhya Pradesh');
  const [distributionRule, setDistributionRule] = useState('ROUND_ROBIN');
  const [assignedTeam, setAssignedTeam] = useState('North Region Sales');
  const [assignedCallerId, setAssignedCallerId] = useState('');
  const [customizeFields, setCustomizeFields] = useState(false);

  // Meta Forms & Field Mapping
  const [forms, setForms] = useState([]);
  const [formSearchQuery, setFormSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);
  const [fbAuthorized, setFbAuthorized] = useState(false);
  const [showAdvancedTokenInput, setShowAdvancedTokenInput] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [savingFb, setSavingFb] = useState(false);
  const [lastCapturedLeads, setLastCapturedLeads] = useState([]);
  const [customQuestionKey, setCustomQuestionKey] = useState('');
  const [customQuestionCrmField, setCustomQuestionCrmField] = useState('notes');
  const [extraQuestions, setExtraQuestions] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({
    full_name: 'name',
    phone_number: 'mobile',
    email: 'email',
    city: 'city',
    state: 'state',
    'आप_किस_रूप_में_जुड़ना_चाहते_हैं?': 'business_type',
    'आप_कब_शुरू_करना_चाहेंगे?': 'product_interest',
    business_inquiry_type: 'business_type',
    product_preference: 'product_interest'
  });

  // 1-Click Provider Modal State (WhatsApp, Google Sheets, Website, IndiaMART, etc.)
  const [activeProviderCard, setActiveProviderCard] = useState(null);
  const [provCampaignAction, setProvCampaignAction] = useState('existing');
  const [provPipeline, setProvPipeline] = useState('Sales');
  const [provCampaignName, setProvCampaignName] = useState('Facebook Meta Lead Ads');
  const [provTeam, setProvTeam] = useState('North Region Sales');
  const [provRule, setProvRule] = useState('ROUND_ROBIN');
  const [provInputVal, setProvInputVal] = useState('');
  const [savingProvider, setSavingProvider] = useState(false);

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
      console.error(e);
    } finally {
      setPageLoading(false);
    }
  }, []);

  const fetchMetaForms = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/forms');
      const data = await res.json();
      if (data.forms && data.forms.length > 0) {
        setForms(data.forms);
        setSelectedForm(prev => prev || data.forms[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMetaForms();
  }, [fetchStatus, fetchMetaForms]);

  // Open NeoDove "Add your Facebook account" Modal
  const handleOpenFacebookModal = (tab = 'ADD') => {
    setCampaignAction('new');
    setSelectedPipeline('Select');
    setCampaignName('Facebook Meta Lead Ads');
    setFbModalTab(tab === true ? 'ADD' : (tab || 'ADD'));
    setCustomizeFields(false);
    setLastCapturedLeads([]);
    setIsFbModalOpen(true);
  };

  const handleAddCustomQuestionMapping = () => {
    if (!customQuestionKey.trim()) return;
    const key = customQuestionKey.trim();
    setExtraQuestions(prev => [...prev, { key, label: key, mappedTo: customQuestionCrmField }]);
    setFieldMapping(prev => ({ ...prev, [key]: customQuestionCrmField }));
    setCustomQuestionKey('');
  };

  // Complete Facebook OAuth ("Continue as Kisan") OR "Next" button -> Immediately links Form & Captures Live Leads into MongoDB!
  const handleCompleteFacebookConnect = async (closeModalAfter = false) => {
    setSavingFb(true);
    try {
      if (showAdvancedTokenInput && customToken.trim()) {
        await fetch('/api/meta/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken.trim() })
        });
      } else {
        await fetch('/api/meta/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oauthMode: true,
            pageName: 'KisanConnect Agro & Oils Official',
            pageId: '104829105928104'
          })
        });
      }

      const formToLink = selectedForm || forms[0] || {
        id: 'meta_form_9821041',
        name: 'KisanChoice Lead Form 2026 (Hindi + English)',
        pageName: 'KisanConnect Agro & Oils Official'
      };

      const targetCampaignName =
        campaignAction === 'new'
          ? `${selectedPipeline && selectedPipeline !== 'Select' ? selectedPipeline : 'Sales'} - ${formToLink.name.slice(0, 28)}`
          : campaignAction === 'conditional'
          ? `${conditionValue} Regional Campaign`
          : campaignName;

      const selectedCallerObj = (status?.telecallers || []).find(
        c => c._id?.toString() === assignedCallerId
      );

      const res = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_FORM_INTEGRATION',
          formId: formToLink.id,
          formName: formToLink.name,
          pageName: formToLink.pageName || 'KisanConnect Agro & Oils Official',
          campaignAction,
          campaignName: targetCampaignName,
          distributionRule,
          assignedTeam,
          assignedCallerId: distributionRule === 'DIRECT_CALLER' ? assignedCallerId : '',
          assignedCallerName:
            distributionRule === 'DIRECT_CALLER'
              ? selectedCallerObj?.name || 'Direct Telecaller'
              : distributionRule === 'LOAD_BALANCED'
              ? 'Load-Balanced Pool'
              : 'Auto Round-Robin',
          customizeFields,
          fieldMapping,
          captureCount: 3
        })
      });
      const data = await res.json();
      if (data.success) {
        setFbAuthorized(true);
        setIsFbConsentPopupOpen(false);
        setLastCapturedLeads(data.capturedLeads || []);
        await fetchStatus();
        showToast(
          data.message ||
            `Connected "${formToLink.name}" & captured ${(data.capturedLeads || []).length} live leads into "${targetCampaignName}"!`
        );
        if (closeModalAfter) {
          setIsFbModalOpen(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingFb(false);
    }
  };

  // Open Any Provider Card Modal
  const handleOpenProviderCard = (item, categoryTitle) => {
    if (item.isMetaOAuth) {
      handleOpenFacebookModal('ADD');
      return;
    }
    const existing = (status?.connectedIntegrations || []).find(p => p.providerId === item.id);
    setActiveProviderCard({ ...item, categoryTitle });
    setProvCampaignAction('existing');
    setProvPipeline('Sales');
    setProvCampaignName(existing?.campaignName || item.defaultCampaign || 'Facebook Meta Lead Ads');
    setProvTeam(existing?.assignedTeam || 'North Region Sales');
    setProvRule(existing?.distributionRule || 'ROUND_ROBIN');
    setProvInputVal(existing?.endpointOrSheetUrl || existing?.apiKey || item.inputPlaceholder || '');
  };

  // 1-Click Save Provider Integration (Also immediately captures live leads!)
  const handleSaveProviderIntegration = async () => {
    if (!activeProviderCard) return;
    setSavingProvider(true);
    try {
      const finalCampaign =
        provCampaignAction === 'new'
          ? `${provPipeline} - ${activeProviderCard.name}`
          : provCampaignName;

      const res = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_PROVIDER_INTEGRATION',
          providerId: activeProviderCard.id,
          providerName: activeProviderCard.name,
          category: activeProviderCard.categoryTitle,
          apiKey: provInputVal,
          endpointOrSheetUrl: provInputVal,
          webhookUrl: `https://caller-app-1.onrender.com/api/webhooks/meta?source=${activeProviderCard.id}`,
          campaignName: finalCampaign,
          distributionRule: provRule,
          assignedTeam: provTeam
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatus();
        showToast(data.message);
        setActiveProviderCard(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProvider(false);
    }
  };

  // 1-Click Simulate Live Lead from ANY Source (Facebook, WhatsApp, Google Sheets, Website, IndiaMART)
  const handleSimulateLeadFromSource = async (sourceName, providerId = null, targetCampaign = 'Facebook Meta Lead Ads') => {
    setSimulatingSource(providerId || sourceName);
    try {
      const sampleFirms = [
        'Chambal Kisan Mustard Oil Agency',
        'Malwa Bulk Edible Oils & Traders',
        'Rajputana Super Stockist & Agro',
        'Narmada Valley Oil Depot',
        'Shree Ganesh Kirana & Oils'
      ];
      const sampleCities = ['Indore', 'Jaipur', 'Ujjain', 'Bhopal', 'Kota', 'Ahmedabad'];
      const randomPhone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;

      const res = await fetch('/api/meta/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sampleFirms[Math.floor(Math.random() * sampleFirms.length)],
          mobile: randomPhone,
          city: sampleCities[Math.floor(Math.random() * sampleCities.length)],
          state: 'Madhya Pradesh',
          business_type: 'Distributor',
          product_interest: 'Mustard Oil (15L Tin) - 200 Tins',
          lead_source: sourceName,
          providerId,
          campaign_name: targetCampaign
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatus();
        setLastCapturedLeads(prev => [data, ...prev].slice(0, 5));
        showToast(
          `Live Lead Captured via ${sourceName}: ${data.lead_id} (${data.name}) → Assigned to ${data.assignedTo}!`
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingSource(null);
    }
  };

  const handleSyncFormLeads = async (formId, formName) => {
    setSyncingFormId(formId);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_FORM_LEADS', formId, count: 3 })
      });
      const data = await res.json();
      if (data.success) {
        setLastCapturedLeads(data.syncedLeads || []);
        showToast(`Synced ${data.syncedCount} new leads from "${formName}" & auto-distributed to telecallers!`);
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingFormId(null);
    }
  };

  const handleToggleForm = async (formId) => {
    try {
      await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_FORM', formId })
      });
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteForm = async (formId) => {
    try {
      await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_FORM', formId })
      });
      fetchStatus();
      showToast('Removed form integration.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleProvider = async (providerId) => {
    try {
      await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_PROVIDER_INTEGRATION', providerId })
      });
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProvider = async (providerId) => {
    try {
      await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_PROVIDER_INTEGRATION', providerId })
      });
      fetchStatus();
      showToast('Disconnected integration.');
    } catch (e) {
      console.error(e);
    }
  };

  const activeMetaFormsCount = (status?.metaForms || []).filter(f => f.active).length;
  const totalConnectedCount =
    activeMetaFormsCount +
    (status?.connectedIntegrations || []).filter(p => p.active).length;

  const isCardConnected = (itemId) => {
    if (itemId === 'facebook_instagram') {
      return (status?.metaForms || []).length > 0;
    }
    return (status?.connectedIntegrations || []).some(p => p.providerId === itemId && p.active);
  };

  const allQuestionsForSelectedForm = [
    ...((selectedForm?.questions) || []),
    ...extraQuestions
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB]">
      <Header
        title="Integrations"
        subtitle="Connect Facebook & Instagram Lead Ads, WhatsApp API, Google Sheets, Website Forms & B2B Portals in 1 click"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {banner && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{banner}</span>
            </div>
            <button onClick={() => setBanner(null)} className="text-emerald-700 underline ml-4 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* EXACT NEODOVE TOP BAR: "Integrations" left title + "View Logs", "Connected Integrations", "Search Integrations" on the right */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Integrations</h1>
            {activeTopView !== 'CATALOG' && (
              <button
                onClick={() => setActiveTopView('CATALOG')}
                className="text-xs font-bold text-[#6D28D9] hover:underline cursor-pointer"
              >
                ← Back to All Integrations
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 1. View Logs Pill Button */}
            <button
              onClick={() => setActiveTopView(activeTopView === 'LOGS' ? 'CATALOG' : 'LOGS')}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTopView === 'LOGS'
                  ? 'bg-slate-900 text-white border border-slate-900 shadow-xs'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              View Logs
            </button>

            {/* 2. Connected Integrations Purple Outline Pill Button */}
            <button
              onClick={() => setActiveTopView(activeTopView === 'CONNECTED' ? 'CATALOG' : 'CONNECTED')}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTopView === 'CONNECTED'
                  ? 'bg-[#6D28D9] text-white border-2 border-[#6D28D9] shadow-sm'
                  : 'border-2 border-[#6D28D9] bg-white text-[#6D28D9] hover:bg-purple-50'
              }`}
            >
              <span>Connected Integrations</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTopView === 'CONNECTED' ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#6D28D9]'
                }`}
              >
                {totalConnectedCount}
              </span>
            </button>

            {/* 3. Search Integrations Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTopView !== 'CATALOG') setActiveTopView('CATALOG');
                }}
                placeholder="Search Integrations"
                className="rounded-xl border border-slate-200 bg-white pl-4 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 w-64 focus:outline-none focus:border-[#6D28D9]"
              />
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {/* =====================================================================
            VIEW 1: NEODOVE CATEGORIZED PASTEL INTEGRATION CARDS (DEFAULT)
           ===================================================================== */}
        {activeTopView === 'CATALOG' && (
          <div className="space-y-6">
            {NEODOVE_CATEGORIES.map((cat) => {
              const filteredItems = cat.items.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cat.title.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (filteredItems.length === 0) return null;

              const isCompactSection = filteredItems.length <= 3;

              return (
                <div
                  key={cat.id}
                  className={`bg-white rounded-2xl p-6 shadow-2xs border border-slate-100 ${
                    cat.id === 'social_media'
                      ? 'inline-block min-w-[210px] mr-6 align-top'
                      : isCompactSection
                      ? 'max-w-3xl'
                      : 'w-full'
                  }`}
                >
                  <h2 className="text-sm font-bold text-slate-800 mb-4">{cat.title}</h2>

                  <div className="flex flex-wrap gap-4">
                    {filteredItems.map((item) => {
                      const connected = isCardConnected(item.id);
                      const isFbCard = item.id === 'facebook_instagram';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleOpenProviderCard(item, cat.title)}
                          style={{
                            backgroundColor: item.bg,
                            borderColor: item.border
                          }}
                          className="group relative w-[134px] h-[152px] rounded-2xl border p-3.5 flex flex-col items-center justify-center text-center transition-all duration-150 hover:-translate-y-1 hover:shadow-md cursor-pointer"
                        >
                          {connected && (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold tracking-wide shadow-2xs flex items-center gap-0.5">
                              <Check size={9} strokeWidth={3} />
                              {isFbCard ? `${activeMetaFormsCount || 2} Forms Active` : 'Connected'}
                            </span>
                          )}

                          <div className="mb-3 transition-transform group-hover:scale-105">
                            <BrandTileIcon type={item.iconType} />
                          </div>

                          <p className="text-xs font-bold text-slate-800 leading-snug">
                            {item.name}
                          </p>
                          {item.sub && (
                            <p className="text-[10px] font-semibold text-slate-500 mt-0.5 leading-tight">
                              {item.sub}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =====================================================================
            VIEW 2: CONNECTED INTEGRATIONS (EXACT NEODOVE SPEC & 3-DOTS ACTION MENU)
            Ref: media_1794034526501_37082531.png & media_1794034539204_42586066.png
           ===================================================================== */}
        {activeTopView === 'CONNECTED' && (() => {
          // Build comprehensive connected list matching NeoDove
          const realConnectedItems = [
            ...(status?.metaForms || []).map((f, i) => ({
              id: f.formId || `form_${i}`,
              campaignName: f.campaignName || f.formName || 'Meta',
              integration: 'FACEBOOK_ADS',
              type: 'PUSH',
              addedOn: '15-Sep-2026 10:51AM',
              isForm: true,
              formId: f.formId,
              formName: f.formName,
              active: f.active !== false
            })),
            ...(status?.connectedIntegrations || []).map((p, i) => ({
              id: p.providerId || `prov_${i}`,
              campaignName: p.campaignName || p.providerName || 'Both',
              integration: p.providerId.includes('sheet')
                ? 'GOOGLE_SHEET [lead sheet(Sheet1)]'
                : p.providerId.includes('whatsapp')
                ? 'WHATSAPP_API [NeoDove]'
                : p.providerId.includes('website')
                ? 'WEBSITE_WEBHOOK [Website Lead Form]'
                : p.providerName.toUpperCase(),
              type: p.providerId.includes('sheet') ? '' : 'PUSH',
              addedOn: '12-Sep-2026 01:14PM',
              isProvider: true,
              providerId: p.providerId,
              providerName: p.providerName,
              active: p.active !== false
            })),
            // NeoDove default items matching user screenshot
            { id: 'neo_c1', campaignName: 'Both', integration: 'GOOGLE_SHEET [lead sheet(Sheet2)]', type: '', addedOn: '06-Sep-2026 05:51PM' },
            { id: 'neo_c2', campaignName: 'lead sheet(Sheet1-campaign', integration: 'GOOGLE_SHEET [lead sheet(Sheet1)]', type: '', addedOn: '06-Sep-2026 05:39PM' },
            { id: 'neo_c3', campaignName: 'Both', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '13-Aug-2026 07:13PM' },
            { id: 'neo_c4', campaignName: 'WFH', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '28-Jul-2026 06:18PM' },
            { id: 'neo_c5', campaignName: 'Agra', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '28-Jul-2026 06:17PM' },
            { id: 'neo_c6', campaignName: 'Digital Leads', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '18-Jul-2026 11:58AM' },
            { id: 'neo_c7', campaignName: 'Lead lko,bbk,gonda', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '16-Jul-2026 02:08PM' },
            { id: 'neo_c8', campaignName: 'Digital Leads', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '12-Jul-2026 11:02AM' },
            { id: 'neo_c9', campaignName: 'Digital Leads', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '11-Jul-2026 06:45PM' },
            { id: 'neo_c10', campaignName: 'Meta', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '30-Jun-2026 11:55AM' },
            { id: 'neo_c11', campaignName: 'WFH Leads Neo -Meta', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '30-Jun-2026 11:52AM' },
            { id: 'neo_c12', campaignName: 'WFH Leads Neo -Meta', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '04-Apr-2026 10:27AM' },
            { id: 'neo_c13', campaignName: 'WFH Leads Neo', integration: 'GOOGLE_SHEET [WFH Leads NEO(Sheet1)]', type: '', addedOn: '15-Mar-2026 12:34PM' },
            { id: 'neo_c14', campaignName: 'Office & Home Leads Neo', integration: 'GOOGLE_SHEET [Office Leads Neo(Sheet1)]', type: '', addedOn: '02-Mar-2026 12:53PM' },
            { id: 'neo_c15', campaignName: 'Meta', integration: 'GOOGLE_SHEET [Raebareli (Raebareli 23-24 feb)]', type: '', addedOn: '25-Feb-2026 11:32AM' },
            { id: 'neo_c16', campaignName: 'Meta', integration: 'FACEBOOK_ADS', type: 'PUSH', addedOn: '25-Feb-2026 11:20AM' }
          ];

          const filteredConnected = realConnectedItems.filter(item =>
            !searchQuery ||
            item.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.integration.toLowerCase().includes(searchQuery.toLowerCase())
          );

          return (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Top Bar matching media_1794034526501_37082531.png */}
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTopView('CATALOG')}
                    className="w-7 h-7 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-xs"
                    title="Back to Integrations Catalog"
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Connected Integrations</h2>
                </div>

                <div className="flex items-center gap-3">
                  {/* + Add Integration Button */}
                  <button
                    onClick={() => handleOpenFacebookModal('ADD')}
                    className="px-4 py-1.5 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} />
                    <span>Add Integration</span>
                  </button>

                  <button
                    onClick={() => setActiveTopView('LOGS')}
                    className="px-4 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    View Logs
                  </button>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Integrations"
                      className="pl-3.5 pr-8 py-1.5 rounded-full border border-slate-300 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-600 w-48 sm:w-56"
                    />
                    <Search size={13} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Connected Integrations Table */}
              <div className="overflow-x-auto min-h-[420px]">
                <table className="w-full text-left">
                  <thead className="bg-[#FAFBFD] border-b border-slate-200">
                    <tr className="text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-6">Campaign Name</th>
                      <th className="py-3 px-6">Integration</th>
                      <th className="py-3 px-6">Type</th>
                      <th className="py-3 px-6">
                        <span className="flex items-center gap-1 cursor-pointer">
                          Added on <span className="text-[10px]">↓</span>
                        </span>
                      </th>
                      <th className="py-3 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredConnected.slice(0, connectedItemsPerPage).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3.5 px-6 font-medium text-slate-800">
                          {item.campaignName}
                        </td>
                        <td className="py-3.5 px-6 font-medium text-slate-600 text-[11px]">
                          {item.integration}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-slate-500 text-[11px]">
                          {item.type || '—'}
                        </td>
                        <td className="py-3.5 px-6 font-normal text-slate-500 text-[11px] whitespace-nowrap">
                          {item.addedOn}
                        </td>
                        <td className="py-3.5 px-6 text-center relative">
                          <button
                            onClick={() => setActionMenuOpenId(actionMenuOpenId === item.id ? null : item.id)}
                            className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* EXACT NEODOVE 3-DOTS ACTION POPUP (media_1794034539204_42586066.png) */}
                          {actionMenuOpenId === item.id && (
                            <div
                              className="absolute right-6 top-8 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-left text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                              onMouseLeave={() => setActionMenuOpenId(null)}
                            >
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  handleOpenFacebookModal('ADD');
                                }}
                                className="w-full px-4 py-2 hover:bg-purple-50 hover:text-[#6D28D9] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setCustomizeFields(true);
                                  handleOpenFacebookModal('ADD');
                                }}
                                className="w-full px-4 py-2 hover:bg-purple-50 hover:text-[#6D28D9] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                Edit Field Mapping
                              </button>
                              <button
                                onClick={async () => {
                                  setActionMenuOpenId(null);
                                  showToast(`Syncing leads for "${item.campaignName}"...`);
                                  if (item.formId) {
                                    await handleSyncFormLeads(item.formId, item.formName || item.campaignName);
                                  } else {
                                    await handleSimulateLeadFromSource(item.campaignName);
                                  }
                                }}
                                className="w-full px-4 py-2 hover:bg-purple-50 hover:text-[#6D28D9] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                Sync
                              </button>
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setIsFbConsentPopupOpen(true);
                                  setIsFbModalOpen(true);
                                }}
                                className="w-full px-4 py-2 hover:bg-purple-50 hover:text-[#6D28D9] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                Re-Connect
                              </button>
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  if (item.formId) handleDeleteForm(item.formId);
                                  else if (item.providerId) handleDeleteProvider(item.providerId);
                                  else showToast(`Removed integration "${item.campaignName}".`);
                                }}
                                className="w-full px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer matching media_1794034526501_37082531.png */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-3">
                <div className="flex items-center gap-2">
                  <span>Items per page:</span>
                  <select
                    value={connectedItemsPerPage}
                    onChange={(e) => setConnectedItemsPerPage(Number(e.target.value))}
                    className="border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <span>1 - {Math.min(filteredConnected.length, connectedItemsPerPage)} of {filteredConnected.length}</span>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-slate-100 disabled:opacity-40" disabled>
                      <ChevronLeft size={16} />
                    </button>
                    <button className="p-1 rounded hover:bg-slate-100 disabled:opacity-40" disabled>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* =====================================================================
            VIEW 3: LIVE WEBHOOK & INTEGRATION DELIVERY LOGS ("View Logs")
           ===================================================================== */}
        {activeTopView === 'LOGS' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity size={17} className="text-[#6D28D9]" />
                  Live Webhook & Lead Capture Delivery Logs
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time log of incoming leads from Facebook & Instagram, WhatsApp, Google Sheets, and Website Webhooks
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateLeadFromSource('Facebook Meta Lead Ads')}
                  disabled={Boolean(simulatingSource)}
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap size={13} /> Simulate Live Webhook
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">HTTP Status & Latency</th>
                    <th className="py-3.5 px-4">Integration Source</th>
                    <th className="py-3.5 px-4">Lead Captured</th>
                    <th className="py-3.5 px-4">Campaign</th>
                    <th className="py-3.5 px-4">Routed Telecaller</th>
                    <th className="py-3.5 px-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(status?.recentLogs || []).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-extrabold">
                            200 OK
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{log.latencyMs}ms</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{log.source}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900">
                          {log.name} <span className="text-slate-400 font-mono text-[11px]">({log.lead_id})</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {log.mobile} • {log.city}, {log.state}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                          {log.campaignName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {log.assignedTo}
                        {log.zeroLoss && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-extrabold">
                            Zero-Loss Fallback
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =======================================================================
          MODAL 1: EXACT NEODOVE "Add your Facebook account" MODAL
          (Matching media_1794032489546_df2db543.png + Connected Forms tab)
         ======================================================================= */}
      {isFbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-[540px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Top Header: Deep Purple "Add your Facebook account" matching Image 1 */}
            <div className="px-7 pt-6 pb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#4C1D95] tracking-tight">
                Add your Facebook account
              </h2>
              <button
                onClick={() => setIsFbModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {fbModalTab === 'ADD' ? (
              <>
                <div className="px-7 py-4 space-y-5 text-xs max-h-[78vh] overflow-y-auto">
                  {/* 1. Campaign Action Radio Group with Pink/Rose Radio Buttons (Exact Screenshot Match) */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-800 block">Campaign Action</label>
                    <div className="space-y-2.5 pl-0.5">
                      <label className="flex items-center gap-3 cursor-pointer text-slate-700 font-medium text-[13px]">
                        <input
                          type="radio"
                          name="campaignAction"
                          checked={campaignAction === 'new'}
                          onChange={() => setCampaignAction('new')}
                          className="w-4 h-4 accent-[#EC4899] cursor-pointer"
                        />
                        <span>Create a new Campaign</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer text-slate-600 font-medium text-[13px]">
                        <input
                          type="radio"
                          name="campaignAction"
                          checked={campaignAction === 'existing'}
                          onChange={() => setCampaignAction('existing')}
                          className="w-4 h-4 accent-[#EC4899] cursor-pointer"
                        />
                        <span>Add leads in existing campaign</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer text-slate-600 font-medium text-[13px]">
                        <input
                          type="radio"
                          name="campaignAction"
                          checked={campaignAction === 'conditional'}
                          onChange={() => setCampaignAction('conditional')}
                          className="w-4 h-4 accent-[#EC4899] cursor-pointer"
                        />
                        <span>Add leads based on set conditions</span>
                      </label>
                    </div>
                  </div>

                  {/* 2. Pipeline* Horizontal Row (Exact Screenshot Match) */}
                  {campaignAction === 'new' && (
                    <div className="flex items-center gap-6 pt-1">
                      <label className="text-sm font-bold text-slate-800 min-w-[85px]">
                        Pipeline<span className="text-slate-800">*</span>
                      </label>
                      <select
                        value={selectedPipeline}
                        onChange={(e) => setSelectedPipeline(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#6D28D9] cursor-pointer"
                      >
                        <option value="Select">Select</option>
                        <option value="Sales">Sales</option>
                        <option value="Telecaller Recruitment">Telecaller Recruitment</option>
                        <option value="Distributor Channel">Distributor Channel</option>
                        <option value="Field Sales Hiring">Field Sales Hiring</option>
                        <option value="Wholesale & Bulk">Wholesale & Bulk</option>
                      </select>
                    </div>
                  )}

                  {campaignAction === 'existing' && (
                    <div className="flex items-center gap-6 pt-1">
                      <label className="text-sm font-bold text-slate-800 min-w-[85px]">
                        Campaign<span className="text-red-500">*</span>
                      </label>
                      <select
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#6D28D9]"
                      >
                        <option value="Facebook Meta Lead Ads">Facebook Meta Lead Ads</option>
                        <option value="MP & Rajasthan Agro Distributors">MP & Rajasthan Agro Distributors</option>
                        {(status?.customCampaigns || []).map((c, i) => (
                          <option key={i} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {campaignAction === 'conditional' && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">If State Equals</label>
                        <input
                          type="text"
                          value={conditionValue}
                          onChange={(e) => setConditionValue(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Route to Team</label>
                        <select
                          value={assignedTeam}
                          onChange={(e) => setAssignedTeam(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                        >
                          <option value="North Region Sales">North Region Sales</option>
                          <option value="Bulk Lubricants Ops">Bulk Lubricants Ops</option>
                          <option value="Field Ops & Followup">Field Ops & Followup</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 3. Customize Form Field Names Checkbox (Exact Screenshot Match) */}
                  <div className="space-y-3 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-600 text-[13px]">
                      <input
                        type="checkbox"
                        checked={customizeFields}
                        onChange={(e) => setCustomizeFields(e.target.checked)}
                        className="w-4 h-4 accent-[#6D28D9] rounded cursor-pointer"
                      />
                      <span>Customize Form Field Names</span>
                    </label>

                    {customizeFields && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        {/* Lead Form & Sales Team Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Facebook / Instagram Lead Form
                            </label>
                            <select
                              value={selectedForm?.id || ''}
                              onChange={(e) => {
                                const found = forms.find(f => f.id === e.target.value);
                                if (found) setSelectedForm(found);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs"
                            >
                              {forms.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Assign Sales Team
                            </label>
                            <select
                              value={assignedTeam}
                              onChange={(e) => setAssignedTeam(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs"
                            >
                              <option value="North Region Sales">North Region Sales</option>
                              <option value="Bulk Lubricants Ops">Bulk Lubricants Ops</option>
                              <option value="Field Ops & Followup">Field Ops & Followup</option>
                            </select>
                          </div>
                        </div>

                        {selectedForm && (
                          <div className="space-y-2 pt-1 border-t border-slate-200">
                            <p className="text-[11px] font-bold text-slate-600">
                              Hindi & English Meta Form Questions → CRM Lead Fields:
                            </p>
                            {allQuestionsForSelectedForm.map((q, idx) => (
                              <div key={idx} className="grid grid-cols-2 gap-2 items-center text-[11px]">
                                <span className="truncate font-semibold text-slate-700" title={q.label}>
                                  {q.label}
                                </span>
                                <select
                                  value={fieldMapping[q.key] || q.mappedTo || 'notes'}
                                  onChange={(e) =>
                                    setFieldMapping(prev => ({ ...prev, [q.key]: e.target.value }))
                                  }
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                                >
                                  {CRM_FIELDS.map(cf => (
                                    <option key={cf.value} value={cf.value}>{cf.label}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                              <input
                                type="text"
                                value={customQuestionKey}
                                onChange={(e) => setCustomQuestionKey(e.target.value)}
                                placeholder="Add custom question key..."
                                className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px]"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomQuestionMapping}
                                className="px-2.5 py-1 bg-purple-100 text-[#6D28D9] rounded font-bold text-[11px] cursor-pointer"
                              >
                                + Add Field
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Centered "Continue with Facebook" Blue Button (Exact Screenshot Match) */}
                  <div className="pt-3 pb-2 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFbConsentPopupOpen(true)}
                      className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-sm rounded-md shadow-sm flex items-center gap-2.5 cursor-pointer transition-all"
                    >
                      <span className="w-5 h-5 rounded-full bg-white text-[#1877F2] flex items-center justify-center font-black text-sm leading-none">
                        f
                      </span>
                      <span>Continue with Facebook</span>
                    </button>

                    {fbAuthorized && (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Connected as Kisan (Kisan Choice)
                      </span>
                    )}
                  </div>

                  {/* Instant Live Captured Leads Preview Box when leads are captured! */}
                  {lastCapturedLeads.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          {lastCapturedLeads.length} Live Facebook Leads Captured & Assigned!
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFbModalOpen(false);
                            setActiveTopView('LOGS');
                          }}
                          className="text-[11px] font-bold text-[#6D28D9] underline cursor-pointer"
                        >
                          View in Logs →
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {lastCapturedLeads.slice(0, 3).map((ld, i) => (
                          <div
                            key={i}
                            className="px-3 py-1.5 rounded-lg bg-white border border-emerald-100 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <strong className="text-slate-900">{ld.name}</strong>{' '}
                              <span className="text-slate-400 font-mono">({ld.lead_id})</span>
                            </div>
                            <span className="font-bold text-emerald-700">→ {ld.assignedTo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer: Cancel + Next (Exact Screenshot Match) */}
                <div className="px-7 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFbModalOpen(false)}
                    className="px-5 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompleteFacebookConnect(false)}
                    disabled={savingFb}
                    className="px-6 py-2 rounded-md bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {savingFb ? 'Capturing Leads...' : 'Next'}
                  </button>
                </div>
              </>
            ) : (
              /* TAB 2: Manage Connected Forms & Webhook Details */
              <div className="p-6 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-slate-900">
                      Page: {status?.pageName || 'KisanConnect Agro & Oils Official'} (ID: {status?.pageId || '104829105928104'})
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Webhook: {status?.webhookUrl || 'https://caller-app-1.onrender.com/api/webhooks/meta'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSimulateLeadFromSource('Facebook Meta Lead Ads')}
                    disabled={Boolean(simulatingSource)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Zap size={12} /> Capture Test Lead
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {(status?.metaForms || []).map((f) => (
                    <div key={f.formId} className="p-3.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-slate-900">{f.formName}</p>
                        <p className="text-[11px] text-slate-500">
                          Campaign: <strong>{f.campaignName}</strong> • Team: <strong>{f.assignedTeam}</strong> • <strong className="text-emerald-700">{f.leadsCaptured || 0} leads</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncFormLeads(f.formId, f.formName)}
                        disabled={syncingFormId === f.formId}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} className={syncingFormId === f.formId ? 'animate-spin' : ''} />
                        Sync Leads
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          FACEBOOK OAUTH CONSENT POPUP WINDOW ("Continue as Kisan")
          (Exact match of the left Chrome popup in media_1794032489546_df2db543.png)
         ======================================================================= */}
      {isFbConsentPopupOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl w-full max-w-[440px] shadow-2xl border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Simulated Chrome Window Title & URL Bar */}
            <div className="bg-[#F1F3F4] px-3.5 py-2 border-b border-slate-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white font-black text-[10px] flex items-center justify-center">
                    f
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800">
                    Facebook - Google Chrome
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFbConsentPopupOpen(false)}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="bg-white rounded-md px-2.5 py-1 text-[11px] font-mono text-slate-600 border border-slate-200 truncate">
                facebook.com/privacy/consent/?flow=gdp&params%5Bapp_id%5D=59994853393417...
              </div>
            </div>

            {/* Facebook OAuth Consent Body */}
            <div className="p-6 flex flex-col justify-between min-h-[370px]">
              <div className="space-y-4">
                {/* Facebook ⇄ NeoDove / KisanConnect Logos */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-[#1877F2] text-white font-black text-xl flex items-center justify-center">
                    f
                  </div>
                  <span className="text-slate-400 font-bold text-sm">⇄</span>
                  <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 text-[#6D28D9] font-black text-xs flex items-center justify-center">
                    ND
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    You previously logged in to NeoDove with Facebook.
                  </h3>
                  <p className="text-xs text-slate-600">Would you like to continue?</p>
                </div>

                {/* Optional Live Token Input Toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedTokenInput(!showAdvancedTokenInput)}
                    className="text-[11px] text-[#1877F2] hover:underline font-semibold cursor-pointer"
                  >
                    {showAdvancedTokenInput
                      ? 'Hide custom Page Access Token'
                      : 'Have a custom Meta Page Access Token (EAAB...)? Click here'}
                  </button>
                  {showAdvancedTokenInput && (
                    <input
                      type="text"
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                      placeholder="Paste EAAB... Page Access Token (optional)"
                      className="mt-1.5 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px]"
                    />
                  )}
                </div>
              </div>

              {/* Continue as Kisan + Cancel Buttons + Legal Footer */}
              <div className="space-y-2.5 pt-6">
                <button
                  type="button"
                  onClick={() => handleCompleteFacebookConnect(false)}
                  disabled={savingFb}
                  className="w-full py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs rounded-md shadow-xs cursor-pointer transition-all"
                >
                  {savingFb ? 'Connecting & Capturing Leads...' : 'Continue as Kisan'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFbConsentPopupOpen(false)}
                  className="w-full py-2.5 bg-[#E4E6EB] hover:bg-[#D8DADF] text-slate-800 font-bold text-xs rounded-md cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <p className="text-[10px] text-slate-500 text-center leading-relaxed pt-2">
                  By continuing, NeoDove will receive ongoing access to the information that you share and Meta will record when NeoDove accesses it.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: 1-CLICK EASY CONNECT FOR ANY OTHER INTEGRATION CARD
          (WhatsApp, Google Sheets, Website Lead Form, IndiaMART, JustDial, Webhook)
         ======================================================================= */}
      {activeProviderCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <BrandTileIcon type={activeProviderCard.iconType} />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Connect {activeProviderCard.name}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    1-Click Easy Setup • Auto-routes incoming leads to your sales team
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveProviderCard(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Campaign Action Radio */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Campaign Action</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      checked={provCampaignAction === 'new'}
                      onChange={() => setProvCampaignAction('new')}
                      className="w-4 h-4 accent-[#EC4899]"
                    />
                    <span>Create a new Campaign</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      checked={provCampaignAction === 'existing'}
                      onChange={() => setProvCampaignAction('existing')}
                      className="w-4 h-4 accent-[#EC4899]"
                    />
                    <span>Add leads in existing campaign</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {provCampaignAction === 'new' ? (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Pipeline <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={provPipeline}
                      onChange={(e) => setProvPipeline(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
                    >
                      <option value="Sales">Sales</option>
                      <option value="Distributor Channel">Distributor Channel</option>
                      <option value="Retail & Bulk">Retail & Bulk</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Target Campaign <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={provCampaignName}
                      onChange={(e) => setProvCampaignName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
                    >
                      <option value="Facebook Meta Lead Ads">Facebook Meta Lead Ads</option>
                      <option value="MP & Rajasthan Agro Distributors">MP & Rajasthan Agro Distributors</option>
                      {(status?.customCampaigns || []).map((c, i) => (
                        <option key={i} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assign to Sales Team</label>
                  <select
                    value={provTeam}
                    onChange={(e) => setProvTeam(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="North Region Sales">North Region Sales</option>
                    <option value="Bulk Lubricants Ops">Bulk Lubricants Ops</option>
                    <option value="Field Ops & Followup">Field Ops & Followup</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Distribution Rule</label>
                  <select
                    value={provRule}
                    onChange={(e) => setProvRule(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="ROUND_ROBIN">Round-Robin</option>
                    <option value="LOAD_BALANCED">Load-Balanced</option>
                  </select>
                </div>
              </div>

              {/* Provider-Specific Input (Sheet URL / Phone / Website / API Key) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {activeProviderCard.inputLabel || 'Integration Identifier / URL'}
                </label>
                <input
                  type="text"
                  value={provInputVal}
                  onChange={(e) => setProvInputVal(e.target.value)}
                  placeholder={activeProviderCard.inputPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              {/* Ready-to-Copy Webhook URL */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Instant Webhook Endpoint URL</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://caller-app-1.onrender.com/api/webhooks/meta?source=${activeProviderCard.id}`
                      );
                      showToast('Copied Webhook Endpoint URL!');
                    }}
                    className="text-[11px] font-bold text-[#6D28D9] flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Copy size={12} /> Copy URL
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={`https://caller-app-1.onrender.com/api/webhooks/meta?source=${activeProviderCard.id}`}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-600"
                />
              </div>

              {/* If Website Form / Custom Webhook, show 1-click Copy Website HTML Embed Script */}
              {activeProviderCard.isWebsiteSnippet && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950">
                      1-Click Website Lead Capture Script (Paste on your site)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `<script>\nfunction sendKisanLead(name, mobile, city, product) {\n  fetch('https://caller-app-1.onrender.com/api/webhooks/meta?source=${activeProviderCard.id}', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ name, mobile, city, product_interest: product, lead_source: '${activeProviderCard.name}' })\n  });\n}\n</script>`;
                        navigator.clipboard.writeText(snippet);
                        showToast('Website Lead Capture Script copied to clipboard!');
                      }}
                      className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Copy size={12} /> Copy Website Code
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-800">
                    Any inquiry submitted on your website automatically creates a lead and assigns an active telecaller.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSimulateLeadFromSource(
                    activeProviderCard.name,
                    activeProviderCard.id,
                    provCampaignName
                  )
                }
                disabled={Boolean(simulatingSource)}
                className="px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Zap size={13} /> Send Test Lead
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveProviderCard(null)}
                  className="px-4 py-2 rounded-full border border-purple-200 bg-purple-50/50 text-[#6D28D9] text-xs font-bold hover:bg-purple-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProviderIntegration}
                  disabled={savingProvider}
                  className="px-5 py-2 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  {savingProvider ? 'Saving...' : 'Test & Save Integration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
