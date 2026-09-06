import React, { useState, useEffect } from "react";
import { X, Pencil, Globe, Lock, Users, Trash2 } from "lucide-react";
import { api, Shelf } from "../../lib/api";
import { useVault } from "../../context/VaultContext";

export function EditShelfModal({
  isOpen,
  onClose,
  shelf,
  onSuccess,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  shelf: Shelf;
  onSuccess?: (updated: Shelf) => void;
  onDelete?: () => void;
}) {
  const { notify, refreshShelves } = useVault();
  const [name, setName] = useState(shelf.name || "");
  const [description, setDescription] = useState(shelf.description || "");
  const [visibility, setVisibility] = useState(shelf.visibility || "public");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(shelf.name || "");
    setDescription(shelf.description || "");
    setVisibility(shelf.visibility || "public");
    setConfirmDelete(false);
  }, [shelf, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.updateShelf(shelf.id, {
        name: name.trim(),
        description: description.trim(),
        visibility,
      });
      notify(`Updated shelf “${name.trim()}”`);
      await refreshShelves();
      if (res?.shelf && onSuccess) {
        onSuccess(res.shelf);
      }
      onClose();
    } catch {
      notify("Failed to update shelf");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteShelf(shelf.id);
      notify(`Deleted shelf “${shelf.name}”`);
      await refreshShelves();
      onClose();
      if (onDelete) {
        onDelete();
      }
    } catch {
      notify("Failed to delete shelf");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div className="nv-card relative w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/[.14] bg-[#12181d]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/[.08] hover:text-slate-100 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 text-[hsl(var(--primary))] mb-5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-[rgba(55,218,178,.12)] text-[hsl(var(--primary))]">
            <Pencil size={16} />
          </div>
          <div>
            <span className="font-mono-ui text-[10.5px] uppercase tracking-wider font-bold text-[hsl(var(--primary))]">
              Manage Shelf
            </span>
            <h3 className="font-display text-lg font-bold text-slate-100">
              Edit shelf settings
            </h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Shelf Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Masterpiece Cinema, Weekend Anime"
              required
              className="w-full rounded-xl border border-white/[.1] bg-[#172027] px-3.5 py-2.5 text-[13px] font-medium text-slate-200 placeholder:text-slate-600 outline-none focus:border-[hsl(var(--primary))] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of titles belong on this shelf?"
              rows={3}
              className="w-full rounded-xl border border-white/[.1] bg-[#172027] p-3 text-[13px] font-medium text-slate-200 placeholder:text-slate-600 outline-none focus:border-[hsl(var(--primary))] transition resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", label: "Public", icon: Globe },
                { id: "friends", label: "Friends", icon: Users },
                { id: "private", label: "Private", icon: Lock },
              ].map((v) => {
                const Icon = v.icon;
                const isSelected = visibility === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVisibility(v.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-[12px] font-bold transition ${
                      isSelected
                        ? "bg-[hsl(var(--primary))] text-[#08211c] shadow-md shadow-[rgba(55,218,178,.25)]"
                        : "border border-white/[.08] bg-white/[.03] text-slate-400 hover:bg-white/[.06] hover:text-slate-200"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div className="border-t border-white/[.08] pt-4 mt-5">
            {confirmDelete ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-2">
                <p className="text-[12px] font-bold text-rose-300">
                  Delete this shelf permanently?
                </p>
                <p className="text-[11px] text-slate-400 leading-4">
                  The shelf will be removed. Media titles in your vault won't be deleted.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="nv-button rounded-lg border border-white/[.1] px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/[.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="nv-button rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-rose-500 shadow-md"
                  >
                    {deleting ? "Deleting..." : "Yes, delete shelf"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="nv-button flex items-center gap-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
                >
                  <Trash2 size={13} />
                  Delete shelf
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="nv-button rounded-xl border border-white/[.1] px-4 py-2.5 text-[12px] font-bold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="nv-button rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-lg shadow-[rgba(55,218,178,.25)]"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
