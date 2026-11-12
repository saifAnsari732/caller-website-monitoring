"use client";
import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  Zap,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
  Command,
  Menu,
  ShieldCheck,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

function getInitials(name = 'AD') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Header({ title, subtitle }) {
  const router = useRouter();
  const { user, sidebarCollapsed, toggleSidebarCollapsed, setMobileSidebarOpen, logout } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const searchInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        setToastMsg(`Meta Sync: Ingested ${data.syncedCount || 0} leads from Facebook Page`);
        setTimeout(() => setToastMsg(null), 4500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSearchKey = (e) => {
    if (e.nativeEvent?.isComposing) return;
    if (e.key === 'Enter' && searchVal.trim()) {
      router.push(`/leads?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/85 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 z-20 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={18} strokeWidth={1.9} aria-hidden="true" />
        </button>

        {/* Desktop sidebar collapse / expand button */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="hidden lg:inline-flex p-2 rounded-xl border border-slate-200/80 bg-slate-50/80 hover:bg-blue-50 text-slate-600 hover:text-blue-700 hover:border-blue-200 shadow-2xs transition-all shrink-0 cursor-pointer"
          aria-label={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={18} strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} strokeWidth={1.9} aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-heading truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 font-normal truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold"
          >
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Global Lead Search */}
        <div className="relative hidden md:block">
          <Search
            size={15}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKey}
            aria-label="Search leads, phone number, or agent"
            placeholder="Search leads, phone, agent..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="pl-9 pr-14 py-2 text-[13px] font-normal bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-slate-800 w-60 lg:w-68 placeholder-slate-400 transition-all"
          />
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400 flex items-center gap-0.5 pointer-events-none"
          >
            <Command size={10} />K
          </span>
        </div>

        {/* Meta OAuth Setup Shortcut */}
        <Link
          href="/settings"
          className="hidden xl:flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[12.5px] font-semibold transition-colors"
        >
          <SlidersHorizontal size={14} className="text-slate-600" aria-hidden="true" />
          <span>Meta Setup</span>
        </Link>

        {/* 1-Click Real Meta Webhook Sync & Ingest */}
        <button
          type="button"
          onClick={handleSyncRealMetaLeads}
          disabled={syncing}
          className="px-3.5 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-[12.5px] font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
          title="Fetch real incoming leads from Facebook Page & auto-distribute to telecallers"
        >
          {syncing ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Zap size={14} aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Sync Meta</span>
        </button>

        {/* Follow-up Alerts Notification Bell */}
        <button
          type="button"
          onClick={() => router.push('/followups')}
          aria-label="View follow-up alerts"
          title="View Follow-up Alerts"
          className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <Bell size={17} strokeWidth={1.85} aria-hidden="true" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Authenticated Admin Profile Dropdown */}
        <div className="relative pl-1 border-l border-slate-200" ref={menuRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 py-1 px-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-[12.5px] font-semibold text-slate-900 leading-tight max-w-[128px] truncate">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[11px] text-blue-600 font-medium leading-tight">
                Administrator
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" aria-hidden="true" />
          </button>

          {profileMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-lg py-2 z-50"
            >
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.name || 'CRM Administrator'}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {user?.email || user?.mobile || ''}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700">
                    Administrator
                  </span>
                  {user?.employee_id && (
                    <span className="text-[11px] font-mono text-slate-500">
                      {user.employee_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="py-1 px-1.5">
                <Link
                  href="/account"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <ShieldCheck size={16} className="text-slate-500" aria-hidden="true" />
                  <span>Admin Security & Sessions</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
