"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import Link from 'next/link';
import {
  Plus,
  Target,
  Users,
  TrendingUp,
  CheckCircle2,
  Zap,
  Loader2,
  X,
  RefreshCw,
  FileSpreadsheet,
  DollarSign,
  Layers,
  Facebook
} from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [metaData, setMetaData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('META_SYNC');

  const [newCamp, setNewCamp] = useState({
    name: '',
    platform: 'META ADS',
    formName: '',
    team: 'North Region Sales',
    rule: 'Round-Robin',
    dailyBudget: 500
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 6000);
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const [hubRes, metaRes] = await Promise.all([
        fetch('/api/settings-hub'),
        fetch('/api/meta/campaigns')
      ]);
      const hubData = await hubRes.json();
      const mData = await metaRes.json();

      if (hubData.campaigns) setCampaigns(hubData.campaigns);
      if (hubData.settings) setSettings(hubData.settings);
      if (mData.success) setMetaData(mData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSyncAllFromMeta = async () => {
    setSyncingMeta(true);
    try {
      const res = await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_ALL_CAMPAIGNS' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Synced ${data.syncedCampaignsCount} campaigns & fresh leads from Meta.`);
        fetchCampaigns();
      } else {
        showToast(`Sync alert: ${data.error || 'Failed to sync from Meta'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Error syncing with Meta Graph API. Please try again.');
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleUpdateCampaignTeam = async (campaignId, teamName) => {
    try {
      await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CAMPAIGN',
          campaignId,
          assignedTeam: teamName
        })
      });
      showToast(`Updated team routing for campaign to "${teamName}"`);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCamp.name.trim()) return;
    setSaving(true);
    try {
      const existingCustom = settings?.customCampaigns || [];
      const updatedCustom = [
        {
          name: newCamp.name.trim(),
          platform: 'META ADS',
          formName: newCamp.formName.trim(),
          team: newCamp.team.trim() || 'North Region Sales',
          rule: newCamp.rule,
          status: 'ACTIVE',
          dailyBudget: Number(newCamp.dailyBudget) || 500
        },
        ...existingCustom
      ];

      await fetch('/api/settings-hub', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCampaigns: updatedCustom })
      });

      setShowModal(false);
      setNewCamp({
        name: '',
        platform: 'META ADS',
        formName: '',
        team: 'North Region Sales',
        rule: 'Round-Robin',
        dailyBudget: 500
      });
      showToast('Campaign created and linked to Meta Lead Ads team routing.');
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const metaList = metaData?.campaigns || [];
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.total || 0), 0);
  const availableTeams = settings?.teams?.length
    ? settings.teams
    : [{ name: 'North Region Sales' }];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Ads Campaigns & Lead Sync Hub"
        subtitle="Connect, sync and manage all active campaigns from Meta Ads (Kisan Choice) with instant telecaller distribution"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Live Meta Ad Account Sync Banner */}
        <div className="bg-gradient-to-r from-[#1877F2]/10 via-purple-50 to-blue-50 border border-[#1877F2]/20 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-md">
              <Facebook size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-heading font-extrabold text-slate-900">
                  {metaData?.pageName || 'Kisan Choice'} • Meta Ads Account
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Connected
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                  ID: {metaData?.adAccountId || 'act_1796071777698019'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Live synchronization of all ad campaigns, leadgen forms, and prospect leads into MongoDB with automatic round-robin routing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={handleSyncAllFromMeta}
              disabled={syncingMeta}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#0866FF] hover:from-[#166fe5] hover:to-[#005ee5] text-white font-bold text-xs shadow-md shadow-blue-600/25 border border-blue-400/40 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {syncingMeta ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" /> Syncing All Campaigns & Leads...
                </>
              ) : (
                <>
                  <RefreshCw size={15} /> Sync All Campaigns from Meta
                </>
              )}
            </button>
            <Link
              href="/goal"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border border-blue-200/80 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-95"
            >
              <Target size={14} className="text-blue-600" /> Goals Hub
            </Link>
            <Link
              href="/boost"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-700 border border-amber-200/80 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-95"
            >
              <Zap size={14} className="text-amber-500" /> Boost Budget
            </Link>
            <Link
              href="/browser"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 text-purple-700 border border-purple-200/80 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-95"
            >
              <FileSpreadsheet size={14} className="text-purple-600" /> Forms Browser
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-95"
            >
              OAuth Settings
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Meta Campaigns</h3>
              <Target size={18} className="text-[#1877F2]" />
            </div>
            <p className="text-3xl font-heading font-extrabold text-slate-900 tabular-nums">
              {metaList.length > 0 ? metaList.length : campaigns.length}{' '}
              <span className="text-sm font-semibold text-emerald-600">
                ({metaList.filter(c => c.status === 'ACTIVE').length} Active)
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Live campaigns in Ad Account</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ad Spend / Budget</h3>
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <p className="text-3xl font-heading font-extrabold text-emerald-600 tabular-nums">
              ₹{(metaData?.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Total investment across campaigns</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Meta Leads Synced</h3>
              <Users size={18} className="text-blue-600" />
            </div>
            <p className="text-3xl font-heading font-extrabold text-slate-900 tabular-nums">
              {metaData?.totalLeads || totalLeads}{' '}
              <span className="text-sm font-semibold text-slate-400">Leads</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Ingested into CRM database</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lead Auto-Routing</h3>
              <TrendingUp size={18} className="text-purple-600" />
            </div>
            <p className="text-3xl font-heading font-extrabold text-purple-600 tabular-nums">100%</p>
            <p className="text-[11px] text-slate-400 mt-1">Round-Robin & Load-Balanced</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('META_SYNC')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95 ${
              activeTab === 'META_SYNC'
                ? 'bg-gradient-to-r from-[#1877F2] to-[#0866FF] text-white shadow-md shadow-blue-500/25 border border-blue-400/40'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Facebook size={14} className={activeTab === 'META_SYNC' ? 'text-blue-100' : 'text-[#1877F2]'} />
            Meta Ads Campaigns ({metaList.length})
          </button>
          <button
            onClick={() => setActiveTab('ALL_CAMPAIGNS')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95 ${
              activeTab === 'ALL_CAMPAIGNS'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 border border-purple-400/40'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers size={14} className={activeTab === 'ALL_CAMPAIGNS' ? 'text-purple-100' : 'text-purple-600'} />
            Campaign Pipeline Conversion ({campaigns.length})
          </button>
        </div>

        {/* TAB 1: Meta Ads Synced Campaigns Table */}
        {activeTab === 'META_SYNC' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Synced Campaigns from Meta Ad Account ({metaData?.adAccountId || 'act_1796071777698019'})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Each campaign is linked with its Facebook Lead Form and telecalling team
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/meta-leads"
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Users size={14} /> View Meta Leads Stream
                </Link>
                <button
                  onClick={handleSyncAllFromMeta}
                  disabled={syncingMeta}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} className={syncingMeta ? 'animate-spin' : ''} /> Refresh Sync
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Campaign Name</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Objective</th>
                    <th className="py-3.5 px-6">Spend / Budget</th>
                    <th className="py-3.5 px-6">Captured Leads</th>
                    <th className="py-3.5 px-6">Assigned Sales Team</th>
                    <th className="py-3.5 px-6">Routing</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                        <Loader2 size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                        Loading Meta campaigns...
                      </td>
                    </tr>
                  ) : metaList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500 font-medium space-y-2">
                        <p>No Meta campaigns synced yet.</p>
                        <button
                          onClick={handleSyncAllFromMeta}
                          className="px-4 py-2 bg-[#1877F2] text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Sync All Campaigns from Meta Now
                        </button>
                      </td>
                    </tr>
                  ) : (
                    metaList.map((camp, idx) => (
                      <tr key={camp.campaignId || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shrink-0 font-bold text-[10px]">
                              f
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{camp.name}</p>
                              <p className="text-[11px] text-slate-400 font-normal">
                                Form: {camp.linkedFormName || 'Meta Lead Form'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              camp.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                camp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            ></span>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap font-medium text-slate-600">
                          {camp.objective || 'OUTCOME_LEADS'}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap tabular-nums">
                          {camp.spend > 0 ? (
                            <span className="font-semibold text-slate-900">₹{camp.spend.toLocaleString('en-IN')}</span>
                          ) : camp.dailyBudget > 0 ? (
                            <span className="text-slate-600">₹{camp.dailyBudget}/day</span>
                          ) : (
                            <span className="text-slate-400 font-normal">Auto</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 tabular-nums">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-xs">
                            {camp.leadsCount || 0}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <select
                            value={camp.assignedTeam || 'North Region Sales'}
                            onChange={(e) => handleUpdateCampaignTeam(camp.campaignId, e.target.value)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            {availableTeams.map((t, ti) => (
                              <option key={ti} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {camp.distributionRule || 'Round-Robin'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <Link
                            href="/leads"
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors inline-block"
                          >
                            View Leads
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Campaign Pipeline Conversion Table */}
        {activeTab === 'ALL_CAMPAIGNS' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-heading font-bold text-slate-900">Meta Lead Ads Campaign Pipelines</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Aggregated conversion performance across Facebook & Instagram Lead Ads campaigns</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus size={15} /> Create Campaign
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Pipeline Name</th>
                    <th className="py-3.5 px-6">Platform</th>
                    <th className="py-3.5 px-6">Captured Leads</th>
                    <th className="py-3.5 px-6">Interested</th>
                    <th className="py-3.5 px-6">Closed Won</th>
                    <th className="py-3.5 px-6">Qual. Rate</th>
                    <th className="py-3.5 px-6">Assigned Team</th>
                    <th className="py-3.5 px-6">Routing Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                        No campaign lead pipelines recorded yet.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((camp) => (
                      <tr key={camp.id || camp.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-slate-900 text-sm">{camp.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-normal">Form: {camp.formName || 'Meta Lead Ads'}</p>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg border text-[10px] font-semibold tracking-wider bg-blue-50 text-blue-700 border-blue-200">
                            {camp.platform || 'META ADS'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 tabular-nums">{camp.total}</td>
                        <td className="py-4 px-6 font-semibold text-indigo-600 tabular-nums">{camp.interested || 0}</td>
                        <td className="py-4 px-6 font-semibold text-emerald-600 tabular-nums">{camp.converted}</td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px] tabular-nums">
                            {camp.rate}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-700">{camp.team}</td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium text-[11px]">
                            {camp.rule}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Link New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900">Create & Link Meta Campaign</h3>
              <p className="text-xs text-slate-500 font-medium">Connects a Meta Lead Ads form to a telecalling team</p>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={newCamp.name}
                  onChange={e => setNewCamp({ ...newCamp, name: e.target.value })}
                  placeholder="Enter Meta Lead Ads campaign name"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Platform</label>
                  <select
                    value={newCamp.platform}
                    onChange={e => setNewCamp({ ...newCamp, platform: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="META ADS">META ADS (FB/IG)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Distribution Rule</label>
                  <select
                    value={newCamp.rule}
                    onChange={e => setNewCamp({ ...newCamp, rule: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Round-Robin">Cyclic Round-Robin</option>
                    <option value="Load-Balanced">Load-Balanced</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Linked Meta Lead Form</label>
                <input
                  type="text"
                  value={newCamp.formName}
                  onChange={e => setNewCamp({ ...newCamp, formName: e.target.value })}
                  placeholder="Optional Meta Lead Form name"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Sales Team</label>
                <select
                  value={newCamp.team}
                  onChange={e => setNewCamp({ ...newCamp, team: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {availableTeams.map((t, i) => (
                    <option key={i} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                {saving ? 'Saving Campaign...' : 'Launch & Link Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
