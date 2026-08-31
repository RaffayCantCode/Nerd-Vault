import React, { useState } from "react";
import { X, Lock, Mail, User, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVault } from "../../context/VaultContext";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const { notify } = useVault();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please ensure both passwords match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        await login({ email, password });
        notify("Welcome back to your Vault!");
      } else {
        await register({ name, email, password });
        notify("Account created successfully!");
      }
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="nv-card relative w-full max-w-md rounded-3xl p-7 shadow-2xl border border-white/[.12] bg-[#10161b]">
        <button
          onClick={closeAuthModal}
          className="absolute right-5 top-5 rounded-xl p-1.5 text-slate-400 hover:bg-white/[.06] hover:text-slate-100"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <img
            src="/logo.png"
            alt="NerdVault"
            className="inline-block h-12 w-12 rounded-2xl object-contain drop-shadow-[0_0_20px_rgba(55,218,178,.3)] mb-3"
          />
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-100">
            {mode === "login" ? "Welcome to NerdVault" : "Join the Vault"}
          </h3>
          <p className="text-[12px] text-slate-500 mt-1">
            {mode === "login"
              ? "Track all your media in one sleek, unified sanctuary."
              : "Create your personal media archive and connect with friends."}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Display Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                  className="w-full rounded-xl border border-white/[.08] bg-white/[.03] pl-10 pr-3.5 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.4)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.03] pl-10 pr-3.5 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.4)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.03] pl-10 pr-10 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.4)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 p-1"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-white/[.08] bg-white/[.03] pl-10 pr-10 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.4)]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 p-1"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="nv-button mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3 text-[12px] font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
          >
            <CheckCircle2 size={16} />
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 border-t border-white/[.08] pt-4 text-center">
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="text-[12px] font-semibold text-slate-400 hover:text-[hsl(var(--primary))]"
          >
            {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
