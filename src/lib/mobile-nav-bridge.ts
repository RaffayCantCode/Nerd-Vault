type FolderToggleHandler = () => void;

let folderToggleHandler: FolderToggleHandler | null = null;

export function registerMobileFolderToggle(handler: FolderToggleHandler) {
  folderToggleHandler = handler;
  return () => {
    if (folderToggleHandler === handler) {
      folderToggleHandler = null;
    }
  };
}

export function toggleMobileFolders() {
  if (folderToggleHandler) {
    folderToggleHandler();
    return false;
  }

  return true;
}

export function publishMobileFoldersOpen(open: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("nv-folders-open", { detail: { open } }));
}
