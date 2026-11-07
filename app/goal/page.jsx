"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Target,
  Clock,
  DollarSign,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Edit3,
  Save,
  X,
  Users
} from 'lucide-react';

export default function GoalsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState(null);

  const [editingGoal, setEditingGoal] = useState(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    targetLeadsDaily: 0,
    targetCostPerLead: 0,
    targetMonthlyBudget: 0,
    slaTargetMinutes: 15,
    conversionRateTarget: 0,
    notes: ''
  });

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 5000);
  };

  const fetchCampaignGoals = useCallback(async () => {
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaignGoals();
  }, [fetchCampaignGoals]);

  const handleOpenEditGoal = (campaign) => {
    setEditingGoal(campaign);
    setGoalForm({
      targetLeadsDaily: Number(campaign.goal?.targetLeadsDaily || campaign.targetLeadsDaily || 0),
      targetCostPerLead: Number(campaign.goal?.targetCostPerLead || campaign.targetCostPerLead || 0),
      targetMonthlyBudget: Number(campaign.goal?.targetMonthlyBudget || campaign.targetMonthlyBudget || 0),
      slaTargetMinutes: Number(campaign.goal?.slaTargetMinutes || 15),
      conversionRateTarget: Number(campaign.goal?.conversionRateTarget || 0),
      notes: campaign.goal?.notes || ''
    });
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!editingGoal) return;
    setSavingGoal(true);
    try {
      const res = await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_CAMPAIGN_GOAL',
          campaignId: editingGoal.campaignId,
          campaignName: editingGoal.name,
          ...goalForm
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Campaign goal updated successfully!');
        setEditingGoal(null);
        fetchCampaignGoals();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save campaign goal.');
    } finally {
      setSavingGoal(false);
    }
  };

  const totalLeads = campaigns.reduce((acc, c) => acc + (c.leadsCount || 0), 0);
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
  const avgCPL = totalLeads > 0 && totalSpend > 0 ? (totalSpend / totalLeads).toFixed(2) : null;
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Campaign Goals & Performance Objectives"
        subtitle="Set, monitor and track lead acquisition quotas, target CPL and telecaller conversion milestones for Kisan Choice"
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

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Campaigns</span>
              <Target size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-heading font-extrabold text-slate-900 tabular-nums">
              {activeCount} / {campaigns.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">Meta Ad Account: act_1796071777698019</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Leads Acquired</span>
              <Users size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-heading font-extrabold text-emerald-700 tabular-nums">
              {totalLeads}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-medium">Synced from live Meta forms</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average Cost Per Lead</span>
              <DollarSign size={16} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-heading font-extrabold text-indigo-700 tabular-nums">
              {avgCPL !== null ? `₹${avgCPL}` : '—'}
            </div>
            <div className="text-[11px] text-indigo-600 mt-1 font-medium">Computed from live Meta spend & leads</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">SLA Response Target</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-heading font-extrabold text-slate-900 tabular-nums">
              &lt; 15 Mins
            </div>
            <div className="text-[11px] text-amber-700 mt-1 font-medium">Speed to First Call SLA</div>
          </div>
        </div>

        {/* Campaign Goals Matrix Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <Target size={16} className="text-blue-600" /> Campaign Performance Goals & Quotas
              </h3>
              <p className="text-xs text-slate-500">
                Track daily lead acquisition pace, live cost-per-lead and SLA adherence for each active campaign
              </p>
            </div>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchCampaignGoals();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border border-blue-200/80 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh Goals</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Campaign Name</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Daily Lead Target</th>
                  <th className="py-3.5 px-4 text-right">Live Spend</th>
                  <th className="py-3.5 px-4 text-center">Current Leads</th>
                  <th className="py-3.5 px-4 text-center">Actual CPL</th>
                  <th className="py-3.5 px-4">Routing Team</th>
                  <th className="py-3.5 px-5 text-right">Configure Goal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                      <span>Loading campaign goals from Meta Graph API...</span>
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No campaigns found in Ad Account act_1796071777698019.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => {
                    const targetDaily = Number(c.goal?.targetLeadsDaily || c.targetLeadsDaily || 0);
                    const targetCPL = Number(c.goal?.targetCostPerLead || c.targetCostPerLead || 0);
                    const actualCPL = c.leadsCount > 0 && c.spend > 0 ? c.spend / c.leadsCount : null;
                    const isHealthy = actualCPL === null || targetCPL === 0 || actualCPL <= targetCPL;
                    const pacingPct = targetDaily > 0 ? Math.min(100, Math.round(((c.leadsCount || 0) / targetDaily) * 100)) : 0;

                    return (
                      <tr key={c.campaignId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {c.campaignId}</div>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {targetDaily > 0 ? (
                            <>
                              <div className="font-heading font-extrabold text-blue-700 tabular-nums text-sm">
                                {targetDaily} / day
                              </div>
                              <div className="w-20 mx-auto mt-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${pacingPct}%` }}
                                ></div>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 font-semibold">Not Set</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right font-medium text-slate-700 tabular-nums">
                          ₹{c.spend ? Number(c.spend).toFixed(2) : '0.00'}
                        </td>

                        <td className="py-4 px-4 text-center font-heading font-extrabold text-slate-900 tabular-nums text-sm">
                          {c.leadsCount || 0}
                        </td>

                        <td className="py-4 px-4 text-center">
                          {actualCPL !== null ? (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${
                                isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              ₹{actualCPL.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 font-semibold text-slate-700">
                          {c.assignedTeam || 'North Region Sales'}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => handleOpenEditGoal(c)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 border border-blue-400/30 flex items-center gap-1.5 ml-auto transition-all active:scale-95 cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>Set Goal</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Goal Edit Modal */}
        {editingGoal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Target size={18} className="text-blue-600" /> Set Goal: {editingGoal.name}
                  </h3>
                  <p className="text-xs text-slate-500">Configure target metrics for this Meta campaign</p>
                </div>
                <button
                  onClick={() => setEditingGoal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Daily Lead Target</label>
                    <input
                      type="number"
                      min="0"
                      value={goalForm.targetLeadsDaily}
                      onChange={(e) => setGoalForm({ ...goalForm, targetLeadsDaily: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target CPL (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={goalForm.targetCostPerLead}
                      onChange={(e) => setGoalForm({ ...goalForm, targetCostPerLead: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Monthly Budget Goal (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={goalForm.targetMonthlyBudget}
                      onChange={(e) => setGoalForm({ ...goalForm, targetMonthlyBudget: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Conversion Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      value={goalForm.conversionRateTarget}
                      onChange={(e) => setGoalForm({ ...goalForm, conversionRateTarget: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strategy & Notes</label>
                  <textarea
                    rows={2}
                    value={goalForm.notes}
                    onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    placeholder="Enter campaign performance notes..."
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingGoal(null)}
                    className="px-4 py-2.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/30 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 text-xs"
                  >
                    {savingGoal ? <Loader2 size={13} className="animate-spin text-white" /> : <Save size={13} />}
                    <span>Save Goal</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
