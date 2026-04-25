"use client";

import { useEffect, useState, useCallback } from "react";

export type FeedbackType = "success" | "heart" | "star" | "milestone" | "info";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  duration?: number;
}

// Global feedback queue
let feedbackQueue: FeedbackItem[] = [];
let listeners: Set<(items: FeedbackItem[]) => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener([...feedbackQueue]));
}

export function showFeedback(type: FeedbackType, message: string, duration = 2600) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item: FeedbackItem = { id, type, message, duration };
  feedbackQueue.push(item);
  notifyListeners();

  // Auto remove after duration
  setTimeout(() => {
    removeFeedback(id);
  }, duration);
}

export function removeFeedback(id: string) {
  feedbackQueue = feedbackQueue.filter((item) => item.id !== id);
  notifyListeners();
}

function useFeedbackQueue() {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    const listener = (newItems: FeedbackItem[]) => setItems(newItems);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return items;
}

// Confetti particle component
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const left = `${10 + Math.random() * 80}%`;
  const animationDuration = `${0.8 + Math.random() * 0.6}s`;

  return (
    <div
      className="confetti-particle"
      style={{
        left,
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        animationDuration,
      }}
    />
  );
}

// Sparkle component for milestone
function SparkleBurst() {
  const sparkles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 45) * (Math.PI / 180),
    distance: 30 + Math.random() * 20,
    delay: Math.random() * 0.2,
  }));

  return (
    <div className="sparkle-burst" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="sparkle"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "4px",
            height: "4px",
            background: "var(--gold)",
            borderRadius: "50%",
            boxShadow: "0 0 8px var(--gold)",
            animation: `sparkleBurst 0.6s ease-out ${s.delay}s forwards`,
            transform: `translate(-50%, -50%)`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// Individual feedback toast
function FeedbackToast({
  item,
  onRemove,
}: {
  item: FeedbackItem;
  onRemove: (id: string) => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => onRemove(item.id), 300);
  }, [item.id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRemove();
    }, (item.duration || 2600) - 300);
    return () => clearTimeout(timer);
  }, [item.duration, handleRemove]);

  const getIcon = () => {
    switch (item.type) {
      case "success":
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="animate-success">
            <circle cx="12" cy="12" r="10" stroke="#03fcbe" strokeWidth="2" fill="none" />
            <path
              d="M8 12l3 3 5-6"
              stroke="#03fcbe"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 0,
                animation: "checkmarkDraw 0.4s ease-out forwards",
              }}
            />
          </svg>
        );
      case "heart":
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff4757" className="animate-heart">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        );
      case "star":
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffc107" className="animate-star">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      case "milestone":
        return (
          <div style={{ position: "relative" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#03fcbe" className="milestone-badge">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <SparkleBurst />
          </div>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#9da7bf">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M12 7v6M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
    }
  };

  const getColors = () => {
    switch (item.type) {
      case "success":
        return { border: "rgba(3, 252, 190, 0.3)", bg: "rgba(3, 252, 190, 0.08)" };
      case "heart":
        return { border: "rgba(255, 71, 87, 0.3)", bg: "rgba(255, 71, 87, 0.08)" };
      case "star":
        return { border: "rgba(255, 193, 7, 0.3)", bg: "rgba(255, 193, 7, 0.08)" };
      case "milestone":
        return { border: "rgba(158, 135, 255, 0.4)", bg: "rgba(158, 135, 255, 0.12)" };
      default:
        return { border: "rgba(255, 255, 255, 0.1)", bg: "rgba(255, 255, 255, 0.04)" };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`feedback-toast ${isLeaving ? "is-leaving" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 18px",
        borderRadius: "14px",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        minWidth: "280px",
        maxWidth: "400px",
      }}
    >
      {getIcon()}
      <p
        className="copy"
        style={{
          margin: 0,
          fontSize: "0.95rem",
          fontWeight: 500,
          color: "var(--text)",
          lineHeight: 1.4,
        }}
      >
        {item.message}
      </p>
      {item.type === "milestone" && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
          {Array.from({ length: 6 }, (_, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 100}
              color={["#03fcbe", "#9e87ff", "#ff4757", "#ffc107"][i % 4]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main feedback container
export function ActionFeedbackContainer() {
  const items = useFeedbackQueue();

  if (items.length === 0) return null;

  return (
    <div
      className="action-feedback-container"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <div key={item.id} style={{ pointerEvents: "auto" }}>
          <FeedbackToast item={item} onRemove={removeFeedback} />
        </div>
      ))}
    </div>
  );
}

// Hook for triggering feedback
export function useActionFeedback() {
  return {
    showSuccess: (message: string) => showFeedback("success", message),
    showHeart: (message: string) => showFeedback("heart", message),
    showStar: (message: string) => showFeedback("star", message),
    showMilestone: (message: string) => showFeedback("milestone", message),
    showInfo: (message: string) => showFeedback("info", message),
  };
}
