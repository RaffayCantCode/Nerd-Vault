"use client";

import { useState, useEffect } from "react";
import { completeOnboarding } from "@/app/actions/user";

type Step = {
  title: string;
  description: string;
  icon: string;
};

const STEPS: Step[] = [
  {
    title: "Welcome to NerdVault!",
    description: "Your ultimate platform for tracking, discovering, and sharing everything you love.",
    icon: "✨",
  },
  {
    title: "Browse & Discover",
    description: "Go to Browse to search and add movies, TV shows, anime, and games to your vault.",
    icon: "🔍",
  },
  {
    title: "Your Profile",
    description: "Visit your Profile to see your saved media, watched history, and custom folders.",
    icon: "👤",
  },
  {
    title: "Home Feed",
    description: "Use Home to discover new content and see what's trending in your universe.",
    icon: "🏠",
  },
];

export function OnboardingTour({ hasSeenOnboarding }: { hasSeenOnboarding: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenOnboarding]);

  if (!isVisible || hasSeenOnboarding) return null;

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleSkip();
    }
  };

  const handleSkip = async () => {
    setIsVisible(false);
    await completeOnboarding();
  };

  const step = STEPS[currentStep];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card glass">
        <div className="onboarding-icon">{step.icon}</div>
        <h2 className="onboarding-title">{step.title}</h2>
        <p className="onboarding-description">{step.description}</p>
        
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`onboarding-dot ${i === currentStep ? "is-active" : ""}`} 
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button onClick={handleSkip} className="onboarding-skip">
            Skip
          </button>
          <button onClick={handleNext} className="onboarding-next button button-primary">
            {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .onboarding-card {
          width: 100%;
          max-width: 400px;
          padding: 40px 32px;
          border-radius: 32px;
          text-align: center;
          display: grid;
          gap: 20px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .onboarding-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .onboarding-title {
          font-size: 24px;
          font-weight: 800;
          color: white;
          margin: 0;
        }

        .onboarding-description {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        .onboarding-progress {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin: 10px 0;
        }

        .onboarding-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .onboarding-dot.is-active {
          background: #69C5AC;
          transform: scale(1.2);
          box-shadow: 0 0 10px rgba(105, 197, 172, 0.5);
        }

        .onboarding-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .onboarding-skip {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
          cursor: pointer;
          padding: 10px;
          transition: color 0.2s ease;
        }

        .onboarding-skip:hover {
          color: white;
        }

        .onboarding-next {
          min-width: 120px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
