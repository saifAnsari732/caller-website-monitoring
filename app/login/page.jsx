"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Phone, ShieldCheck, LogIn, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('admin');
  const [mobile, setMobile] = useState('9999999999');
  const [password, setPassword] = useState('admin123');

  const handleLogin = (e) => {
    e.preventDefault();
    router.push('/');
  };

  const setDemo = (userRole) => {
    setRole(userRole);
    if (userRole === 'admin') {
      setMobile('9999999999');
      setPassword('admin123');
    } else {
      setMobile('8888888888');
      setPassword('caller123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 space-y-6">
        {/* Branding Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-heading font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/25">
            KC
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">KISAN CONNECT</h1>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">Telecaller Monitoring & CRM</p>
        </div>

        {/* Role Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setDemo('admin')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              role === 'admin' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin Portal
          </button>
          <button
            type="button"
            onClick={() => setDemo('telecaller')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              role === 'telecaller' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Telecaller View
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mobile Number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter 10-digit mobile"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn size={16} /> Sign In to CRM
          </button>
        </form>

        {/* Demo Quick Auto-Fill */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs">
          <p className="font-semibold text-slate-700 mb-2">Demo Login Credentials (Tap to fill):</p>
          <div className="space-y-1.5">
            <button
              onClick={() => setDemo('admin')}
              className="w-full text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 flex justify-between items-center text-[11px] font-medium cursor-pointer transition-colors"
            >
              <span className="text-slate-800 font-semibold">Admin: 9999999999</span>
              <span className="text-blue-600 font-mono">admin123</span>
            </button>
            <button
              onClick={() => setDemo('telecaller')}
              className="w-full text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 flex justify-between items-center text-[11px] font-medium cursor-pointer transition-colors"
            >
              <span className="text-slate-800 font-semibold">Telecaller: 8888888888</span>
              <span className="text-blue-600 font-mono">caller123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
