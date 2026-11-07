"use client";
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Radio,
  Users,
  AlertCircle,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const resetSuccess = searchParams.get('reset') === '1';

  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validateField = (name, val) => {
    if (name === 'identifier') {
      if (!val.trim()) return 'Enter your Administrator mobile, email, or Admin ID.';
    }
    if (name === 'password') {
      if (!val) return 'Enter your Administrator password.';
    }
    return '';
  };

  const handleBlur = (name, val) => {
    const msg = validateField(name, val);
    setFieldErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const idErr = validateField('identifier', identifier);
    const pwdErr = validateField('password', password);
    if (idErr || pwdErr) {
      setFieldErrors({ identifier: idErr, password: pwdErr });
      return;
    }

    setSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password, rememberMe });
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please verify your Administrator credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F8FAFC]">
      {/* Left Brand & Trust Column */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#0F172A] text-white p-10 xl:p-14 flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Building2 size={20} strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <p className="font-heading text-base font-bold tracking-tight text-white">
                Kisan India Pvt. Ltd.
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Admin Monitoring & Operations Console
              </p>
            </div>
          </div>

          <div className="mt-14 space-y-4">
            <h1 className="font-heading text-3xl xl:text-[34px] font-bold tracking-tight text-white leading-[1.2]">
              Executive command center for Meta leads & telecalling floor.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              Monitor live Facebook & Instagram lead capture, manage telecaller teams, audit call recordings, and scale ad campaigns from one secure Administrator console.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Radio size={17} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Live Meta Graph API Sync</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Zero-loss webhook ingestion directly from connected Facebook & Instagram lead forms.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Users size={17} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Telecaller Floor Supervision</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Track real-time agent call velocity, SLA compliance, and mobile app dispositions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <ShieldCheck size={17} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Strict Administrator-Only Access</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Protected by encrypted bcrypt credentials, HttpOnly JWT sessions, brute-force lockout, and device session revocation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <Smartphone size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
          <span>Telecaller agents sign in exclusively via the Kisan Connect Mobile App.</span>
        </div>
      </div>

      {/* Right Admin Authentication Form Column */}
      <main className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Mobile Brand Header */}
          <div className="flex items-center gap-3 lg:hidden mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center">
              <Building2 size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-slate-900">Kisan India CRM</p>
              <p className="text-xs text-slate-500">Admin Monitoring Console</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 sm:p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold mb-3">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>Administrator Portal Only</span>
              </div>
              <h2 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
                Admin Sign In
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Sign in with your authorized Administrator mobile, email, or Admin ID.
              </p>
            </div>

            {resetSuccess && !error && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
              >
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Administrator password updated. Sign in below with your new password.</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium leading-relaxed"
              >
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form method="post" onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-[13px] font-semibold text-slate-700 mb-1.5"
                >
                  Admin Mobile, Email, or ID
                </label>
                <div className="relative">
                  <User
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="login-identifier"
                    name="username"
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (fieldErrors.identifier) {
                        setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                      }
                    }}
                    onBlur={(e) => handleBlur('identifier', e.target.value)}
                    autoComplete="username"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    enterKeyHint="next"
                    required
                    aria-invalid={Boolean(fieldErrors.identifier)}
                    aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
                    placeholder="e.g. 9876543210 or admin@kisanindia.com"
                    className={`w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white border rounded-xl text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      fieldErrors.identifier
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>
                {fieldErrors.identifier && (
                  <p id="identifier-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.identifier}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[13px] font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <Lock
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    onBlur={(e) => handleBlur('password', e.target.value)}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    placeholder="Enter administrator password"
                    className={`w-full pl-10 pr-11 py-2.5 text-base sm:text-sm bg-white border rounded-xl text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      fieldErrors.password
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label
                  htmlFor="remember-me"
                  className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none"
                >
                  <input
                    id="remember-me"
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                  />
                  <span>Keep admin session active for 30 days</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    <span>Verifying Admin Access...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} aria-hidden="true" />
                    <span>Sign In to Admin Console</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-600">
            Authorized to add another administrator?{' '}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Register Admin Account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
