import React, { useState } from "react";
import { X, Check, Lock, Eye, Users } from "lucide-react";
import { api, UserProfile } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useVault } from "../../context/VaultContext";

export function EditProfileModal({
  isOpen,
  onClose,
  currentUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}) {
  const { updateUser } = useAuth();
  const { notify } = useVault();

  const [name, setName] = useState(currentUser.name || "");
  const [bio, setBio] = useState(currentUser.bio || "");

  // Section-by-section privacy settings
  const savedSettings = JSON.parse(localStorage.getItem(`nv_privacy_${currentUser.id}`) || "{}");
  const [favVisibility, setFavVisibility] = useState<"public" | "friends" | "private">(savedSettings.favorites || "public");
  const [dnaVisibility, setDnaVisibility] = useState<"public" | "friends" | "private">(savedSettings.dna || "public");
  const [activityVisibility, setActivityVisibility] = useState<"public" | "friends" | "private">(savedSettings.activity || "public");
  const [logsVisibility, setLogsVisibility] = useState<"public" | "friends" | "private">(savedSettings.logs || "public");

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({ name, bio });
      if (res?.user) {
        updateUser(res.user);
      }

      // Save privacy settings
      localStorage.setItem(
        `nv_privacy_${currentUser.id}`,
        JSON.stringify({
          favorites: favVisibility,
          dna: dnaVisibility,
          activity: activityVisibility,
          logs: logsVisibility,
        })
      );

      notify("Profile and privacy settings updated!");
      onClose();
    } catch {
      notify("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const privacyOptions = [
    { label: "Public", value: "public" as const, icon: Eye },
    { label: "Friends Only", value: "friends" as const, icon: Users },
    { label: "Private", value: "private" as const, icon: Lock },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0">
      <div className="nv-card relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/[.14] bg-[#11171c] max-h-[90vh] overflow-y-auto [scrollbar-width:none]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/[.08] hover:text-slate-100"
        >
          <X size={18} />
        </button>

        <h3 className="font-display text-xl font-bold text-slate-100 mb-4">
          Edit Profile & Privacy
        </h3>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/[.1] bg-black/30 px-3.5 py-2.5 text-[13px] text-slate-200 outline-none focus:border-[rgba(55,218,178,.5)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell others what you love collecting..."
              className="w-full rounded-2xl border border-white/[.1] bg-black/30 p-3 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.5)]"
            />
          </div>

          {/* Section Visibility Controls */}
          <div className="pt-2 border-t border-white/[.08] space-y-3.5">
            <p className="font-mono-ui text-[10px] uppercase font-bold tracking-wider text-[hsl(var(--primary))]">
              Section Privacy Settings
            </p>

            {[
              { title: "Favorite 4 Showcase", state: favVisibility, set: setFavVisibility },
              { title: "Taste DNA Breakdown", state: dnaVisibility, set: setDnaVisibility },
              { title: "Activity Chronicle", state: activityVisibility, set: setActivityVisibility },
              { title: "Vault Logs & Diary", state: logsVisibility, set: setLogsVisibility },
            ].map((sec) => (
              <div key={sec.title} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-white/[.02] border border-white/[.06] p-3">
                <span className="text-[12px] font-semibold text-slate-200">{sec.title}</span>
                <div className="flex gap-1.5">
                  {privacyOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = sec.state === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => sec.set(opt.value)}
                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold transition ${
                          isSelected
                            ? "bg-[hsl(var(--primary))] text-[#08211c] shadow-sm font-extrabold"
                            : "bg-white/[.04] text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon size={11} /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-2.5 border-t border-white/[.08] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="nv-button rounded-xl border border-white/[.1] px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nv-button flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-[11px] font-extrabold text-[#09201c] hover:bg-[#73e4c7] shadow-lg"
            >
              <Check size={14} /> Save Profile & Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
