import React, { useState } from "react";
import { X, FolderPlus } from "lucide-react";
import { api } from "../../lib/api";
import { useVault } from "../../context/VaultContext";

export function CreateShelfModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (shelf: any) => void;
}) {
  const { notify, refreshShelves } = useVault();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await api.createShelf({
        name: name.trim(),
        description: description.trim(),
        visibility,
      });
      notify(`Created shelf “${name.trim()}”`);
      await refreshShelves();
      if (res?.shelf && onSuccess) {
        onSuccess(res.shelf);
      }
      setName("");
      setDescription("");
      onClose();
    } catch {
      notify("Failed to create shelf");
    } finally {
      setCreating(false);
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
          <FolderPlus size={18} />
          <span className="font-mono-ui text-[11px] uppercase tracking-wider font-bold">
            Create New Collection
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Collection Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midnight Cyberpunk, Rainy Day Rewatches"
              required
              className="w-full rounded-xl border border-white/[.08] bg-white/[.03] px-3.5 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.4)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A curated shelf of titles with heavy atmosphere..."
              rows={2}
              className="w-full rounded-xl border border-white/[.08] bg-white/[.03] p-3 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[rgba(55,218,178,.4)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", label: "Public" },
                { id: "friends", label: "Friends only" },
                { id: "private", label: "Private" },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisibility(v.id)}
                  className={`rounded-xl py-2 text-[11px] font-semibold transition ${
                    visibility === v.id
                      ? "bg-[hsl(var(--primary))] text-[#09201c] font-bold"
                      : "border border-white/[.08] bg-white/[.03] text-slate-400 hover:bg-white/[.06]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
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
              type="submit"
              disabled={creating || !name.trim()}
              className="nv-button rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-[11px] font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
            >
              Create Shelf
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
