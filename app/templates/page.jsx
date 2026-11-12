"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  MessageSquare,
  Plus,
  Mail,
  MessageCircle,
  Copy,
  Trash2,
  Code2,
  Loader2,
  X,
  CheckCircle2,
  Send
} from 'lucide-react';

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState('WHATSAPP');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [newTpl, setNewTpl] = useState({
    type: 'WHATSAPP',
    name: '',
    category: 'Welcome',
    content: 'Namaste {{lead_name}}, thank you for connecting with Kisan Choice. Main {{agent_name}} sampark kar raha hoon.'
  });

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 4000);
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/settings-hub');
      const data = await res.json();
      if (data.settings?.templates) {
        setTemplates(data.settings.templates);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const extractVariables = (str) => {
    const matches = str.match(/\{\{(.*?)\}\}/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim())));
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTpl.name.trim() || !newTpl.content.trim()) return;
    const vars = extractVariables(newTpl.content);
    const updated = [
      {
        type: newTpl.type,
        name: newTpl.name.trim(),
        category: newTpl.category,
        content: newTpl.content,
        variables: vars.length > 0 ? vars : ['lead_name', 'agent_name'],
        usageCount: 1
      },
      ...templates
    ];
    setTemplates(updated);
    setShowModal(false);
    await fetch('/api/settings-hub', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: updated })
    });
    showToast(`Template "${newTpl.name}" saved to MongoDB!`);
    setNewTpl({
      type: activeTab,
      name: '',
      category: 'Welcome',
      content: 'Namaste {{lead_name}}, thank you for connecting with Kisan Choice.'
    });
  };

  const handleDeleteTemplate = async (idxInAll) => {
    const updated = templates.filter((_, idx) => idx !== idxInAll);
    setTemplates(updated);
    await fetch('/api/settings-hub', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: updated })
    });
    showToast('Template deleted.');
  };

  const filteredTemplates = templates
    .map((t, originalIndex) => ({ ...t, originalIndex }))
    .filter(t => t.type === activeTab);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="WhatsApp, SMS & Email Templates"
        subtitle="Manage dynamic variable templates synced with the Telecaller Mobile App for 1-click post-call messaging"
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

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('WHATSAPP')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'WHATSAPP' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageCircle size={15} /> WhatsApp Templates
            </button>
            <button
              onClick={() => setActiveTab('SMS')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SMS' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare size={15} /> SMS Templates
            </button>
            <button
              onClick={() => setActiveTab('EMAIL')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'EMAIL' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail size={15} /> Email Templates
            </button>
          </div>

          <button
            onClick={() => {
              setNewTpl({ ...newTpl, type: activeTab });
              setShowModal(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Create Template
          </button>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 text-xs font-medium">
            No {activeTab.toLowerCase()} templates saved yet. Click &ldquo;Create Template&rdquo; above to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((tpl) => (
              <div key={tpl._id || tpl.originalIndex} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 bg-purple-50 text-[#6D28D9] text-[10px] font-extrabold rounded-lg border border-purple-200 uppercase tracking-wider">
                        {tpl.category}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-2">{tpl.name}</h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">Used {tpl.usageCount || 1} times</span>
                  </div>

                  {/* Template Content Box */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {tpl.content}
                  </div>

                  {/* Dynamic Variables Badge */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                      <Code2 size={12} /> Variables:
                    </span>
                    {(tpl.variables || []).map((v, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-50 text-[#6D28D9] border border-purple-200 rounded-md font-mono text-[10px] font-bold">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tpl.content);
                        showToast(`Copied "${tpl.name}" to clipboard!`);
                      }}
                      className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={14} /> Copy Text
                    </button>
                    {tpl.type === 'WHATSAPP' && (
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(tpl.content)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Send size={13} /> Open in WhatsApp
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.originalIndex)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                    title="Delete Template"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold text-slate-900">Create Communication Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Channel</label>
                  <select
                    value={newTpl.type}
                    onChange={e => setNewTpl({ ...newTpl, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={newTpl.category}
                    onChange={e => setNewTpl({ ...newTpl, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  value={newTpl.name}
                  onChange={e => setNewTpl({ ...newTpl, name: e.target.value })}
                  placeholder="e.g. Distributor Price List & Catalogue"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Message Content (Use {'{{lead_name}}'}, {'{{product_interest}}'}, {'{{agent_name}}'}) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newTpl.content}
                  onChange={e => setNewTpl({ ...newTpl, content: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
              >
                Save Template
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
