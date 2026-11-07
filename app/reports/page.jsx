"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  Download,
  AlertCircle,
  ArrowUpRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('AGENT_PRODUCTIVITY');
  const [telecallers, setTelecallers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReportsData = useCallback(async () => {
    try {
      const [tcRes, leadsRes, dashRes] = await Promise.all([
        fetch('/api/telecallers'),
        fetch('/api/leads'),
        fetch('/api/dashboard')
      ]);
      const [tcData, leadsData, dashData] = await Promise.all([
        tcRes.json(),
        leadsRes.json(),
        dashRes.json()
      ]);
      if (tcData.telecallers) setTelecallers(tcData.telecallers);
      if (leadsData.leads) setLeads(leadsData.leads);
      if (dashData.kpis) setDashboard(dashData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Compute Agent Productivity from real telecallers
  const agentProductivity = telecallers.map(tc => {
    const convRate = tc.assignedLeads > 0
      ? `${((tc.interested / tc.assignedLeads) * 100).toFixed(1)}%`
      : '0.0%';
    const targetAchieved = `${Math.min(100, Math.round((tc.todaysCalls / (tc.targetCalls || 50)) * 100))}%`;
    return {
      name: tc.name,
      team: tc.team,
      assigned: tc.assignedLeads || 0,
      calls: tc.todaysCalls || 0,
      connected: tc.connected || 0,
      interested: tc.interested || 0,
      closed: tc.closed || 0,
      conversionRate: convRate,
      targetAchieved
    };
  });

  // Compute Lead Aging from real leads
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const agingBuckets = [
    { label: 'Fresh & Assigned (Uncontacted)', statuses: ['Fresh Lead', 'Assigned'], riskLevel: 'High' },
    { label: 'Follow-Up & Callback Pipeline', statuses: ['Follow Up', 'Callback'], riskLevel: 'Medium' },
    { label: 'Interested & Hot Prospects', statuses: ['Interested', 'Distributor Interested', 'Trader Interested', 'DSS Interested', 'RSS Interested', 'SS Interested'], riskLevel: 'Low' }
  ];

  const leadAgingData = agingBuckets.map(bucket => {
    const matching = leads.filter(l => bucket.statuses.includes(l.status));
    let under24h = 0;
    let between24to72h = 0;
    let over3Days = 0;
    matching.forEach(l => {
      const age = now - new Date(l.createdAt).getTime();
      if (age < dayMs) under24h++;
      else if (age <= 3 * dayMs) between24to72h++;
      else over3Days++;
    });
    return {
      status: bucket.label,
      total: matching.length,
      agingUnder24h: under24h,
      aging24to72h: between24to72h,
      agingStuckOver3Days: over3Days,
      riskLevel: bucket.riskLevel
    };
  });

  // Source / Period Breakdown
  const kpis = dashboard?.kpis || {};
  const summaryMetrics = [
    { metric: 'Total CRM Leads Ingested', current: kpis.totalLeads || leads.length, benchmark: 'Live MongoDB', note: `${kpis.freshLeads || 0} Fresh in Queue` },
    { metric: 'Total Calls Logged', current: kpis.todaysCalls || 0, benchmark: `${kpis.connectedCalls || 0} Connected`, note: 'Mobile + Web Dialer' },
    { metric: 'Interested / Qualified Prospects', current: kpis.interestedLeads || 0, benchmark: 'Hot Pipeline', note: 'Distributor & Trader Inquiries' },
    { metric: 'Closed Revenue Deals', current: kpis.closedDeals || 0, benchmark: `${kpis.conversionRate || 0}% Win Rate`, note: 'Verified Orders' },
    { metric: 'Due & Overdue Follow-ups', current: kpis.pendingFollowups || 0, benchmark: `${kpis.overdueFollowups || 0} Overdue`, note: 'Callback Schedule' },
    { metric: 'SLA Breached (>15m Uncalled)', current: kpis.slaBreachCount || 0, benchmark: '15m SLA Target', note: 'Auto-Redistribution Ready' }
  ];

  const handleExportCSV = () => {
    let rows = [];
    const filename = `KisanIndia_Report_${selectedReport}_${Date.now()}.csv`;

    if (selectedReport === 'AGENT_PRODUCTIVITY') {
      rows = [
        'Agent,Team,AssignedLeads,CallsMade,Connected,Interested,ClosedDeals,QualificationRate,TargetAchieved',
        ...agentProductivity.map(a => `"${a.name}","${a.team}",${a.assigned},${a.calls},${a.connected},${a.interested},${a.closed},"${a.conversionRate}","${a.targetAchieved}"`)
      ];
    } else if (selectedReport === 'LEAD_AGING') {
      rows = [
        'Stage,TotalLeads,Under24h,Between24_72h,StuckOver3Days,RiskLevel',
        ...leadAgingData.map(l => `"${l.status}",${l.total},${l.agingUnder24h},${l.aging24to72h},${l.agingStuckOver3Days},"${l.riskLevel}"`)
      ];
    } else {
      rows = [
        'Metric,CurrentValue,Benchmark,Details',
        ...summaryMetrics.map(d => `"${d.metric}","${d.current}","${d.benchmark}","${d.note}"`)
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Executive Reports & CSV Exports"
        subtitle="Real-time MongoDB agent productivity reports, pipeline aging bottleneck analysis & 1-click Excel/CSV export"
      />

      <main className="p-6 lg:p-8 space-y-6 flex-1">
        {/* Top Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl flex-wrap">
            <button
              onClick={() => setSelectedReport('AGENT_PRODUCTIVITY')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedReport === 'AGENT_PRODUCTIVITY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agent Productivity Report
            </button>
            <button
              onClick={() => setSelectedReport('LEAD_AGING')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedReport === 'LEAD_AGING' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lead Aging & Stuck Leads
            </button>
            <button
              onClick={() => setSelectedReport('EXECUTIVE_SUMMARY')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedReport === 'EXECUTIVE_SUMMARY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive KPI Summary
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); fetchReportsData(); }}
              className="p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Reports"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download size={15} /> Export CSV / Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-14 bg-white rounded-2xl border border-slate-200/80 text-center text-slate-500 font-medium">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            Generating live reports from MongoDB...
          </div>
        ) : (
          <>
            {/* REPORT 1: AGENT PRODUCTIVITY */}
            {selectedReport === 'AGENT_PRODUCTIVITY' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <h3 className="font-heading font-bold text-base text-slate-900">Agent-wise Call Output & Conversion Report</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        <th className="p-3.5 pl-4">Telecaller</th>
                        <th className="p-3.5">Sales Team</th>
                        <th className="p-3.5">Assigned Leads</th>
                        <th className="p-3.5">Calls Dialed</th>
                        <th className="p-3.5">Connected</th>
                        <th className="p-3.5">Interested</th>
                        <th className="p-3.5">Deals Closed</th>
                        <th className="p-3.5">Qual. Rate</th>
                        <th className="p-3.5 pr-4">Call Target %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                      {agentProductivity.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 pl-4 font-semibold text-slate-900">{row.name}</td>
                          <td className="p-3.5 text-slate-500">{row.team}</td>
                          <td className="p-3.5 tabular-nums text-slate-700">{row.assigned}</td>
                          <td className="p-3.5 font-bold text-slate-900 tabular-nums">{row.calls}</td>
                          <td className="p-3.5 font-semibold text-blue-600 tabular-nums">{row.connected}</td>
                          <td className="p-3.5 font-semibold text-indigo-600 tabular-nums">{row.interested}</td>
                          <td className="p-3.5 font-semibold text-emerald-600 tabular-nums">{row.closed}</td>
                          <td className="p-3.5 font-bold text-blue-700 tabular-nums">{row.conversionRate}</td>
                          <td className="p-3.5 pr-4 font-bold text-emerald-600 tabular-nums">{row.targetAchieved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORT 2: LEAD AGING */}
            {selectedReport === 'LEAD_AGING' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <AlertCircle size={20} className="text-amber-500 shrink-0" />
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900">Pipeline Aging & Bottleneck Report</h3>
                    <p className="text-xs text-slate-500 font-medium">Live age distribution of leads across MongoDB pipeline stages</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        <th className="p-3.5 pl-4">Pipeline Stage Group</th>
                        <th className="p-3.5">Total Leads</th>
                        <th className="p-3.5">Fresh (&lt;24h)</th>
                        <th className="p-3.5">24h – 72h Old</th>
                        <th className="p-3.5">Aging (&gt;3 Days)</th>
                        <th className="p-3.5 pr-4">SLA Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {leadAgingData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 pl-4 font-semibold text-slate-900">{row.status}</td>
                          <td className="p-3.5 font-bold text-slate-900 tabular-nums">{row.total}</td>
                          <td className="p-3.5 text-emerald-600 font-semibold tabular-nums">{row.agingUnder24h}</td>
                          <td className="p-3.5 text-amber-600 font-semibold tabular-nums">{row.aging24to72h}</td>
                          <td className="p-3.5 font-bold text-rose-600 tabular-nums">{row.agingStuckOver3Days}</td>
                          <td className="p-3.5 pr-4">
                            <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              row.riskLevel === 'High' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {row.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORT 3: EXECUTIVE SUMMARY */}
            {selectedReport === 'EXECUTIVE_SUMMARY' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                <h3 className="font-heading font-bold text-base text-slate-900">Executive CRM Telemetry Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {summaryMetrics.map((item, idx) => (
                    <div key={idx} className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-2">
                      <p className="text-xs font-semibold text-slate-500">{item.metric}</p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-heading font-bold text-slate-900 tabular-nums">{item.current}</span>
                        <span className="text-xs text-blue-600 font-semibold">{item.benchmark}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <ArrowUpRight size={14} /> {item.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
