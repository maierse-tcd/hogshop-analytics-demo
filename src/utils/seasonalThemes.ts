// Seasonal theme configuration
export type SeasonalTheme = 'halloween' | 'christmas' | 'easter' | 'summer' | null;

interface ThemeConfig {
  name: string;
  emoji: {
    primary: string;
    secondary: string;
    decorative: string[];
  };
  colors: {
    primary: string;
    secondary: string;
    tertiary?: string;
    dark: string;
  };
  badge: string;
  title: {
    line1: string;
    line2: string;
  };
  description: string;
  shopTitle: string;
  shopDescription: string;
  footer: {
    logo: string;
    description: string;
  };
}

export const themeConfigs: Record<Exclude<SeasonalTheme, null>, ThemeConfig> = {
  halloween: {
    name: 'Halloween',
    emoji: { primary: '🎃', secondary: '👻', decorative: ['👻', '🎃', '🕷️', '🕸️', '🦇'] },
    colors: {
      primary: 'hsl(var(--halloween-orange))',
      secondary: 'hsl(var(--halloween-purple))',
      dark: 'hsl(var(--halloween-dark))',
    },
    badge: '🎃 Spooky Supplies for your Hedgehog',
    title: { line1: 'Spooky Treats for', line2: 'Your Little Hedgie' },
    description: 'Frighteningly good treats and supplies for your spiky companion this Halloween season! 🦔👻',
    shopTitle: '🎃 Spooky Shop by Category 👻',
    shopDescription: 'Frighteningly good supplies for your hedgehog! 🦔',
    footer: {
      logo: '👻 HogShop 🎃',
      description: 'Your spooktacular source for premium hedgehog supplies! From frightfully good nutrition to haunted habitats, we provide everything your spiky companion needs! 🦔👻',
    },
  },
  christmas: {
    name: 'Christmas',
    emoji: { primary: '🎄', secondary: '🎅', decorative: ['🎄', '🎅', '❄️', '⛄', '🎁', '⭐'] },
    colors: {
      primary: 'hsl(var(--christmas-red))',
      secondary: 'hsl(var(--christmas-green))',
      tertiary: 'hsl(var(--christmas-gold))',
      dark: 'hsl(var(--christmas-dark))',
    },
    badge: '🎄 Festive Supplies for your Hedgehog',
    title: { line1: 'Merry Christmas to', line2: 'Your Little Hedgie' },
    description: 'Ho-ho-wholesome treats and cozy supplies for your spiky companion this festive season! 🦔🎅',
    shopTitle: '🎄 Festive Shop by Category 🎁',
    shopDescription: 'Magical supplies for your hedgehog! 🦔',
    footer: {
      logo: '🎄 HogShop 🎅',
      description: 'Your festive source for premium hedgehog supplies! From merry nutrition to cozy winter habitats, we provide everything your spiky companion needs! 🦔🎄',
    },
  },
  easter: {
    name: 'Easter',
    emoji: { primary: '🐰', secondary: '🥚', decorative: ['🐰', '🥚', '🌷', '🐣', '🌸', '🦔'] },
    colors: {
      primary: 'hsl(var(--easter-pink))',
      secondary: 'hsl(var(--easter-lavender))',
      tertiary: 'hsl(var(--easter-mint))',
      dark: 'hsl(var(--background))',
    },
    badge: '🐰 Spring Supplies for your Hedgehog',
    title: { line1: 'Happy Easter to', line2: 'Your Little Hedgie' },
    description: 'Egg-cellent treats and spring supplies for your spiky companion this Easter season! 🦔🐰',
    shopTitle: '🐰 Spring Shop by Category 🌷',
    shopDescription: 'Beautiful spring supplies for your hedgehog! 🦔',
    footer: {
      logo: '🐰 HogShop 🥚',
      description: 'Your spring source for premium hedgehog supplies! From fresh nutrition to blooming habitats, we provide everything your spiky companion needs! 🦔🌷',
    },
  },
  summer: {
    name: 'Summer',
    emoji: { primary: '☀️', secondary: '🌊', decorative: ['☀️', '🌊', '🏖️', '🌴', '🍉', '😎'] },
    colors: {
      primary: 'hsl(var(--summer-cyan))',
      secondary: 'hsl(var(--summer-coral))',
      tertiary: 'hsl(var(--summer-yellow))',
      dark: 'hsl(var(--summer-blue))',
    },
    badge: '☀️ Summer Supplies for your Hedgehog',
    title: { line1: 'Sunny Days for', line2: 'Your Little Hedgie' },
    description: 'Sun-sational treats and cool supplies for your spiky companion this summer season! 🦔☀️',
    shopTitle: '☀️ Summer Shop by Category 🌊',
    shopDescription: 'Cool summer supplies for your hedgehog! 🦔',
    footer: {
      logo: '☀️ HogShop 🌊',
      description: 'Your sunny source for premium hedgehog supplies! From refreshing nutrition to cool summer habitats, we provide everything your spiky companion needs! 🦔☀️',
    },
  },
};

export const getThemeConfig = (theme: SeasonalTheme): ThemeConfig | null => {
  return theme ? themeConfigs[theme] : null;
};
