"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Globe,
  FileText,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Users,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
  Filter
} from 'lucide-react';

export default function BrowserPage() {
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);
  const [browserData, setBrowserData] = useState(null);
  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [ingestingId, setIngestingId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 5000);
  };

  // 1. Fetch all real forms for Page Kisan Choice
  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/forms');
      const data = await res.json();
      if (data.forms && data.forms.length > 0) {
        setForms(data.forms);
        if (!selectedFormId) {
          setSelectedFormId(data.forms[0].id);
          setSelectedForm(data.forms[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForms(false);
    }
  }, [selectedFormId]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // 2. Fetch leads for selected form
  const fetchFormLeads = useCallback(async (formId) => {
    if (!formId) return;
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/browser?formId=${formId}&limit=50`);
      const data = await res.json();
      setBrowserData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFormId) {
      fetchFormLeads(selectedFormId);
    }
  }, [selectedFormId, fetchFormLeads]);

  const handleSelectForm = (form) => {
    setSelectedFormId(form.id);
    setSelectedForm(form);
  };

  // Ingest selected live lead into CRM MongoDB and assign to telecaller
  const handleIngestSingleLead = async (lead) => {
    setIngestingId(lead.id);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'INGEST_SINGLE_LEAD',
          formId: selectedFormId,
          leadData: lead
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Lead "${lead.full_name}" pushed to CRM & assigned to telecallers!`);
      } else {
        showToast(`Notice: ${data.error || 'Failed to ingest lead'}`);
      }
    } catch (e) {
      console.error(e);
      showToast('Error connecting to CRM API.');
    } finally {
      setIngestingId(null);
    }
  };

  const leads = browserData?.leads || [];
  const filteredLeads = leads.filter(l =>
    (l.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.phone || '').includes(searchQuery) ||
    (l.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Lead Forms & Live Ad Leads Browser"
        subtitle="Browse all active Facebook & Instagram Lead Ads forms for Kisan Choice (933429549844450), inspect custom questions & open live Messenger inbox threads"
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

        {/* Top Form Browser Carousel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-blue-600" /> Select Lead Form from Page Kisan Choice
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{forms.length} Forms Available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {loadingForms ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                <Loader2 size={18} className="animate-spin text-blue-600 mx-auto mb-1" />
                <span>Fetching forms from Meta Graph API...</span>
              </div>
            ) : (
              forms.slice(0, 8).map((f) => {
                const isSelected = f.id === selectedFormId;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleSelectForm(f)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {f.status || 'ACTIVE'}
                      </span>
                      <span className={`text-xs font-heading font-extrabold tabular-nums ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}>
                        {f.leadsCount || 0} Leads
                      </span>
                    </div>

                    <div className="font-bold text-xs truncate leading-snug">{f.name}</div>
                    <div className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      ID: {f.id}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Form Details & Live Leads Browser */}
        {selectedForm && (
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-black text-base text-slate-900">
                    {selectedForm.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    ID: {selectedForm.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live responses submitted to this Meta leadgen form • Direct Facebook Business Inbox integration
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search responses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  onClick={() => fetchFormLeads(selectedFormId)}
                  disabled={loadingLeads}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border border-blue-200/80 text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw size={13} className={loadingLeads ? 'animate-spin' : ''} />
                  <span>Refresh Leads</span>
                </button>
              </div>
            </div>

            {/* Questions Schema Preview Chips */}
            {selectedForm.questions && selectedForm.questions.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Form Questions:</span>
                {selectedForm.questions.map((q) => (
                  <span
                    key={q.key}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shrink-0 shadow-2xs"
                  >
                    {q.label || q.key}
                  </span>
                ))}
              </div>
            )}

            {/* Leads Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Prospect Name</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">City / Answers</th>
                    <th className="py-3.5 px-4">Submitted Time</th>
                    <th className="py-3.5 px-4 text-center">Meta Inbox</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingLeads ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center text-slate-400">
                        <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                        <span>Querying Meta Graph API for submitted leads...</span>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center text-slate-400">
                        No submitted leads found for this form.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((l) => {
                      const isIngesting = ingestingId === l.id;
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900">
                            <div>{l.full_name}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {l.id}</div>
                          </td>

                          <td className="py-4 px-4 font-mono font-semibold text-slate-800">
                            {l.phone || <span className="text-slate-400 italic">Not provided</span>}
                          </td>

                          <td className="py-4 px-4 text-slate-600">
                            {l.email || <span className="text-slate-400 italic">—</span>}
                          </td>

                          <td className="py-4 px-4 text-slate-700">
                            <div className="font-semibold">{l.city || '—'}</div>
                            {l.custom_question_1 && (
                              <div className="text-[11px] text-blue-600 font-medium truncate max-w-xs">
                                {l.custom_question_1}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-slate-500 tabular-nums">
                            {l.created_time ? new Date(l.created_time).toLocaleString() : '—'}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {l.inbox_url ? (
                              <a
                                href={l.inbox_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-bold shadow-sm shadow-blue-500/20 border border-blue-400/30 transition-all active:scale-95"
                              >
                                <span>Messenger</span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Direct Ad</span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleIngestSingleLead(l)}
                              disabled={isIngesting}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              {isIngesting ? <Loader2 size={12} className="animate-spin text-white" /> : <span>Push to CRM</span>}
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
        )}
      </main>
    </div>
  );
}
