"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../../components/Header';
import {
  BarChart3,
  TrendingUp,
  Users,
  PhoneCall,
  PhoneForwarded,
  Clock,
  Target,
  Award,
  Download,
  Printer,
  FileText,
  Sparkles,
  Filter,
  Calendar,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  X,
  Building2,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Percent,
  Check,
  Flame
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

const DISPOSITION_COLORS = {
  'Connected': '#2563EB',
  'Interested': '#4F46E5',
  'Distributor Interested': '#6366F1',
  'Trader Interested': '#818CF8',
  'DSS Interested': '#7C3AED',
  'RSS Interested': '#9333EA',
  'SS Interested': '#A855F7',
  'Follow Up': '#D97706',
  'Callback': '#F59E0B',
  'Closed': '#059669',
  'Not Connected': '#64748B',
  'Wrong Number': '#E11D48',
  'Rejected': '#DC2626',
  'Other': '#94A3B8'
};

export default function ReportsPage() {
  const [range, setRange] = useState('7d');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected agent for drilldown modal
  const [selectedAgent, setSelectedAgent] = useState(null);

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState(false);

  const fetchReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('range', range);
      if (teamFilter !== 'ALL') params.set('team', teamFilter);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Reports fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, teamFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Filtered agents by search query
  const filteredAgents = useMemo(() => {
    if (!data?.agentMetrics) return [];
    if (!searchQuery.trim()) return data.agentMetrics;
    const q = searchQuery.toLowerCase();
    return data.agentMetrics.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.employee_id || '').toLowerCase().includes(q) ||
      (a.mobile || '').includes(q) ||
      (a.team || '').toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Teams list for dropdown
  const uniqueTeams = useMemo(() => {
    if (!data?.agentMetrics) return ['ALL'];
    const teams = new Set(data.agentMetrics.map(a => a.team).filter(Boolean));
    return ['ALL', ...Array.from(teams)];
  }, [data]);

  // Handle CSV Export
  const handleExportCSV = (exportType = 'AGENTS') => {
    if (!data) return;
    let csvRows = [];
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename = `KisanIndia_Telecaller_Performance_${range}_${timestamp}.csv`;

    if (exportType === 'AGENTS') {
      csvRows.push([
        'Rank',
        'Telecaller Name',
        'Employee ID',
        'Sales Team',
        'Shift Status',
        'Assigned Leads',
        'Calls Dialed',
        'Connected Calls',
        'Connection Rate',
        'Total Talk Time',
        'Avg Duration',
        'Interested Prospects',
        'Closed Deals',
        'Conversion Rate',
        'Daily Call Target',
        'Target Achieved %',
        'Productivity Score (100)',
        'Performance Rating'
      ].join(','));

      (data.agentMetrics || []).forEach(a => {
        csvRows.push([
          `"${a.rank}"`,
          `"${a.name}"`,
          `"${a.employee_id}"`,
          `"${a.team}"`,
          `"${a.shiftStatus}"`,
          a.assignedLeads,
          a.totalCalls,
          a.connectedCalls,
          `"${a.connectionRate}"`,
          `"${a.totalTalkTimeFormatted}"`,
          `"${a.avgTalkTimeFormatted}"`,
          a.interestedLeads,
          a.closedDeals,
          `"${a.conversionRate}"`,
          a.targetCalls,
          `"${a.targetAchievedPercent}%"`,
          a.productivityScore,
          `"${a.rating}"`
        ].join(','));
      });
    } else {
      // Call logs dump
      filename = `KisanIndia_Call_Logs_Dump_${range}_${timestamp}.csv`;
      csvRows.push([
        'Call Date Time',
        'Telecaller',
        'Employee ID',
        'Lead ID',
        'Lead Name',
        'Mobile',
        'City',
        'Call Disposition',
        'Duration Seconds',
        'Duration Formatted',
        'Call Notes'
      ].join(','));

      (data.callLogs || []).forEach(c => {
        csvRows.push([
          `"${c.callTime}"`,
          `"${c.callerName}"`,
          `"${c.callerEmployeeId}"`,
          `"${c.leadId}"`,
          `"${c.leadName}"`,
          `"${c.leadMobile}"`,
          `"${c.leadCity}"`,
          `"${c.status}"`,
          c.durationSec,
          `"${c.durationFormatted}"`,
          `"${(c.notes || '').replace(/"/g, '""')}"`
        ].join(','));
      });
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Direct Browser Print Trigger for PDF Generation
  const handlePrintPdf = () => {
    window.print();
  };

  const summary = data?.summary || {};

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      {/* Hide standard header during printing */}
      <div className="print:hidden">
        <Header
          title="Telecaller Performance & Intelligence Reports"
          subtitle="Real-time MongoDB call audit telemetry, agent velocity matrices, productivity scores & 1-click PDF/CSV exports"
        />
      </div>

      {/* Main Container */}
      <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 print:p-0 print:space-y-4">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 print:hidden">
          {/* Range Selector Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl flex-wrap">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'all', label: 'All Time' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setRange(pill.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  range === pill.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Search & Team Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search telecaller name, ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
            >
              {uniqueTeams.map(t => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'All Sales Teams' : t}
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchReports(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            </button>

            {/* Colorful Box Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('AGENTS')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 hover:shadow-md transition-all cursor-pointer"
              >
                <Download size={14} aria-hidden="true" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setShowPdfModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white text-xs font-bold shadow-sm shadow-blue-600/20 hover:shadow-md transition-all cursor-pointer"
              >
                <Printer size={14} aria-hidden="true" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Official Header (Shows ONLY when printing) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                KC
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Kisan India Pvt. Ltd.</h1>
                <p className="text-xs text-slate-600">Executive Telecaller Operations & Performance Audit Report</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p className="font-semibold text-slate-900">Period: {range.toUpperCase()}</p>
              <p>Generated: {new Date().toLocaleString('en-IN')}</p>
              <p>Source: Live MongoDB Enterprise CRM</p>
            </div>
          </div>
        </div>

        {/* 4 Colorful High-Impact Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Calls */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-blue-400 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Calls Dialed</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PhoneCall size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-heading text-slate-900 tabular-nums">
                {summary.totalCalls || 0}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {summary.connectionRate || '0.0%'} Connected
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {summary.connectedCalls || 0} productive connected calls
            </p>
          </div>

          {/* Card 2: Talk Time */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-purple-400 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Talk Time</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-heading text-slate-900 tabular-nums">
                {summary.totalTalkTimeFormatted || '0s'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Avg duration: <span className="font-semibold text-slate-700">{summary.avgTalkTimeFormatted || '0s'}</span> / call
            </p>
          </div>

          {/* Card 3: Hot Pipeline */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Qualified Pipeline</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Target size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-heading text-slate-900 tabular-nums">
                {summary.hotProspects || 0}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {summary.closedDeals || 0} Won Deals
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              High-intent distributor &amp; trade leads
            </p>
          </div>

          {/* Card 4: Top Performer */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Top Telecaller</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-lg font-bold font-heading text-slate-900 truncate">
                {summary.topPerformer?.name || 'Assigned Agent'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Score: {summary.topPerformer?.score || 0}/100
              </span>
              <span>• {summary.activeTelecallers || 0} Active on floor</span>
            </div>
          </div>
        </div>

        {/* Visual Charts Section (Hidden in print for clean table presentation) */}
        {data?.timelineData && data.timelineData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* Call Volume Velocity Area Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-heading font-bold text-slate-900">
                    Call Volume &amp; Connection Velocity
                  </h3>
                  <p className="text-xs text-slate-400">Daily calling trajectory and successful connects</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold">
                  <Flame size={12} className="text-amber-500" />
                  Live Velocity
                </span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="connGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#FFF',
                        fontSize: '12px'
                      }}
                    />
                    <Area type="monotone" dataKey="totalCalls" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#callGradient)" name="Calls Made" />
                    <Area type="monotone" dataKey="connectedCalls" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#connGradient)" name="Connected" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Disposition Distribution Bars */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-heading font-bold text-slate-900">
                    Call Dispositions Breakdown
                  </h3>
                  <p className="text-xs text-slate-400">Call outcomes across the floor</p>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(data.dispositionCounts || {})
                  .filter(([_, count]) => count > 0)
                  .slice(0, 6)
                  .map(([name, count]) => {
                    const total = summary.totalCalls || 1;
                    const pct = Math.round((count / total) * 100);
                    const color = DISPOSITION_COLORS[name] || '#64748B';
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            {name}
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Telecaller Performance Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award size={18} className="text-blue-600" />
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Telecaller Performance &amp; Productivity Scorecard
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Composite evaluation based on calls, connection velocity, qualification %, and talk duration
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <span className="text-xs font-semibold text-slate-500">
                Showing {filteredAgents.length} Agents
              </span>
              <button
                onClick={() => handleExportCSV('AGENTS')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/90 border-b border-slate-100">
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-12">Rank</th>
                  <th className="py-3.5 px-4">Telecaller Profile</th>
                  <th className="py-3.5 px-4">Assigned</th>
                  <th className="py-3.5 px-4">Calls Dialed</th>
                  <th className="py-3.5 px-4">Connected (%)</th>
                  <th className="py-3.5 px-4">Total Talk Time</th>
                  <th className="py-3.5 px-4">Interested / Won</th>
                  <th className="py-3.5 px-4">Daily Target %</th>
                  <th className="py-3.5 px-4">Score</th>
                  <th className="py-3.5 px-4 print:hidden text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400 font-medium">
                      <Loader2 size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                      Loading live telecaller reports...
                    </td>
                  </tr>
                ) : filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-10 text-center text-slate-400">
                      No telecallers match the current filter or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((agent) => {
                    const isRank1 = agent.rank === 1;
                    const isRank2 = agent.rank === 2;
                    const isRank3 = agent.rank === 3;

                    return (
                      <tr
                        key={agent.id}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        {/* Rank Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isRank1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold inline-flex items-center justify-center text-xs shadow-2xs border border-amber-300">
                              1
                            </span>
                          ) : isRank2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold inline-flex items-center justify-center text-xs border border-slate-300">
                              2
                            </span>
                          ) : isRank3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-800 font-bold inline-flex items-center justify-center text-xs border border-amber-200">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">{agent.rank}</span>
                          )}
                        </td>

                        {/* Telecaller Name & Team */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                              {agent.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors block">
                                {agent.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {agent.employee_id} • {agent.team}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Leads */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700 tabular-nums">
                          {agent.assignedLeads}
                        </td>

                        {/* Calls Dialed */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                          {agent.totalCalls}
                        </td>

                        {/* Connected */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-blue-600 tabular-nums block">
                            {agent.connectedCalls}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {agent.connectionRate}
                          </span>
                        </td>

                        {/* Talk Time */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-purple-700 tabular-nums block">
                            {agent.totalTalkTimeFormatted}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Avg: {agent.avgTalkTimeFormatted}
                          </span>
                        </td>

                        {/* Interested / Won */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-indigo-600 tabular-nums">{agent.interestedLeads} Int</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-emerald-600 tabular-nums">{agent.closedDeals} Won</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Conv: {agent.conversionRate}
                          </span>
                        </td>

                        {/* Target Achieved */}
                        <td className="py-3.5 px-4">
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                              <span>{agent.targetAchievedPercent}%</span>
                              <span className="text-slate-400">/{agent.targetCalls}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  agent.targetAchievedPercent >= 100
                                    ? 'bg-emerald-500'
                                    : agent.targetAchievedPercent >= 60
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, agent.targetAchievedPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Productivity Score */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${agent.ratingColor}`}>
                            <Sparkles size={11} />
                            <span>{agent.productivityScore}</span>
                          </span>
                        </td>

                        {/* Drilldown Arrow */}
                        <td className="py-3.5 px-4 print:hidden text-right">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all cursor-pointer"
                            title="View Deep Telecaller Audit"
                          >
                            <ChevronRight size={16} />
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

        {/* Detailed Call Logs Stream with Recording URL */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden print:hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">
                Recent Telecalling Floor Logs &amp; Dispositions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Timestamped call logs with lead outcomes and audio playback
              </p>
            </div>
            <button
              onClick={() => handleExportCSV('LOGS')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>Export Call Logs CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Call Time</th>
                  <th className="py-3 px-4">Caller (Agent)</th>
                  <th className="py-3 px-4">Lead &amp; Phone</th>
                  <th className="py-3 px-4">Outcome Disposition</th>
                  <th className="py-3 px-4">Talk Duration</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.callLogs?.slice(0, 15).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                      {c.callTime}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {c.callerName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{c.leadName}</span>
                      <span className="text-[11px] text-slate-400 tabular-nums">{c.leadMobile}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                        style={{
                          backgroundColor: `${DISPOSITION_COLORS[c.status] || '#64748B'}15`,
                          borderColor: `${DISPOSITION_COLORS[c.status] || '#64748B'}40`,
                          color: DISPOSITION_COLORS[c.status] || '#64748B'
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                      {c.durationFormatted}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {c.notes || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Print Sign-off Footer (ONLY in print) */}
        <div className="hidden print:block pt-8 mt-8 border-t border-slate-300">
          <div className="flex justify-between items-end text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">CRM Telecalling Operations Center</p>
              <p>System Generated Report • Confidential &amp; Proprietary</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b border-slate-900 mb-1" />
              <p className="font-semibold text-slate-900">Authorized Signatory / Administrator</p>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: Individual Agent Drilldown Modal */}
      {selectedAgent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 relative overflow-hidden">
            {/* Top Bar Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {selectedAgent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-heading font-bold text-slate-900">
                      {selectedAgent.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${selectedAgent.ratingColor}`}>
                      Rank #{selectedAgent.rank} • {selectedAgent.rating}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedAgent.employee_id} • {selectedAgent.team} • {selectedAgent.shiftStatus}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-semibold block">Calls Made</span>
                <span className="text-xl font-bold text-slate-900 tabular-nums">{selectedAgent.totalCalls}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                <span className="text-[11px] text-blue-700 font-semibold block">Connected</span>
                <span className="text-xl font-bold text-blue-700 tabular-nums">{selectedAgent.connectedCalls} ({selectedAgent.connectionRate})</span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                <span className="text-[11px] text-purple-700 font-semibold block">Talk Time</span>
                <span className="text-xl font-bold text-purple-700 tabular-nums">{selectedAgent.totalTalkTimeFormatted}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <span className="text-[11px] text-emerald-700 font-semibold block">Productivity</span>
                <span className="text-xl font-bold text-emerald-700 tabular-nums">{selectedAgent.productivityScore} / 100</span>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Daily Target Velocity</span>
                <span className="font-bold text-blue-600">{selectedAgent.targetAchievedPercent}% Achieved ({selectedAgent.totalCalls}/{selectedAgent.targetCalls} Calls)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                  style={{ width: `${Math.min(100, selectedAgent.targetAchievedPercent)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PDF Executive Preview & Export Modal */}
      {showPdfModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-slate-900">
                    Export Executive Audit PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    Prepares high-resolution printable report for management
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Report Scope:</span>
                <span className="font-semibold text-slate-900">{range.toUpperCase()} Telecaller Audit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sales Floor:</span>
                <span className="font-semibold text-slate-900">{teamFilter === 'ALL' ? 'All Sales Teams' : teamFilter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Included Callers:</span>
                <span className="font-semibold text-slate-900">{filteredAgents.length} Agents</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Format:</span>
                <span className="font-semibold text-blue-600">Clean A4 Executive Vector PDF</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Clicking below opens the print dialogue. Select <strong className="text-slate-800">Save as PDF</strong> in your browser to save the audit report with official headers, KPI cards, and signature line.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPdfModal(false);
                  setTimeout(() => window.print(), 250);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                <Printer size={15} />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
