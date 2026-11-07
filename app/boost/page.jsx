"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Zap,
  TrendingUp,
  DollarSign,
  Rocket,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  Sparkles,
  Sliders,
  Play,
  Pause,
  AlertCircle,
  X,
  Target
} from 'lucide-react';

export default function BoostPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boostingId, setBoostingId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [selectedMultiplier, setSelectedMultiplier] = useState(1.5);

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
        setMetaData(data);
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

  // Execute 1-Click Budget Boost
  const handleBoostCampaign = async (campaign, multiplier = 1.5) => {
    setBoostingId(campaign.campaignId);
    try {
      const res = await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BOOST_CAMPAIGN',
          campaignId: campaign.campaignId,
          boostMultiplier: multiplier,
          activateIfPaused: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `🚀 Boosted "${campaign.name}"!`);
        fetchCampaigns();
      } else {
        showToast(`Boost error: ${data.error || 'Failed to boost campaign'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Error applying campaign boost.');
    } finally {
      setBoostingId(null);
    }
  };

  // Toggle Campaign Active / Paused
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

  // Trigger high-priority lead acceleration from linked form
  const handleAccelerateLeads = async (campaign) => {
    setBoostingId(campaign.campaignId);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_FORM_LEADS',
          formId: campaign.linkedFormId || '1768141694308234',
          count: 10
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`⚡ Lead Acceleration: Ingested ${data.syncedCount} fresh leads directly from Meta!`);
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

        {/* Boost Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-6 lg:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold">
              <Rocket size={14} className="text-amber-300" />
              <span>Meta Ads Lead Acceleration Engine</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-heading font-black tracking-tight">
              Scale Your Highest Converting Campaigns
            </h2>
            <p className="text-xs lg:text-sm text-blue-100 leading-relaxed">
              Instantly scale daily budgets, boost impressions on top-performing regional forms and route incoming leads immediately into telecaller pools.
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white/80 font-semibold">Select Boost Multiplier:</span>
              {[
                { label: '+25% Boost', val: 1.25 },
                { label: '+50% Boost (Recommended)', val: 1.5 },
                { label: '2x Double Budget', val: 2.0 }
              ].map(b => (
                <button
                  key={b.val}
                  onClick={() => setSelectedMultiplier(b.val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMultiplier === b.val
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Campaigns Boost Deck */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              const currentBudget = c.dailyBudget || 250;
              const boostedBudget = Math.round(currentBudget * selectedMultiplier);
              const isActive = c.status === 'ACTIVE';

              return (
                <div
                  key={c.campaignId}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
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
                          ₹{c.spend ? Number(c.spend).toFixed(0) : 0}
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
                          ₹{currentBudget}
                        </div>
                      </div>
                    </div>

                    {/* Boost Projection */}
                    <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span>Boost Daily Budget:</span>
                        <span className="text-blue-700 font-extrabold">₹{boostedBudget}/day</span>
                      </div>
                      <div className="text-[11px] text-blue-700 flex items-center gap-1">
                        <TrendingUp size={12} />
                        <span>Est. +{Math.round(selectedMultiplier * 14)} additional leads/week</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => handleBoostCampaign(c, selectedMultiplier)}
                      disabled={isBoosting}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isBoosting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Zap size={14} className="fill-white" />
                      )}
                      <span>1-Click Boost to ₹{boostedBudget}</span>
                    </button>

                    <button
                      onClick={() => handleAccelerateLeads(c)}
                      disabled={isBoosting}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles size={12} className="text-amber-500" />
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
