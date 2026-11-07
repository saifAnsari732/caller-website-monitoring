"use client";
import { useState } from 'react';
import { Bell, Search, Zap, CheckCircle2, Loader2, Workflow, Command } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header({ title, subtitle }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [searchVal, setSearchVal] = useState('');

  const handleSyncRealMetaLeads = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/meta/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_FORM_LEADS', count: 5 })
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(`Meta Sync: Ingested ${data.syncedCount || 0} real leads from Facebook Page`);
        setTimeout(() => setToastMsg(null), 4500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      router.push(`/leads?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-heading">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-normal mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {toastMsg && (
          <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold shadow-xs">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Global Lead Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search leads, phone, agent..."
            className="pl-9 pr-14 py-2 text-xs font-medium bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 w-64 lg:w-72 placeholder-slate-400 transition-all shadow-2xs"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
            <Command size={10} />K
          </span>
        </div>

        {/* Meta OAuth Setup Shortcut */}
        <Link
          href="/settings"
          className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition-colors"
        >
          <Workflow size={14} className="text-slate-500" />
          <span>Meta Integrations</span>
        </Link>

        {/* 1-Click Real Meta Webhook Sync & Ingest */}
        <button
          onClick={handleSyncRealMetaLeads}
          disabled={syncing}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          title="Fetch real incoming leads from Facebook Page & auto-distribute to telecaller"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-blue-100" />}
          <span className="hidden sm:inline">Sync Meta Leads</span>
        </button>

        {/* Follow-up Alerts Notification Bell */}
        <button
          onClick={() => router.push('/followups')}
          className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          title="View Follow-up Alerts"
        >
          <Bell size={16} strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white text-xs font-bold flex items-center justify-center shadow-xs">
            KC
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">Admin Ops</p>
            <p className="text-[10px] text-emerald-600 font-semibold leading-tight">Clocked In</p>
          </div>
        </div>
      </div>
    </header>
  );
}
