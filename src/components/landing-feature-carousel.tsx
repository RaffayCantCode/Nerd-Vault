"use client";

import { useMemo, useRef, useState } from "react";

type FeatureCard = {
  title: string;
  body: string;
  kicker: string;
};

const signedOutCards: FeatureCard[] = [
  {
    kicker: "Discovery",
    title: "One vault for films, shows, anime, and games.",
    body: "Browse discovery when you want something fresh, then switch to profile mode once you are ready to keep what matters.",
  },
  {
    kicker: "Persistence",
    title: "Accounts keep your avatar, folders, and history saved.",
    body: "Signing in turns the vault from a temporary browse space into a personal library with profile identity and saved media actions.",
  },
  {
    kicker: "Social",
    title: "Friends, inbox, and recommendations sit in the same space.",
    body: "You can search people, build folders, and keep social activity close to your library instead of splitting it across different pages.",
  },
];

const signedInCards: FeatureCard[] = [
  {
    kicker: "Ready",
    title: "Your vault is live and your setup stays attached to this account.",
    body: "Profile image, folders, inbox, and logged media stay saved, so you can jump back into browsing without rebuilding anything.",
  },
  {
    kicker: "Continue",
    title: "Browse takes you straight back to discovery and saved picks.",
    body: "The landing card is now more of a checkpoint: it reminds you what the site does instead of repeating the same actions twice.",
  },
  {
    kicker: "Control",
    title: "You can sign out here, but everything remains ready for next time.",
    body: "When you return, the vault should feel immediate again instead of slowly reappearing piece by piece.",
  },
];

export function LandingFeatureCarousel({ isSignedIn }: { isSignedIn: boolean }) {
  const cards = useMemo(() => (isSignedIn ? signedInCards : signedOutCards), [isSignedIn]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  return (
    <div className="landing-carousel">
      <div
        className="landing-carousel-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartX.current;
          const endX = event.changedTouches[0]?.clientX ?? null;
          touchStartX.current = null;

          if (startX === null || endX === null) return;
          const delta = endX - startX;

          if (Math.abs(delta) < 42) return;

          if (delta < 0) {
            setActiveIndex((current) => (current + 1) % cards.length);
            return;
          }

          setActiveIndex((current) => (current - 1 + cards.length) % cards.length);
        }}
      >
        {cards.map((card) => (
          <article key={card.title} className="landing-carousel-card">
            <p className="eyebrow">{card.kicker}</p>
            <h3 className="headline">{card.title}</h3>
            <p className="copy">{card.body}</p>
          </article>
        ))}
      </div>

      <div className="landing-carousel-controls">
        <button
          type="button"
          className="button button-secondary landing-carousel-arrow"
          onClick={() => setActiveIndex((current) => (current - 1 + cards.length) % cards.length)}
        >
          Prev
        </button>
        <div className="landing-carousel-dots">
          {cards.map((card, index) => (
            <button
              key={card.title}
              type="button"
              className={`landing-carousel-dot ${activeIndex === index ? "is-active" : ""}`}
              aria-label={`Show card ${index + 1}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
        <button
          type="button"
          className="button button-secondary landing-carousel-arrow"
          onClick={() => setActiveIndex((current) => (current + 1) % cards.length)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
