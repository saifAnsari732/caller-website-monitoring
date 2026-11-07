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
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-slate-200/90 select-none">
      {/* Brand Header */}
      <div
        className={`h-16 px-4 border-b border-slate-200/80 flex items-center ${
          isCollapsedView ? 'justify-center' : 'justify-between'
        } shrink-0`}
      >
        <Link
          href="/"
          className="flex items-center gap-3 min-w-0 group focus-visible:outline-none"
          title="Kisan India Pvt. Ltd. — Admin Console"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-blue-700 transition-colors">
            <Building2 size={18} strokeWidth={2} aria-hidden="true" />
          </div>
          {!isCollapsedView && (
            <div className="min-w-0">
              <p className="font-heading text-[13.5px] font-bold text-slate-900 truncate leading-tight">
                Kisan India CRM
              </p>
              <p className="text-[11.5px] text-slate-500 font-medium truncate leading-tight mt-0.5">
                Admin Monitoring Hub
              </p>
            </div>
          )}
        </Link>

        {!isCollapsedView && (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={17} strokeWidth={1.85} aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Close navigation menu"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {isCollapsedView && (
        <div className="px-3 pt-3 pb-1 flex justify-center">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen size={18} strokeWidth={1.85} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav
        aria-label="Main CRM Navigation"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
      >
        {NAVIGATION_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-1">
            {!isCollapsedView && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                {section.label}
              </div>
            )}

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
                    isCollapsedView ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                  } rounded-xl text-[13.5px] leading-5 transition-colors duration-150 group ${
                    isActive
                      ? 'bg-blue-50/90 text-blue-700 font-semibold'
                      : 'text-slate-600 font-medium hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-600"
                    />
                  )}

                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.1 : 1.85}
                      aria-hidden="true"
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? 'text-blue-600'
                          : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                    {!isCollapsedView && <span className="truncate">{item.name}</span>}
                  </span>

                  {!isCollapsedView && item.liveDot && (
                    <span
                      title="Live webhook stream active"
                      className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Administration & Security Section */}
        <div className="pt-3 border-t border-slate-200/70 space-y-1">
          {!isCollapsedView && (
            <button
              type="button"
              onClick={() => setAdminOpen((prev) => !prev)}
              aria-expanded={adminOpen}
              className="w-full flex items-center justify-between px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 hover:text-slate-700 transition-colors"
            >
              <span>Administration</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`transition-transform duration-150 ${adminOpen ? 'rotate-180' : ''}`}
              />
            </button>
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
                    isCollapsedView ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                  } rounded-xl text-[13.5px] leading-5 transition-colors duration-150 group ${
                    isActive
                      ? 'bg-blue-50/90 text-blue-700 font-semibold'
                      : 'text-slate-600 font-medium hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-600"
                    />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.1 : 1.85}
                    aria-hidden="true"
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  {!isCollapsedView && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
        </div>
      </nav>

      {/* Authenticated Administrator Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/60 shrink-0">
        {isCollapsedView ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/account"
              title={`${user?.name || 'Administrator'} · Admin Security`}
              className="relative w-9 h-9 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              {getInitials(user?.name)}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-emerald-500" />
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign out"
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={16} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-slate-200/90 p-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <Link href="/account" className="flex items-center gap-2.5 min-w-0 group">
                <div className="relative w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {getInitials(user?.name)}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors leading-tight">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate leading-tight mt-0.5">
                    Administrator{user?.employee_id ? ` · ${user.employee_id}` : ''}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => logout()}
                title="Sign out of Admin Console"
                aria-label="Sign out of Admin Console"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              >
                <LogOut size={16} strokeWidth={1.9} aria-hidden="true" />
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
        className={`hidden lg:block sticky top-0 h-screen shrink-0 z-30 transition-[width] duration-200 ease-out ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[264px]'
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
