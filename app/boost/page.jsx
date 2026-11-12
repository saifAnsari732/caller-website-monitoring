"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Zap,
  TrendingUp,
  Rocket,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  X
} from 'lucide-react';

export default function BoostPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boostingId, setBoostingId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [selectedMultiplier, setSelectedMultiplier] = useState(1.5);
  const [customBudgets, setCustomBudgets] = useState({});

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 5000);
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/campaigns');
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleBoostCampaign = async (campaign, multiplier = 1.5) => {
    setBoostingId(campaign.campaignId);
    try {
      const customVal = Number(customBudgets[campaign.campaignId] || 0);
      const res = await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BOOST_CAMPAIGN',
          campaignId: campaign.campaignId,
          boostMultiplier: multiplier,
          ...(customVal > 0 ? { newBudget: customVal } : {}),
          activateIfPaused: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Boosted "${campaign.name}"!`);
        fetchCampaigns();
      } else {
        showToast(`Boost notice: ${data.error || 'Failed to boost campaign'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Error applying campaign boost.');
    } finally {
      setBoostingId(null);
    }
  };

  const handleToggleStatus = async (campaign) => {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setBoostingId(campaign.campaignId);
    try {
      const res = await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CAMPAIGN',
          campaignId: campaign.campaignId,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Campaign status changed to ${newStatus}.`);
        fetchCampaigns();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBoostingId(null);
    }
  };

  const handleAccelerateLeads = async (campaign) => {
    setBoostingId(campaign.campaignId);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_FORM_LEADS',
          formId: campaign.linkedFormId || '',
          count: 25
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Lead Acceleration: Ingested ${data.syncedCount} fresh leads directly from Meta!`);
        fetchCampaigns();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBoostingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Campaign Boost & Scaling Engine"
        subtitle="Scale ad budgets, reactivate high-performing campaigns & accelerate live lead acquisition in 1-Click for Kisan Choice"
      />

      <main className="px-5 lg:px-7 py-6 space-y-6 flex-1 w-full max-w-none">
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

        {/* Boost Hero Banner */}
        <div className="bg-slate-900 rounded-2xl p-6 lg:p-7 text-white border border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold">
              <Rocket size={14} className="text-blue-400" />
              <span>Meta Ads Budget Scaling Engine</span>
            </div>
            <h2 className="text-2xl font-heading font-extrabold tracking-tight text-white">
              Scale Your Highest Converting Campaigns
            </h2>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
              Adjust daily budgets via Meta Graph API v21.0, reactivate paused campaigns, and sync incoming leads directly into telecaller queues.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
            <span className="text-xs text-slate-400 font-semibold">Boost Multiplier:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: '+25%', val: 1.25 },
                { label: '+50% (Recommended)', val: 1.5 },
                { label: '2x Budget', val: 2.0 }
              ].map((b) => (
                <button
                  key={b.val}
                  onClick={() => setSelectedMultiplier(b.val)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedMultiplier === b.val
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Campaigns Boost Deck */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {loading ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading Meta campaigns from Ad Account act_1796071777698019...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              No campaigns found in connected Ad Account.
            </div>
          ) : (
            campaigns.map((c) => {
              const isBoosting = boostingId === c.campaignId;
              const currentBudget = Number(c.dailyBudget) || 0;
              const customVal = Number(customBudgets[c.campaignId] || 0);
              const targetBudget = customVal > 0 ? customVal : (currentBudget > 0 ? Math.round(currentBudget * selectedMultiplier) : 0);
              const isActive = c.status === 'ACTIVE';

              return (
                <div
                  key={c.campaignId}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                        <h4 className="font-heading font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                          {c.name}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {c.campaignId}</div>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={isBoosting}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                        title={isActive ? 'Pause Campaign' : 'Activate Campaign'}
                      >
                        {isActive ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </div>

                    {/* Spend & Leads Stats */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Spend</div>
                        <div className="text-xs font-heading font-extrabold text-slate-900 mt-0.5">
                          â‚¹{c.spend ? Number(c.spend).toFixed(0) : 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Leads</div>
                        <div className="text-xs font-heading font-extrabold text-blue-600 mt-0.5">
                          {c.leadsCount || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Daily Budget</div>
                        <div className="text-xs font-heading font-extrabold text-slate-900 mt-0.5">
                          {currentBudget > 0 ? `â‚¹${currentBudget}` : 'AdSet'}
                        </div>
                      </div>
                    </div>

                    {/* Budget Input / Multiplier Target */}
                    <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span>Target Daily Budget (â‚¹):</span>
                        <span className="text-blue-700 font-extrabold">
                          {targetBudget > 0 ? `â‚¹${targetBudget}/day` : 'AdSet Scale'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder={currentBudget > 0 ? `Custom â‚¹ (or ${selectedMultiplier}x = â‚¹${Math.round(currentBudget * selectedMultiplier)})` : 'Set custom daily budget (INR)'}
                        value={customBudgets[c.campaignId] || ''}
                        onChange={(e) => setCustomBudgets(prev => ({ ...prev, [c.campaignId]: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div className="text-[11px] text-blue-700 flex items-center gap-1">
                        <TrendingUp size={12} />
                        <span>Pushes live budget update to Meta Graph API v21.0</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => handleBoostCampaign(c, selectedMultiplier)}
                      disabled={isBoosting}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isBoosting ? (
                        <Loader2 size={14} className="animate-spin text-white" />
                      ) : (
                        <Zap size={14} />
                      )}
                      <span>{targetBudget > 0 ? `1-Click Scale to â‚¹${targetBudget}/day` : `1-Click Scale (${selectedMultiplier}x)`}</span>
                    </button>

                    <button
                      onClick={() => handleAccelerateLeads(c)}
                      disabled={isBoosting}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={12} className="text-slate-600" />
                      <span>Accelerate Real Lead Sync</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
