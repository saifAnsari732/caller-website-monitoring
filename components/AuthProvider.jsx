"use client";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import Sidebar from './Sidebar';

const AuthContext = createContext(null);

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

export function AuthProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isPublicPage = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  // Restore sidebar preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('crm_sidebar_collapsed');
      if (saved === '1') setSidebarCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('crm_sidebar_collapsed', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) {
        setUser(null);
        setSessionId(null);
        return null;
      }
      const data = await res.json();
      if (data.authenticated && data.user && data.user.role === 'admin') {
        setUser(data.user);
        setSessionId(data.sessionId || null);
        return data.user;
      }
      setUser(null);
      setSessionId(null);
      return null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Redirect unauthenticated users to /login, and signed-in Admins away from /login
  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPage) {
      router.replace(`/login${pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''}`);
    } else if (user && user.role === 'admin' && isPublicPage) {
      router.replace('/');
    }
  }, [loading, user, isPublicPage, pathname, router]);

  const login = useCallback(async ({ identifier, password, rememberMe = true }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, rememberMe })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials');
    }
    setUser(data.user);
    setSessionId(data.sessionId || null);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    setUser(data.user);
    setSessionId(data.sessionId || null);
    return data;
  }, []);

  const logout = useCallback(async ({ clockOut = false } = {}) => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clockOut })
      });
    } finally {
      setUser(null);
      setSessionId(null);
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionId,
        loading,
        isAdmin,
        sidebarCollapsed,
        toggleSidebarCollapsed,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {isPublicPage ? (
        <div className="min-h-screen w-full bg-[#F8FAFC]">{children}</div>
      ) : loading || !user || user.role !== 'admin' ? (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-blue-600">
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-600" aria-hidden="true" />
            <span>Verifying Administrator Session...</span>
          </p>
        </div>
      ) : (
        <div className="flex min-h-screen w-full bg-[#F8FAFC]">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
            {children}
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      sessionId: null,
      loading: false,
      isAdmin: false,
      sidebarCollapsed: false,
      toggleSidebarCollapsed: () => {},
      mobileSidebarOpen: false,
      setMobileSidebarOpen: () => {},
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      refreshUser: async () => {}
    };
  }
  return ctx;
}
