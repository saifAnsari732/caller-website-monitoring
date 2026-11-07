"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  Calendar,
  TrendingUp,
  FileText,
  UserCheck,
  Layers,
  GitFork,
  Megaphone,
  MessageSquare,
  Zap,
  Activity,
  ChevronDown,
  Workflow,
  Sparkles,
  Target,
  Rocket,
  Globe
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [mgmtOpen, setMgmtOpen] = useState(true);

  const primaryItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Contacts & Leads', href: '/leads', icon: Users },
    { name: 'Pipeline & Campaigns', href: '/campaigns', icon: Megaphone },
    { name: 'Campaign Goals', href: '/goal', icon: Target, badge: 'GOAL' },
    { name: 'Campaign Boost', href: '/boost', icon: Rocket, badge: 'BOOST' },
    { name: 'Forms Browser', href: '/browser', icon: Globe, badge: 'META' },
    { name: 'Meta Live Leads', href: '/meta-leads', icon: Zap, badge: 'LIVE' },
    { name: 'Meta Integrations', href: '/settings', icon: Workflow },
    { name: 'Call Logs', href: '/calls', icon: PhoneCall },
    { name: 'Follow-ups', href: '/followups', icon: Calendar },
    { name: 'Pitch & Message Templates', href: '/templates', icon: MessageSquare },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Performance Matrix', href: '/performance', icon: TrendingUp },
  ];

  const managementItems = [
    { name: 'Telecallers (Agents)', href: '/telecallers', icon: UserCheck },
    { name: 'Sales Teams', href: '/teams', icon: Layers },
    { name: 'Distribution Rules', href: '/distribution', icon: GitFork },
    { name: 'Telephony & Health', href: '/system-health', icon: Activity },
  ];

  return (
    <aside className="w-[252px] bg-white text-slate-700 flex flex-col min-h-screen border-r border-slate-200/85 sticky top-0 h-screen select-none shrink-0 z-30">
      {/* Workspace Header */}
      <div className="p-3.5 border-b border-slate-200/80">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/60 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold tracking-wider shrink-0 shadow-sm shadow-blue-600/20">
              KC
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-slate-900 truncate leading-tight tracking-tight">
                KISAN INDIA PVT LTD
              </h1>
              <p className="text-[11px] text-blue-600 font-semibold tracking-tight truncate flex items-center gap-1">
                <Sparkles size={11} /> Enterprise CRM
              </p>
            </div>
          </div>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-1.5 pt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>

        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider ${
                  isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Management & Services Accordion */}
        <div className="pt-3 mt-2 border-t border-slate-100">
          <button
            onClick={() => setMgmtOpen(!mgmtOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <span>Administration</span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${mgmtOpen ? 'rotate-180' : ''}`} />
          </button>

          {mgmtOpen && (
            <div className="space-y-1 mt-1">
              {managementItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Live Sync Status Footer */}
      <div className="px-3.5 py-3 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-slate-600 font-semibold">Meta Engine Online</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
          v3.2
        </span>
      </div>
    </aside>
  );
}
