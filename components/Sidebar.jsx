"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  CalendarClock,
  Megaphone,
  Radio,
  FileSpreadsheet,
  Target,
  TrendingUp,
  SlidersHorizontal,
  BarChart3,
  Award,
  MessageSquareText,
  UserCheck,
  Layers,
  GitFork,
  Activity,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  LogOut,
  Building2,
  X
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const NAVIGATION_SECTIONS = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Contacts & Leads', href: '/leads', icon: Users },
      { name: 'Call Logs', href: '/calls', icon: PhoneCall },
      { name: 'Follow-ups', href: '/followups', icon: CalendarClock },
    ],
  },
  {
    id: 'meta',
    label: 'Meta Ads & Pipeline',
    items: [
      { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
      { name: 'Meta Live Leads', href: '/meta-leads', icon: Radio, liveDot: true },
      { name: 'Lead Forms', href: '/browser', icon: FileSpreadsheet },
      { name: 'Campaign Goals', href: '/goal', icon: Target },
      { name: 'Budget Scaling', href: '/boost', icon: TrendingUp },
      { name: 'Meta Integrations', href: '/settings', icon: SlidersHorizontal },
    ],
  },
  {
    id: 'insights',
    label: 'Insights & Content',
    items: [
      { name: 'Reports & Exports', href: '/reports', icon: BarChart3 },
      { name: 'Agent Performance', href: '/performance', icon: Award },
      { name: 'Message Templates', href: '/templates', icon: MessageSquareText },
    ],
  },
];

const ADMIN_ITEMS = [
  { name: 'Telecallers (App)', href: '/telecallers', icon: UserCheck },
  { name: 'Sales Teams', href: '/teams', icon: Layers },
  { name: 'Distribution Rules', href: '/distribution', icon: GitFork },
  { name: 'System Health', href: '/system-health', icon: Activity },
  { name: 'Admin Security', href: '/account', icon: ShieldCheck },
];

function getInitials(name = 'AD') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const {
    user,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    logout,
  } = useAuth();

  const [adminOpen, setAdminOpen] = useState(true);

  const renderSidebarBody = (isCollapsedView = false) => (
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-slate-200/90 shadow-[4px_0_24px_rgba(15,23,42,0.02)] select-none">
      {/* Brand Header */}
      <div
        className={`h-16 px-4 border-b border-slate-200/80 flex items-center ${
          isCollapsedView ? 'justify-center px-2' : 'justify-between'
        } shrink-0 bg-white`}
      >
        {!isCollapsedView ? (
          <>
            <Link
              href="/"
              className="flex items-center gap-3 min-w-0 group focus-visible:outline-none"
              title="Kisan India Pvt. Ltd. — Admin Console"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30 border border-blue-500/20 group-hover:scale-105 transition-all">
                <Building2 size={19} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-sm font-bold text-slate-900 truncate leading-tight group-hover:text-blue-700 transition-colors">
                  Kisan India CRM
                </p>
                <p className="text-[11px] text-slate-500 font-semibold truncate leading-tight mt-0.5">
                  Admin Monitoring Hub
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden lg:inline-flex p-2 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 hover:border-blue-200 transition-all shadow-2xs cursor-pointer group"
              aria-label="Collapse sidebar (Ctrl+B)"
              title="Collapse sidebar (Ctrl+B)"
            >
              <PanelLeftClose size={17} strokeWidth={2} className="group-hover:scale-110 transition-transform" aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-600/30 hover:shadow-lg hover:scale-105 transition-all group cursor-pointer border border-blue-400/30"
            aria-label="Expand sidebar (Ctrl+B)"
            title="Expand sidebar (Ctrl+B)"
          >
            <PanelLeftOpen size={19} strokeWidth={2.2} className="group-hover:scale-110 transition-transform" aria-hidden="true" />
          </button>
        )}

        {/* Mobile drawer close button */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Main CRM Navigation"
        className="flex-1 overflow-y-auto px-2.5 sm:px-3 py-3.5 space-y-3.5"
      >
        {NAVIGATION_SECTIONS.map((section, idx) => (
          <div key={section.id} className="space-y-1">
            {!isCollapsedView ? (
              <div className="px-3 pt-1 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                {section.label}
              </div>
            ) : idx > 0 ? (
              <div className="h-px bg-slate-200/80 my-2 mx-1" />
            ) : null}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsedView ? item.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center ${
                    isCollapsedView
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2'
                  } rounded-xl text-[13.5px] leading-5 transition-all duration-150 group cursor-pointer ${
                    isActive
                      ? isCollapsedView
                        ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400/30'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold shadow-md shadow-blue-600/25 border border-blue-500/30'
                      : 'text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={`flex items-center ${isCollapsedView ? 'justify-center' : 'gap-2.5'} min-w-0`}>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50'
                      }`}
                    >
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.2 : 2}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                    </div>
                    {!isCollapsedView && <span className="truncate">{item.name}</span>}
                  </span>

                  {!isCollapsedView && item.liveDot && (
                    <span
                      title="Live webhook stream active"
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-400/40 text-emerald-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Administration & Security Section */}
        <div className="pt-2 border-t border-slate-200/80 space-y-1">
          {!isCollapsedView ? (
            <button
              type="button"
              onClick={() => setAdminOpen((prev) => !prev)}
              aria-expanded={adminOpen}
              className="w-full flex items-center justify-between px-3 pt-1 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <span>Administration</span>
              <ChevronDown
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                className={`transition-transform duration-150 ${adminOpen ? 'rotate-180' : ''}`}
              />
            </button>
          ) : (
            <div className="h-px bg-slate-200/80 my-1 mx-1" />
          )}

          {(adminOpen || isCollapsedView) &&
            ADMIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsedView ? item.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center ${
                    isCollapsedView
                      ? 'justify-center p-2.5'
                      : 'gap-2.5 px-3 py-2'
                  } rounded-xl text-[13.5px] leading-5 transition-all duration-150 group cursor-pointer ${
                    isActive
                      ? isCollapsedView
                        ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400/30'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold shadow-md shadow-blue-600/25 border border-blue-500/30'
                      : 'text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50'
                    }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.2 : 2}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                  </div>
                  {!isCollapsedView && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
        </div>
      </nav>

      {/* Authenticated Administrator Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/80 shrink-0">
        {isCollapsedView ? (
          <div className="flex flex-col items-center gap-2.5">
            <Link
              href="/account"
              title={`${user?.name || 'Administrator'} · Admin Security`}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-xs font-bold flex items-center justify-center hover:shadow-md transition-all border border-slate-700 cursor-pointer"
            >
              {getInitials(user?.name)}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white bg-emerald-500" />
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              title="Sign Out of Admin Console"
              aria-label="Sign out"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/90 p-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <Link href="/account" className="flex items-center gap-2.5 min-w-0 group cursor-pointer">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                  {getInitials(user?.name)}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors leading-tight">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold truncate leading-tight mt-0.5">
                    Administrator{user?.employee_id ? ` · ${user.employee_id}` : ''}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => logout()}
                title="Sign out of Admin Console"
                aria-label="Sign out of Admin Console"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:block sticky top-0 h-screen shrink-0 z-30 transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        {renderSidebarBody(sidebarCollapsed)}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-[276px] max-w-[85vw] h-full z-10 shadow-2xl">
            {renderSidebarBody(false)}
          </aside>
        </div>
      )}
    </>
  );
}
