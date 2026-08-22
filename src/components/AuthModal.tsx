import React, { useState } from 'react';
import { Zap, ShieldCheck, UserCheck, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface Props {
  onClose: () => void;
  onLogin: (name: string, email: string) => void;
}

export const AuthModal: React.FC<Props> = ({ onClose, onLogin }) => {
  const [email, setEmail] = useState('');
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

  const handleQuickDemoLogin = () => {
    onLogin('ANUJ (PROCUREMENT HEAD)', 'anuj@cosmocnergy.com');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] space-y-5 shadow-2xl text-[#073642]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#073642]">CosmoCnergy Account</h3>
              <p className="text-xs text-[#586E75]">Enterprise Procurement OS</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#586E75] hover:text-[#073642] font-bold p-1">
            ✕
          </button>
        </div>

        {/* ⚡ 1-CLICK QUICK DEMO LOGIN (ANUJ) */}
        <button
          type="button"
          onClick={handleQuickDemoLogin}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
        >
          <UserCheck className="w-5 h-5 text-white fill-white" />
          <span>⚡ 1-CLICK QUICK DEMO LOGIN (ANUJ)</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px bg-[#D6D1B1] flex-1" />
          <span className="text-[11px] text-[#586E75] font-bold uppercase tracking-wider">
            Sign In with Email
          </span>
          <div className="h-px bg-[#D6D1B1] flex-1" />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form: ONLY Email, Password, and Submit */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[#073642] mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="anuj@cosmocnergy.com"
              className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#073642] mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <p className="text-[10px] text-[#586E75] text-center pt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Admin-restricted portal. User creation is managed via Supabase Dashboard.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#D6D1B1]/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold hover:bg-[#E4DDC7] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
