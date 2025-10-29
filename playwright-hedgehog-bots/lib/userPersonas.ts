export interface PersonaBehavior {
  weight: number;
  sessionDuration: [number, number]; // [min, max] seconds
  pagesPerSession: [number, number];
  purchaseProbability: number;
  cartAbandonRate: number;
  newsletterSignupRate: number;
  exitSurveyResponseRate: number;
  npsResponseRate: number;
  actions: PersonaAction[];
}

export interface PersonaAction {
  action: string;
  probability: number;
  count?: [number, number];
}

export const USER_PERSONAS: Record<string, PersonaBehavior> = {
  CASUAL_BROWSER: {
    weight: 0.35,
    sessionDuration: [45, 240],
    pagesPerSession: [2, 5],
    purchaseProbability: 0.02,
    cartAbandonRate: 0.95,
    newsletterSignupRate: 0.08,
    exitSurveyResponseRate: 0.25,
    npsResponseRate: 0.10,
    actions: [
      { action: 'browse_homepage', probability: 1.0 },
      { action: 'view_products', probability: 0.8, count: [2, 4] },
      { action: 'view_faq', probability: 0.3 },
      { action: 'view_about', probability: 0.2 },
      { action: 'add_to_cart', probability: 0.15, count: [1, 1] },
    ]
  },
  
  ENGAGED_SHOPPER: {
    weight: 0.25,
    sessionDuration: [180, 600],
    pagesPerSession: [5, 12],
    purchaseProbability: 0.25,
    cartAbandonRate: 0.50,
    newsletterSignupRate: 0.35,
    exitSurveyResponseRate: 0.60,
    npsResponseRate: 0.40,
    actions: [
      { action: 'browse_homepage', probability: 1.0 },
      { action: 'view_products', probability: 1.0, count: [3, 6] },
      { action: 'add_to_cart', probability: 0.70, count: [1, 3] },
      { action: 'view_cart', probability: 0.80 },
      { action: 'proceed_to_checkout', probability: 0.40 },
      { action: 'view_faq', probability: 0.40 },
    ]
  },
  
  READY_BUYER: {
    weight: 0.15,
    sessionDuration: [120, 480],
    pagesPerSession: [3, 8],
    purchaseProbability: 0.80,
    cartAbandonRate: 0.10,
    newsletterSignupRate: 0.60,
    exitSurveyResponseRate: 0.30,
    npsResponseRate: 0.70,
    actions: [
      { action: 'browse_homepage', probability: 1.0 },
      { action: 'view_products', probability: 1.0, count: [1, 3] },
      { action: 'add_to_cart', probability: 0.95, count: [1, 2] },
      { action: 'proceed_to_checkout', probability: 0.85 },
      { action: 'complete_purchase', probability: 0.80 },
    ]
  },
  
  NEWSLETTER_SUBSCRIBER: {
    weight: 0.12,
    sessionDuration: [20, 90],
    pagesPerSession: [1, 3],
    purchaseProbability: 0.00,
    cartAbandonRate: 0.00,
    newsletterSignupRate: 1.0,
    exitSurveyResponseRate: 0.10,
    npsResponseRate: 0.05,
    actions: [
      { action: 'browse_homepage', probability: 1.0 },
      { action: 'signup_newsletter', probability: 1.0 },
      { action: 'view_products', probability: 0.20, count: [1, 2] },
    ]
  },
  
  CART_ABANDONER: {
    weight: 0.08,
    sessionDuration: [90, 300],
    pagesPerSession: [3, 7],
    purchaseProbability: 0.00,
    cartAbandonRate: 1.0,
    newsletterSignupRate: 0.15,
    exitSurveyResponseRate: 0.80,
    npsResponseRate: 0.00,
    actions: [
      { action: 'browse_homepage', probability: 1.0 },
      { action: 'view_products', probability: 1.0, count: [2, 4] },
      { action: 'add_to_cart', probability: 1.0, count: [1, 3] },
      { action: 'view_cart', probability: 1.0 },
      { action: 'start_checkout', probability: 1.0 },
      { action: 'abandon_checkout', probability: 1.0 },
      { action: 'respond_exit_survey', probability: 0.80 },
    ]
  },
  
  GIFT_FUNNEL_TESTER: {
    weight: 0.05,
    sessionDuration: [30, 120],
    pagesPerSession: [2, 4],
    purchaseProbability: 0.00,
    cartAbandonRate: 0.00,
    newsletterSignupRate: 0.15,
    exitSurveyResponseRate: 0.05,
    npsResponseRate: 0.00,
    actions: [
      { action: 'browse_homepage', probability: 1.0 },
      { action: 'click_gift_cta', probability: 1.0 },
      { action: 'land_on_404', probability: 1.0 },
      { action: 'signup_newsletter', probability: 0.15 },
      { action: 'view_products', probability: 0.30, count: [1, 2] },
    ]
  }
};

export const getRandomPersona = (): string => {
  const personas = Object.entries(USER_PERSONAS);
  const totalWeight = personas.reduce((sum, [, behavior]) => sum + behavior.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [persona, behavior] of personas) {
    if (random < behavior.weight) {
      return persona;
    }
    random -= behavior.weight;
  }
  
  return 'CASUAL_BROWSER';
};

export const getPersonaBehavior = (persona: string): PersonaBehavior => {
  return USER_PERSONAS[persona] || USER_PERSONAS.CASUAL_BROWSER;
};
