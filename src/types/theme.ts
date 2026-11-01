export type ThemeId = 'classic' | 'swiss' | 'nordic' | 'cyber' | 'artisan';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  palette: {
    primary: string;
    bg: string;
    accent: string;
    card: string;
    text: string;
  };
  styleNote: string;
  fontType: 'Serif Classic' | 'Geometric Sans' | 'Neo-Grotesque' | 'Display Serif';
  isDark?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'classic',
    name: 'Classic Studio',
    tagline: 'Refined Oxford Navy & Warm Parchment',
    description: 'Traditional stationery & prestigious legal press aesthetic with gold foil accents and timeless serif typography.',
    palette: {
      primary: '#16284F',
      bg: '#FAF7F2',
      accent: '#B48234',
      card: '#FFFFFF',
      text: '#16284F',
    },
    styleNote: 'Oxford Blue • Gold Accents • Warm Parchment • Serif Headlines',
    fontType: 'Serif Classic',
  },
  {
    id: 'swiss',
    name: 'Swiss Studio',
    tagline: 'Architectural Minimalist & Electric Blue',
    description: 'Contemporary design atelier with ultra-crisp monochrome grid, vibrant cobalt accents, and clean modernist precision.',
    palette: {
      primary: '#0F172A',
      bg: '#F8FAFC',
      accent: '#0052FF',
      card: '#FFFFFF',
      text: '#0F172A',
    },
    styleNote: 'Graphite Black • International Cobalt • Crisp White • Neo-Grotesque',
    fontType: 'Geometric Sans',
  },
  {
    id: 'nordic',
    name: 'Nordic Sage',
    tagline: 'Organic Linen & Deep Forest Pine',
    description: 'Calming botanical print shop inspired by sustainable recycled cotton paper, soothing sage mist, and warm kraft ochre.',
    palette: {
      primary: '#1C3B2B',
      bg: '#F4F7F4',
      accent: '#C27838',
      card: '#FFFFFF',
      text: '#142E20',
    },
    styleNote: 'Forest Spruce • Kraft Ochre • Pale Sage Linen • Eco Craft Feel',
    fontType: 'Display Serif',
  },
  {
    id: 'cyber',
    name: 'Cyber Midnight',
    tagline: 'Obsidian Dark Mode & Neon Amber Terminal',
    description: 'Futuristic 24/7 self-service automated print kiosk with deep midnight glass, high-contrast yellow laser neon, and glowing counter metrics.',
    palette: {
      primary: '#0284C7',
      bg: '#0B0F19',
      accent: '#F59E0B',
      card: '#131B2E',
      text: '#F1F5F9',
    },
    styleNote: 'Obsidian Slate • Tech Azure • Amber Glow • Modern Dark Kiosk',
    fontType: 'Geometric Sans',
    isDark: true,
  },
  {
    id: 'artisan',
    name: 'Artisan Amber',
    tagline: 'Warm Espresso & Honey Letterpress',
    description: 'Handcrafted bookbinder & vintage letterpress workshop with rich espresso tones, burnished honey leather, and warm vanilla pages.',
    palette: {
      primary: '#382417',
      bg: '#FAF6EE',
      accent: '#C4681E',
      card: '#FFFDF9',
      text: '#2E1B0E',
    },
    styleNote: 'Dark Espresso • Burnished Copper • Vanilla Paper • Tactile Craft',
    fontType: 'Serif Classic',
  },
];
