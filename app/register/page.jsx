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
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';

function evaluatePasswordStrength(pwd = '') {
  if (!pwd) return { score: 0, label: '' };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Operations HQ');
  const [adminCode, setAdminCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        department,
        adminCode: adminCode.trim(),
        password
      });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Unable to register Administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  const strengthColors = ['bg-slate-200', 'bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 sm:p-10">
      <div className="w-full max-w-[480px] space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to Admin Sign In</span>
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold mb-3">
              <ShieldCheck size={13} aria-hidden="true" />
              <span>Administrator Registration</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Create Admin Account
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Provision a new Administrator for the Web Monitoring Console. Telecaller accounts are created inside the Telecallers page for Mobile App login.
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
              <label htmlFor="reg-name" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Administrator Full Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  enterKeyHint="next"
                  required
                  placeholder="e.g. Rajesh Singh"
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="reg-mobile" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
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
                    placeholder="10-digit mobile"
                    className="w-full pl-10 pr-3 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
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
                    placeholder="admin@kisanindia.com"
                    className="w-full pl-10 pr-3 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="reg-dept" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Management Department
              </label>
              <select
                id="reg-dept"
                name="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="Operations HQ">Operations HQ</option>
                <option value="Sales Leadership">Sales Leadership</option>
                <option value="Meta Growth & Marketing">Meta Growth & Marketing</option>
              </select>
            </div>

            <div>
              <label htmlFor="reg-admin-code" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Admin Authorization Key
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="reg-admin-code"
                  name="adminCode"
                  type="text"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  required
                  placeholder="Enter HQ authorization key"
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
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

              <div id="password-strength-hint" className="mt-2 space-y-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-colors ${
                        strength.score >= idx ? strengthColors[strength.score] : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
                {password && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Password strength: <span className="font-semibold text-slate-700">{strength.label}</span>
                  </p>
                )}
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
                  <span>Creating Admin Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>Register Administrator</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in to Admin Console
          </Link>
        </p>
      </div>
    </div>
  );
}
