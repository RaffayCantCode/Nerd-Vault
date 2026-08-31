import React, { useEffect, useState } from "react";
import { X, Send, Heart } from "lucide-react";
import { UnifiedMedia, api, UserProfile } from "../../lib/api";
import { useVault } from "../../context/VaultContext";
import { Avatar } from "../common/Avatar";

export function FriendRecModal({
  isOpen,
  onClose,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: UnifiedMedia;
}) {
  const { notify } = useVault();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getFriends()
        .then((res) => {
          const list = res.friends.length > 0 ? res.friends : res.suggested;
          setFriends(list);
          if (list[0]) setSelectedFriend(list[0].id);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!selectedFriend) return;
    setSending(true);
    try {
      await api.sendRecommendation({
        toUserId: selectedFriend,
        mediaId: item.id,
        note: note || `You have to check out ${item.title}!`,
      });
      notify(`Recommendation sent for ${item.title}`);
      onClose();
    } catch {
      notify("Failed to send recommendation");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="nv-card relative w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/[.12] bg-[#12181d]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/[.06] hover:text-slate-100"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-[hsl(var(--primary))] mb-4">
          <Heart size={16} fill="currentColor" />
          <span className="font-mono-ui text-[11px] uppercase tracking-wider font-bold">
            Recommend to a friend
          </span>
        </div>

        <div className="flex gap-4 p-3 rounded-xl bg-white/[.02] border border-white/[.06]">
          <img
            src={item.poster}
            alt=""
            className="h-16 w-12 rounded-lg object-cover"
          />
          <div>
            <h4 className="text-[13px] font-bold text-slate-200">{item.title}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {item.year} · {item.genre}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-2">
              Select Friend
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFriend(f.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                    selectedFriend === f.id
                      ? "border border-[hsl(var(--primary))]/40 bg-[rgba(55,218,178,.1)]"
                      : "border border-white/[.06] bg-white/[.02] hover:bg-white/[.05]"
                  }`}
                >
                  <Avatar initials={f.name.slice(0, 2).toUpperCase()} size="sm" />
                  <span className="text-[12px] font-bold text-slate-200">{f.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Add a note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="“The sound design alone is worth it...”"
              className="w-full rounded-xl border border-white/[.08] bg-white/[.03] px-3.5 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.4)]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-white/[.08] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="nv-button rounded-xl border border-white/[.1] px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !selectedFriend}
            className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-[11px] font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
          >
            <Send size={14} /> Send Pick
          </button>
        </div>
      </div>
    </div>
  );
}
