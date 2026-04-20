/**
 * Random Color Palette System for Media Details
 * Generates beautiful, harmonious color schemes for each media item
 */

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  gradient: string;
  name: string;
}

export interface PaletteTheme {
  name: string;
  colors: ColorPalette;
}

// Premium color palettes inspired by modern design systems
const colorPalettes: PaletteTheme[] = [
  {
    name: "Sunset Boulevard",
    colors: {
      primary: "#FF6B6B",
      secondary: "#4ECDC4",
      accent: "#45B7D1",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      surface: "rgba(255, 107, 107, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)",
      name: "Sunset Boulevard"
    }
  },
  {
    name: "Midnight Oasis",
    colors: {
      primary: "#667EEA",
      secondary: "#764BA2",
      accent: "#F093FB",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      surface: "rgba(102, 126, 234, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      name: "Midnight Oasis"
    }
  },
  {
    name: "Arctic Aurora",
    colors: {
      primary: "#00D9FF",
      secondary: "#72FF72",
      accent: "#FFD700",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      surface: "rgba(0, 217, 255, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #00D9FF 0%, #72FF72 100%)",
      name: "Arctic Aurora"
    }
  },
  {
    name: "Cherry Blossom",
    colors: {
      primary: "#FFB6C1",
      secondary: "#FF69B4",
      accent: "#FF1493",
      background: "linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%)",
      surface: "rgba(255, 182, 193, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%)",
      name: "Cherry Blossom"
    }
  },
  {
    name: "Ocean Depths",
    colors: {
      primary: "#006994",
      secondary: "#00A8CC",
      accent: "#00CED1",
      background: "linear-gradient(135deg, #006994 0%, #00A8CC 100%)",
      surface: "rgba(0, 105, 148, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #006994 0%, #00A8CC 100%)",
      name: "Ocean Depths"
    }
  },
  {
    name: "Royal Purple",
    colors: {
      primary: "#6B46C1",
      secondary: "#9333EA",
      accent: "#A855F7",
      background: "linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)",
      surface: "rgba(107, 70, 193, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)",
      name: "Royal Purple"
    }
  },
  {
    name: "Forest Green",
    colors: {
      primary: "#10B981",
      secondary: "#059669",
      accent: "#34D399",
      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      surface: "rgba(16, 185, 129, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      name: "Forest Green"
    }
  },
  {
    name: "Golden Hour",
    colors: {
      primary: "#F59E0B",
      secondary: "#D97706",
      accent: "#FCD34D",
      background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      surface: "rgba(245, 158, 11, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      name: "Golden Hour"
    }
  },
  {
    name: "Cosmic Nebula",
    colors: {
      primary: "#8B5CF6",
      secondary: "#7C3AED",
      accent: "#A78BFA",
      background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      surface: "rgba(139, 92, 246, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      name: "Cosmic Nebula"
    }
  },
  {
    name: "Coral Reef",
    colors: {
      primary: "#FF6B6B",
      secondary: "#FF8E53",
      accent: "#FFA07A",
      background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
      surface: "rgba(255, 107, 107, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
      name: "Coral Reef"
    }
  },
  {
    name: "Northern Lights",
    colors: {
      primary: "#00FF88",
      secondary: "#00D4FF",
      accent: "#FF00FF",
      background: "linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)",
      surface: "rgba(0, 255, 136, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)",
      name: "Northern Lights"
    }
  },
  {
    name: "Volcanic Ash",
    colors: {
      primary: "#6B7280",
      secondary: "#4B5563",
      accent: "#9CA3AF",
      background: "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
      surface: "rgba(107, 114, 128, 0.1)",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.7)",
      gradient: "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
      name: "Volcanic Ash"
    }
  }
];

/**
 * Generate a deterministic random palette based on a seed (like media ID or title)
 */
export function generatePalette(seed: string): ColorPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colorPalettes.length;
  return colorPalettes[index].colors;
}

/**
 * Get a random palette (truly random for variety)
 */
export function getRandomPalette(): ColorPalette {
  const index = Math.floor(Math.random() * colorPalettes.length);
  return colorPalettes[index].colors;
}

/**
 * Get all available palette names
 */
export function getPaletteNames(): string[] {
  return colorPalettes.map(p => p.name);
}

/**
 * Convert palette to CSS custom properties
 */
export function paletteToCSSVariables(palette: ColorPalette): string {
  return `
    --palette-primary: ${palette.primary};
    --palette-secondary: ${palette.secondary};
    --palette-accent: ${palette.accent};
    --palette-background: ${palette.background};
    --palette-surface: ${palette.surface};
    --palette-text: ${palette.text};
    --palette-muted: ${palette.muted};
    --palette-gradient: ${palette.gradient};
  `;
}
