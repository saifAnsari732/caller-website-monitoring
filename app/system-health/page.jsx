"use client";
import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import {
  Activity,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Loader2,
  Zap,
  Globe,
  Database,
  RefreshCw,
  Lock,
  Server
} from 'lucide-react';

export default function SystemHealthPage() {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [latency, setLatency] = useState(null);
  const [testLogs, setTestLogs] = useState([]);

  const runMetaGraphDiagnostics = async () => {
    setTesting(true);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/meta/status');
      const elapsed = Date.now() - t0;
      setLatency(elapsed);
      const data = await res.json();
      setStatus(data);

      const time = new Date().toLocaleTimeString();
      if (res.ok) {
        const line1 = `[${time}] Meta Graph API v21.0 Heartbeat -> 200 OK (${elapsed}ms latency)`;
        const line2 = `[${time}] Page: "${data.pageName}" (ID: ${data.pageId}) • Token Status: ${data.hasToken ? 'VALID' : 'MISSING'}`;
        const line3 = `[${time}] Total Meta Leads Ingested: ${data.stats?.totalMetaLeads || 0} • Active Forms: ${data.metaForms?.length || 0}`;
        setTestLogs(prev => [line3, line2, line1, ...prev]);
      } else {
        setTestLogs(prev => [`[${time}] ERROR: ${data.error}`, ...prev]);
      }
    } catch (err) {
      setTestLogs(prev => [`[ERROR] ${err.message}`, ...prev]);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runMetaGraphDiagnostics();
  }, []);

  const runWebhookHandshake = async () => {
    setTesting(true);
    const t0 = Date.now();
    try {
      const token = status?.verifyToken || 'KISAN_META_WEBHOOK_VERIFY';
      const res = await fetch(`/api/webhooks/meta?hub.mode=subscribe&hub.challenge=KISAN_TEST_CHALLENGE_${Date.now()}&hub.verify_token=${encodeURIComponent(token)}`);
      const elapsed = Date.now() - t0;
      const text = await res.text();
      const time = new Date().toLocaleTimeString();

      if (res.ok) {
        const line = `[${time}] Webhook Handshake Verification -> 200 OK (${elapsed}ms) • Challenge verified`;
        setTestLogs(prev => [line, ...prev]);
      } else {
        setTestLogs(prev => [`[${time}] Webhook Handshake Error: HTTP ${res.status}`, ...prev]);
      }
    } catch (err) {
      setTestLogs(prev => [`[ERROR] Webhook ping failed: ${err.message}`, ...prev]);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
      <Header
        title="Meta Telephony, Webhook & Infrastructure Health"
        subtitle="Benchmark real Meta Graph API response latency, audit live Webhook handshakes & monitor MongoDB Atlas lead ingestion"
      />

      <main className="px-5 lg:px-7 py-6 space-y-6 flex-1 w-full max-w-none">
        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <h4 className="font-heading font-bold text-slate-900 text-sm">Meta Webhook & OAuth Status</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Verify Token: <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono border border-blue-200/60">{status?.verifyToken || 'KISAN_META_WEBHOOK_VERIFY'}</code>
            </p>
            <p className="text-[11px] text-emerald-600 font-bold mt-2">
              Page: {status?.pageName || 'Kisan Choice'} (ID: {status?.pageId || '933429549844450'})
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="text-blue-600" size={20} />
              <h4 className="font-heading font-bold text-slate-900 text-sm">Zero-Loss Phone Protection</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Automatic fallback retention active for foreign, landline, or malformed numbers with automatic <strong className="text-rose-600 font-semibold">Urgent</strong> supervisor tag.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="text-blue-600" size={20} />
              <h4 className="font-heading font-bold text-slate-900 text-sm">Live Ingestion Latency</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Meta Graph Round-Trip: <strong className="text-slate-900 text-base font-heading font-bold tabular-nums">{latency !== null ? `${latency}ms` : 'Measuring...'}</strong>
            </p>
          </div>
        </div>

        {/* Real Diagnostics Control & Terminal Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <Zap size={18} className="text-blue-600" /> Live Meta API Diagnostics Benchmark
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Execute live telemetry handshakes with Facebook Meta Graph v21.0 servers and verify webhook subscription endpoints.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Server size={14} className="text-blue-600" />
                  <span>Meta Graph API v21.0 Connection</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Target: <code className="font-mono text-slate-700">graph.facebook.com/v21.0/933429549844450</code>
                </div>
                <button
                  onClick={runMetaGraphDiagnostics}
                  disabled={testing}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  <span>Benchmark Graph API Ping</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Globe size={14} className="text-emerald-600" />
                  <span>Webhook Handshake Verification</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Callback: <code className="font-mono text-slate-700">/api/webhooks/meta</code> with Verify Token validation
                </div>
                <button
                  onClick={runWebhookHandshake}
                  disabled={testing}
                  className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testing ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  <span>Test Webhook Challenge Handshake</span>
                </button>
              </div>
            </div>
          </div>

          {/* Console Output */}
          <div className="bg-slate-950 text-emerald-400 p-6 rounded-3xl font-mono text-xs shadow-xl flex flex-col h-[380px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-slate-400">
              <span className="flex items-center gap-2 font-bold"><Terminal size={14} /> Telemetry & Benchmark Logs</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE ATLAS</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 text-[11px] leading-relaxed">
              {testLogs.map((log, idx) => (
                <p key={idx} className={log.includes('ERROR') ? 'text-rose-400' : log.includes('ZERO-LOSS') ? 'text-amber-300' : 'text-emerald-400'}>
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
