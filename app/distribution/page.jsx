"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  RotateCcw,
  Scale,
  Filter,
  Plus,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
  RefreshCw
} from 'lucide-react';

export default function DistributionPage() {
  const [activeStrategy, setActiveStrategy] = useState('ROUND_ROBIN');
  const [rules, setRules] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [newRule, setNewRule] = useState({
    name: '',
    source: 'Facebook Meta Lead Ads',
    matchField: 'state',
    matchValue: '',
    strategy: 'Cyclic Round-Robin',
    targetTeam: 'North Region Sales'
  });

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 4500);
  };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings-hub');
      const data = await res.json();
      if (data.settings) {
        setActiveStrategy(data.settings.distributionStrategy || 'ROUND_ROBIN');
        setRules(data.settings.routingRules || []);
        setTeams(data.settings.teams || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSelectStrategy = async (strategy) => {
    setActiveStrategy(strategy);
    try {
      await fetch('/api/settings-hub', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionStrategy: strategy })
      });
      showToast(`Global lead distribution engine switched to ${strategy.replace('_', ' ')}!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRule.name.trim()) return;
    const updated = [{ ...newRule, active: true }, ...rules];
    setRules(updated);
    setShowModal(false);
    await fetch('/api/settings-hub', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routingRules: updated })
    });
    showToast(`Added routing rule "${newRule.name}".`);
    setNewRule({
      name: '',
      source: 'Facebook Meta Lead Ads',
      matchField: 'state',
      matchValue: '',
      strategy: 'Cyclic Round-Robin',
      targetTeam: 'North Region Sales'
    });
  };

  const handleDeleteRule = async (idx) => {
    const updated = rules.filter((_, i) => i !== idx);
    setRules(updated);
    await fetch('/api/settings-hub', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routingRules: updated })
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Automated Lead Distribution Engine"
        subtitle="Configure Round-Robin, Load-Balanced, and Meta Campaign/State routing algorithms persisted in MongoDB"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {banner && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{banner}</span>
            </div>
            <button onClick={() => setBanner(null)} className="underline text-emerald-700 cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Strategy Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              id: 'ROUND_ROBIN',
              title: 'Cyclic Round-Robin',
              desc: 'Sequentially distributes incoming Meta & CRM leads equally among all active clocked-in telecallers.',
              icon: RotateCcw
            },
            {
              id: 'LOAD_BALANCED',
              title: 'Load Balanced Routing',
              desc: 'Routes new leads to the online telecaller with the fewest open uncontacted leads.',
              icon: Scale
            },
            {
              id: 'RULE_BASED',
              title: 'Campaign & State Rules',
              desc: 'Matches incoming lead source, campaign, state, or business type to route to specialized teams.',
              icon: Filter
            }
          ].map(card => {
            const Icon = card.icon;
            const isSelected = activeStrategy === card.id;
            return (
              <div
                key={card.id}
                onClick={() => handleSelectStrategy(card.id)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Icon size={20} />
                  </div>
                  {isSelected && (
                    <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Active Engine
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold mb-1 font-heading">{card.title}</h3>
                <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'} font-normal leading-relaxed`}>
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Active Distribution Rules Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Configured Auto-Assignment Rules</h3>
              <p className="text-xs text-slate-500">Evaluated in real time whenever a Meta Lead Ad is captured</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} /> Add Routing Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100">
                  <th className="p-3.5 pl-4">Rule Name</th>
                  <th className="p-3.5">Lead Source</th>
                  <th className="p-3.5">Condition Match</th>
                  <th className="p-3.5">Algorithm</th>
                  <th className="p-3.5">Target Team</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2 text-rose-600" />
                      Loading routing rules...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-500 font-medium">
                      No custom routing rules configured yet. Global distribution strategy is active.
                    </td>
                  </tr>
                ) : (
                  rules.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-all font-semibold">
                      <td className="p-4 pl-4 font-bold text-slate-900">{r.name}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-extrabold uppercase">
                          {r.source}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-mono text-[11px]">
                        {r.matchField} = {r.matchValue || 'ANY'}
                      </td>
                      <td className="p-4 text-slate-700 font-bold">{r.strategy}</td>
                      <td className="p-4 text-slate-900 font-bold flex items-center gap-1.5">
                        <ArrowRight size={14} className="text-blue-500" /> {r.targetTeam}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold text-slate-900">Create Auto-Routing Rule</h3>
            <form onSubmit={handleAddRule} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="Enter routing rule name"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Match Field</label>
                  <select
                    value={newRule.matchField}
                    onChange={e => setNewRule({ ...newRule, matchField: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="state">State</option>
                    <option value="city">City</option>
                    <option value="business_type">Business Type</option>
                    <option value="campaign_name">Campaign Name</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Match Value</label>
                  <input
                    type="text"
                    value={newRule.matchValue}
                    onChange={e => setNewRule({ ...newRule, matchValue: e.target.value })}
                    placeholder="Enter match value"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Algorithm</label>
                  <select
                    value={newRule.strategy}
                    onChange={e => setNewRule({ ...newRule, strategy: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Cyclic Round-Robin">Cyclic Round-Robin</option>
                    <option value="Load Balanced">Load Balanced</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Sales Team</label>
                  <select
                    value={newRule.targetTeam}
                    onChange={e => setNewRule({ ...newRule, targetTeam: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {(teams.length > 0 ? teams : [{ name: 'North Region Sales' }]).map((t, i) => (
                      <option key={i} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
              >
                Save Routing Rule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
