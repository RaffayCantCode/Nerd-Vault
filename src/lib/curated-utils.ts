/**
 * A deterministic seed-based shuffle algorithm (Fisher-Yates styled with a sinus-based pseudo-random generator).
 * Ensures consistent order for a given seed across server and client.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  if (items.length <= 1) return items;
  const shuffled = [...items];
  let currentSeed = seed;

  const random = () => {
    // Deterministic pseudo-random number generator
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  return shuffled;
}
