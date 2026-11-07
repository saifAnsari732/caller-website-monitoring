"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';
import {
  ShieldCheck,
  User,
  Lock,
  Laptop,
  Smartphone,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  RefreshCw
} from 'lucide-react';

export default function AccountSecurityPage() {
  const { user, refreshUser, logout } = useAuth();

  // Admin Profile State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Operations HQ');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState([]);
  const [scope, setScope] = useState('mine'); // 'mine' | 'all'
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDepartment(user.team || 'Operations HQ');
    }
  }, [user]);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/auth/sessions${scope === 'all' ? '?scope=all' : ''}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const showNotice = (type, text) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4500);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          team: department
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');
      await refreshUser();
      showNotice('success', 'Administrator profile updated.');
    } catch (err) {
      showNotice('error', err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPwd(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: revokeOthers
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');
      setCurrentPassword('');
      setNewPassword('');
      await fetchSessions();
      showNotice('success', data.message || 'Password updated.');
    } catch (err) {
      showNotice('error', err.message);
    } finally {
      setSavingPwd(false);
    }
  };

  const handleRevokeSession = async (sid) => {
    setRevokingId(sid);
    try {
      const res = await fetch(`/api/auth/sessions?sid=${encodeURIComponent(sid)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke session');
      await fetchSessions();
      showNotice('success', 'Device session revoked.');
    } catch (err) {
      showNotice('error', err.message);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    setRevokingId('ALL');
    try {
      const res = await fetch('/api/auth/sessions?allOther=1', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke sessions');
      await fetchSessions();
      showNotice('success', data.message || 'All other sessions signed out.');
    } catch (err) {
      showNotice('error', err.message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header
        title="Admin Security & Access"
        subtitle="Manage your Administrator credentials, password rotation, and active web sessions"
      />

      <main className="px-5 lg:px-7 py-6 space-y-6 flex-1 w-full max-w-none">
        {banner && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold ${
              banner.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {banner.type === 'error' ? (
              <AlertCircle size={16} className="text-rose-600 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" aria-hidden="true" />
            )}
            <span>{banner.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Administrator Profile */}
          <section className="lg:col-span-6 crm-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User size={19} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Administrator Profile
                  </h2>
                  <p className="text-xs text-slate-500">
                    {user?.email || user?.mobile} · {user?.employee_id || 'ADM'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                Administrator
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="acc-name" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  id="acc-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Registered Mobile
                  </label>
                  <input
                    type="text"
                    value={user?.mobile || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="acc-dept" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Department
                  </label>
                  <select
                    id="acc-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="Operations HQ">Operations HQ</option>
                    <option value="Sales Leadership">Sales Leadership</option>
                    <option value="Meta Growth & Marketing">Meta Growth & Marketing</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                >
                  {savingProfile ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save size={14} aria-hidden="true" />
                  )}
                  <span>Save Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-3.5 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <LogOut size={14} aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </form>
          </section>

          {/* Password & Token Security */}
          <section className="lg:col-span-6 crm-card p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lock size={19} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-slate-900">
                  Password & Credentials
                </h2>
                <p className="text-xs text-slate-500">
                  Update your Admin password and rotate active JWT tokens across devices
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="pwd-current" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="pwd-current"
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Enter current password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd((p) => !p)}
                    aria-label={showCurrentPwd ? 'Hide current password' : 'Show current password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="pwd-new" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="pwd-new"
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd((p) => !p)}
                    aria-label={showNewPwd ? 'Hide new password' : 'Show new password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <label
                htmlFor="revoke-others"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 cursor-pointer"
              >
                <input
                  id="revoke-others"
                  type="checkbox"
                  checked={revokeOthers}
                  onChange={(e) => setRevokeOthers(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>Sign out all other browsers and devices after updating password</span>
              </label>

              <button
                type="submit"
                disabled={savingPwd}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
              >
                {savingPwd ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck size={14} aria-hidden="true" />
                )}
                <span>Update Admin Password</span>
              </button>
            </form>
          </section>
        </div>

        {/* Active Sessions & Audit Table */}
        <section className="crm-card overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900">
                Active Admin Sessions & Login Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor signed-in browsers and revoke unauthorized access immediately
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setScope('mine')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    scope === 'mine' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  My Devices
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    scope === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  All Admin Logins
                </button>
              </div>

              <button
                type="button"
                onClick={fetchSessions}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                aria-label="Refresh sessions"
                title="Refresh sessions"
              >
                <RefreshCw size={15} className={loadingSessions ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={handleRevokeAllOther}
                disabled={revokingId === 'ALL'}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
              >
                Sign Out Other Devices
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="crm-table-th">Device & Browser</th>
                  {scope === 'all' && <th className="crm-table-th">Administrator</th>}
                  <th className="crm-table-th">IP Address</th>
                  <th className="crm-table-th">Last Active</th>
                  <th className="crm-table-th">Status</th>
                  <th className="crm-table-th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingSessions ? (
                  <tr>
                    <td colSpan={scope === 'all' ? 6 : 5} className="p-8 text-center text-slate-500">
                      <Loader2 size={18} className="animate-spin inline mr-2" />
                      Loading session audit history...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={scope === 'all' ? 6 : 5} className="p-8 text-center text-slate-500">
                      No recorded sessions found.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => {
                    const isMobile =
                      s.deviceLabel.includes('Android') || s.deviceLabel.includes('iOS');
                    const Icon = isMobile ? Smartphone : Laptop;
                    const activeState = !s.revoked && !s.isExpired;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                              <Icon size={15} aria-hidden="true" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{s.deviceLabel}</p>
                              <p className="text-[11px] text-slate-400">
                                Signed in {new Date(s.createdAt).toLocaleDateString('en-IN')}{' '}
                                {new Date(s.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </td>

                        {scope === 'all' && (
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-800">{s.userName}</p>
                            <p className="text-[11px] text-slate-500">
                              Administrator {s.employeeId ? `· ${s.employeeId}` : ''}
                            </p>
                          </td>
                        )}

                        <td className="px-4 py-3.5 font-mono text-slate-600">{s.ipAddress}</td>

                        <td className="px-4 py-3.5 text-slate-600">
                          {s.lastActiveAt
                            ? new Date(s.lastActiveAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Just now'}
                        </td>

                        <td className="px-4 py-3.5">
                          {s.isCurrent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Current Device
                            </span>
                          ) : activeState ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium text-[11px]">
                              Revoked
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {activeState && !s.isCurrent ? (
                            <button
                              type="button"
                              onClick={() => handleRevokeSession(s.sessionId)}
                              disabled={revokingId === s.sessionId}
                              className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-[11px] transition-colors"
                            >
                              {revokingId === s.sessionId ? 'Revoking...' : 'Revoke'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
