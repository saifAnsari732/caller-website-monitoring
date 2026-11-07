"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [mobile, setMobile] = useState('');
  const [emailOrEmp, setEmailOrEmp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const trimmed = emailOrEmp.trim();
      const isEmail = trimmed.includes('@');

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: mobile.trim(),
          email: isEmail ? trimmed : '',
          employeeId: !isEmail ? trimmed : '',
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      router.push('/login?reset=1');
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 sm:p-10">
      <div className="w-full max-w-[440px] space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to Sign In</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1E40AF] text-white flex items-center justify-center">
              <Building2 size={14} aria-hidden="true" />
            </div>
            <span className="font-heading text-xs font-bold text-slate-900">Kisan India CRM</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 sm:p-8 space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Reset account password
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Verify your registered mobile number along with your work email or Employee ID.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
            >
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-mobile" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="reset-mobile"
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  autoComplete="tel"
                  enterKeyHint="next"
                  required
                  placeholder="Enter 10-digit mobile"
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reset-identity" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Work Email or Employee ID
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="reset-identity"
                  name="identity"
                  type="text"
                  value={emailOrEmp}
                  onChange={(e) => setEmailOrEmp(e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  enterKeyHint="next"
                  required
                  placeholder="e.g. EMP001 or name@kisanindia.com"
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reset-new-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="reset-new-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  enterKeyHint="done"
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-11 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Resetting password...</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} aria-hidden="true" />
                  <span>Verify & Set New Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
