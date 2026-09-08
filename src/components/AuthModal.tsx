import React, { useState } from 'react';
import { Zap, ShieldCheck, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface Props {
  onClose: () => void;
  onLogin: (name: string, email: string) => void;
}

export const AuthModal: React.FC<Props> = ({ onClose, onLogin }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('lastLoginEmail') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          console.warn('[AuthModal] Supabase sign-in error:', error.message);
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          const displayName = user.user_metadata?.full_name || email.split('@')[0].toUpperCase();
          try {
            await supabase.from('users').upsert({
              id: user.id,
              email: user.email,
              full_name: displayName,
              updated_at: new Date().toISOString()
            });
          } catch (uErr) {
            console.warn('[AuthModal] Upsert public.users profile warning:', uErr);
          }
          onLogin(displayName, user.email || email);
          onClose();
          return;
        }
      } else {
        // Non-Supabase fallback — allow login with email
        const nameFromEmail = email.split('@')[0].replace('.', ' ');
        onLogin(nameFromEmail.toUpperCase(), email);
        onClose();
      }
    } catch (err: any) {
      console.error('[AuthModal] Auth error:', err);
      setErrorMsg(err?.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-3xl p-6 border border-[#E2E8F0] space-y-5 shadow-2xl text-[#020617]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0b6623] flex items-center justify-center shadow-md shadow-[#0b6623]/20">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#020617]">CosmoCnergy Account</h3>
              <p className="text-xs text-slate-500">Enterprise Procurement OS</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-[#020617] font-bold p-1">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form: Standard Email, Password, and Submit */}
        <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4 text-xs">
          <div>
            <label htmlFor="auth-email" className="block font-semibold text-[#020617] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0b6623]" />
              <span>Email Address</span>
            </label>
            <input
              key="auth-email-input"
              id="auth-email"
              name="email"
              type="email"
              autoComplete="username"
              autoFocus={false}
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@cosmocnergy.com"
              className="w-full bg-[#F0F2F5] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#020617] focus:outline-none focus:border-[#0b6623] font-medium"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block font-semibold text-[#020617] mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#0b6623]" />
              <span>Password</span>
            </label>
            <input
              key="auth-password-input"
              id="auth-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus={false}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-[#F0F2F5] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#020617] focus:outline-none focus:border-[#0b6623] font-medium"
            />
          </div>

          <p className="text-[11px] text-slate-500 text-center pt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0b6623]" />
            Secure Enterprise Authentication via Supabase Auth.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F0F2F5] text-[#020617] font-semibold hover:bg-[#E2E8F0] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0b6623] hover:bg-[#084d1a] text-white font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
