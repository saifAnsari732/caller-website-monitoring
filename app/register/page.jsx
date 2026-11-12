"use client";
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Radio,
  Users,
  Sparkles,
  Smartphone,
  Activity
} from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';

function evaluatePasswordStrength(pwd = '') {
  const checks = {
    minLength: pwd.length >= 6,
    strongLength: pwd.length >= 10,
    mixedCase: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
    numberOrSymbol: /\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)
  };

  if (!pwd) return { score: 0, label: '', checks };
  let score = 0;
  if (checks.minLength) score += 1;
  if (checks.strongLength) score += 1;
  if (checks.mixedCase) score += 1;
  if (checks.numberOrSymbol) score += 1;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score], checks };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const normalizedMobile = useMemo(
    () => String(mobile || '').replace(/\D/g, '').slice(-10),
    [mobile]
  );
  const isNameValid = name.trim().length >= 2;
  const isMobileValid = normalizedMobile.length === 10;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        mobile: normalizedMobile,
        email: email.trim(),
        password,
        role: 'admin'
      });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Unable to register Administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  const strengthColors = [
    'bg-slate-200',
    'bg-rose-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500'
  ];

  const strengthTextColors = [
    'text-slate-500',
    'text-rose-600',
    'text-amber-600',
    'text-blue-600',
    'text-emerald-600'
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F8FAFC]">
      {/* Left Executive Brand & Architecture Column */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E1B4B] text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient Decorative Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -right-28 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-12 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative z-10">
          {/* Brand Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 border border-white/15">
                <Building2 size={21} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div>
                <p className="font-heading text-base font-bold tracking-tight text-white">
                  Kisan India Pvt. Ltd.
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  Executive CRM & Meta Operations Console
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Meta v21.0 Live
            </span>
          </div>

          {/* Hero Copy */}
          <div className="mt-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-blue-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles size={13} className="text-amber-300" aria-hidden="true" />
              <span>Instant Administrator Onboarding</span>
            </div>
            <h1 className="font-heading text-3xl xl:text-[34px] font-bold tracking-tight text-white leading-[1.2]">
              Launch your executive command account in seconds.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              Create your Administrator profile to supervise live Facebook &amp; Instagram lead capture, orchestrate telecaller distribution, and monitor real-time campaign ROI.
            </p>
          </div>

          {/* Feature Highlight Cards */}
          <div className="mt-9 space-y-3.5">
            <div className="p-4 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.09] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-600/25">
                <Radio size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Zero-Loss Meta Lead Ads Ingestion
                </p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Real-time Graph API v21.0 sync &amp; webhook capture directly from connected Facebook &amp; Instagram forms.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.09] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-600/25">
                <Users size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Smart Round-Robin Telecaller Floor
                </p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Automated cyclic lead assignment, SLA callback alerts, and live mobile app disposition tracking.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.09] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-600/25">
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Direct Encrypted Admin Access
                </p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Protected with bcrypt credential hashing and HttpOnly JWT sessions with instant workspace sign-in upon registration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Smartphone size={15} className="text-blue-400 shrink-0" aria-hidden="true" />
            <span>Telecaller agents are provisioned inside the Telecallers console.</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold text-slate-200 shrink-0">
            <Activity size={12} className="text-emerald-400" aria-hidden="true" />
            v4.2
          </span>
        </div>
      </div>

      {/* Right Administrator Registration Form Column */}
      <main className="lg:col-span-7 flex flex-col justify-center items-center p-5 sm:p-8 xl:p-12 relative">
        <div className="w-full max-w-[500px] space-y-5">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-2xs text-xs font-semibold transition-all cursor-pointer"
            >
              <ArrowLeft size={14} className="text-blue-600" aria-hidden="true" />
              <span>Back to Admin Sign In</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/70">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
                <Building2 size={13} aria-hidden="true" />
              </div>
              <span className="font-heading text-xs font-bold text-slate-900">
                Kisan India CRM
              </span>
            </div>
          </div>

          {/* Main Registration Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
            {/* Top Colorful Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

            <div className="p-6 sm:p-8 space-y-6">
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-700 text-[11px] font-bold tracking-wide uppercase">
                    <ShieldCheck size={13} className="text-blue-600" aria-hidden="true" />
                    <span>Administrator Registration</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold">
                    <CheckCircle2 size={12} className="text-emerald-600" aria-hidden="true" />
                    <span>Direct Activation</span>
                  </span>
                </div>

                <h2 className="font-heading text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                  Create Admin Account
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Provision a new Administrator for the Web Monitoring Console. You will be signed in immediately upon registration.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium leading-relaxed"
                >
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form method="post" onSubmit={handleSubmit} className="space-y-4">
                {/* Administrator Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="reg-name"
                      className="block text-[13px] font-semibold text-slate-700"
                    >
                      Administrator Full Name
                    </label>
                    {isNameValid && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Ready
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 group-focus-within:bg-blue-50 text-slate-500 group-focus-within:text-blue-600 flex items-center justify-center transition-colors pointer-events-none">
                      <User size={15} aria-hidden="true" />
                    </div>
                    <input
                      id="reg-name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      enterKeyHint="next"
                      required
                      placeholder="Enter administrator full name"
                      className="w-full pl-12 pr-4 py-2.5 text-base sm:text-sm bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/15 transition-all"
                    />
                  </div>
                </div>

                {/* Mobile Number & Work Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="reg-mobile"
                        className="block text-[13px] font-semibold text-slate-700"
                      >
                        Mobile Number
                      </label>
                      {isMobileValid && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 size={12} aria-hidden="true" />
                          10 digits
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 group-focus-within:bg-blue-50 text-slate-500 group-focus-within:text-blue-600 flex items-center justify-center transition-colors pointer-events-none">
                        <Phone size={15} aria-hidden="true" />
                      </div>
                      <input
                        id="reg-mobile"
                        name="mobile"
                        type="tel"
                        inputMode="numeric"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        autoComplete="tel"
                        enterKeyHint="next"
                        required
                        placeholder="10-digit mobile number"
                        className="w-full pl-12 pr-3.5 py-2.5 text-base sm:text-sm bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="reg-email"
                        className="block text-[13px] font-semibold text-slate-700"
                      >
                        Work Email
                      </label>
                      {isEmailValid && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 size={12} aria-hidden="true" />
                          Valid
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 group-focus-within:bg-blue-50 text-slate-500 group-focus-within:text-blue-600 flex items-center justify-center transition-colors pointer-events-none">
                        <Mail size={15} aria-hidden="true" />
                      </div>
                      <input
                        id="reg-email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        spellCheck={false}
                        enterKeyHint="next"
                        required
                        placeholder="name@company.com"
                        className="w-full pl-12 pr-3.5 py-2.5 text-base sm:text-sm bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Create Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="reg-password"
                      className="block text-[13px] font-semibold text-slate-700"
                    >
                      Create Password
                    </label>
                    {password && (
                      <span
                        className={`text-[11px] font-bold ${
                          strengthTextColors[strength.score]
                        }`}
                      >
                        {strength.label} Password
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 group-focus-within:bg-blue-50 text-slate-500 group-focus-within:text-blue-600 flex items-center justify-center transition-colors pointer-events-none">
                      <Lock size={15} aria-hidden="true" />
                    </div>
                    <input
                      id="reg-password"
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      enterKeyHint="done"
                      required
                      aria-describedby="password-strength-hint"
                      placeholder="Minimum 6 characters"
                      className="w-full pl-12 pr-11 py-2.5 text-base sm:text-sm bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Meter & Requirement Chips */}
                  <div id="password-strength-hint" className="mt-2.5 space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            strength.score >= idx
                              ? strengthColors[strength.score]
                              : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                          strength.checks.minLength
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200/80 text-slate-500'
                        }`}
                      >
                        <CheckCircle2 size={11} aria-hidden="true" />
                        6+ characters
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                          strength.checks.mixedCase
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200/80 text-slate-500'
                        }`}
                      >
                        <CheckCircle2 size={11} aria-hidden="true" />
                        Upper &amp; lowercase
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                          strength.checks.numberOrSymbol
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200/80 text-slate-500'
                        }`}
                      >
                        <CheckCircle2 size={11} aria-hidden="true" />
                        Number or symbol
                      </span>
                    </div>
                  </div>
                </div>

                {/* Colorful Gradient Box Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-indigo-600/30 border border-blue-500/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                        <span>Creating Administrator Account...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={17} aria-hidden="true" />
                        <span>Register Administrator Account</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom Divider & Sign-In Box Action */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Already have an Administrator account?
                </span>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>Sign In to Admin Console</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
