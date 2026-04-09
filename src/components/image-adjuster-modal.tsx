"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ImageAdjusterModalProps = {
  file: File | null;
  title: string;
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
  onClose: () => void;
  onApply: (dataUrl: string) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ImageAdjusterModal({
  file,
  title,
  aspectRatio = 1,
  outputWidth = 512,
  outputHeight = 512,
  onClose,
  onApply,
}: ImageAdjusterModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }, [file]);

  if (!file || !objectUrl) {
    return null;
  }

  const previewUrl = objectUrl;

  async function handleApply() {
    const image = new Image();
    image.decoding = "async";
    image.src = previewUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load selected image."));
    });

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const sourceAspect = sourceWidth / sourceHeight;

    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;

    if (sourceAspect > aspectRatio) {
      cropHeight = sourceHeight;
      cropWidth = cropHeight * aspectRatio;
    } else {
      cropWidth = sourceWidth;
      cropHeight = cropWidth / aspectRatio;
    }

    cropWidth /= zoom;
    cropHeight /= zoom;

    const maxOffsetX = Math.max(0, (sourceWidth - cropWidth) / 2);
    const maxOffsetY = Math.max(0, (sourceHeight - cropHeight) / 2);
    const centerX = sourceWidth / 2 + offsetX * maxOffsetX;
    const centerY = sourceHeight / 2 + offsetY * maxOffsetY;
    const cropX = clamp(centerX - cropWidth / 2, 0, sourceWidth - cropWidth);
    const cropY = clamp(centerY - cropHeight / 2, 0, sourceHeight - cropHeight);

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not prepare image canvas.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
    onApply(dataUrl);
    onClose();
  }

  return (
    <div className="sidebar-modal-shell" onClick={onClose}>
      <div className="sidebar-folder-modal glass image-adjuster-modal" onClick={(event) => event.stopPropagation()}>
        <div className="sidebar-folder-modal-header">
          <div>
            <strong>{title}</strong>
            <p className="copy">Adjust the framing, then apply the image.</p>
          </div>
          <button type="button" className="topbar-panel-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="image-adjuster-stage" style={{ aspectRatio }}>
          <img
            ref={imgRef}
            src={previewUrl}
            alt="Selected preview"
            className="image-adjuster-preview"
            onLoad={(event) =>
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            style={{
              transform: `translate(${offsetX * 18}%, ${offsetY * 18}%) scale(${zoom})`,
            }}
          />
        </div>

        <div className="image-adjuster-controls">
          <label className="image-adjuster-label">
            <span>Zoom</span>
            <input type="range" min="1" max="2.6" step="0.02" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <label className="image-adjuster-label">
            <span>Left / Right</span>
            <input type="range" min="-1" max="1" step="0.01" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
          </label>
          <label className="image-adjuster-label">
            <span>Up / Down</span>
            <input type="range" min="-1" max="1" step="0.01" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} />
          </label>
          <p className="copy">Source: {imageSize.width} x {imageSize.height}</p>
        </div>

        <div className="sidebar-folder-actions">
          <button type="button" className="button button-primary" onClick={() => void handleApply()}>
            Apply
          </button>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
