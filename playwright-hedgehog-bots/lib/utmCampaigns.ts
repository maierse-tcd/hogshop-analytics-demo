export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface Campaign {
  name: string;
  utmParams: UTMParams;
  targetPersona: string;
  expectedLiftPercent: number;
}

export const REACTIVATION_CAMPAIGNS: Record<string, Campaign> = {
  SPRING_COMEBACK: {
    name: 'Spring Comeback 2025',
    utmParams: {
      utm_source: 'email',
      utm_medium: 'reactivation',
      utm_campaign: 'spring_comeback_2025',
      utm_content: '20_percent_off',
    },
    targetPersona: 'ENGAGED_SHOPPER',
    expectedLiftPercent: 15.0,
  },
  
  SUMMER_WINBACK: {
    name: 'Summer Win-Back 2025',
    utmParams: {
      utm_source: 'email',
      utm_medium: 'reactivation',
      utm_campaign: 'summer_deals_2025',
      utm_content: 'free_shipping',
    },
    targetPersona: 'CASUAL_BROWSER',
    expectedLiftPercent: 10.0,
  },
  
  VIP_EXCLUSIVE: {
    name: 'VIP Exclusive 2025',
    utmParams: {
      utm_source: 'email',
      utm_medium: 'reactivation',
      utm_campaign: 'vip_exclusive_2025',
      utm_content: 'premium_gifts',
    },
    targetPersona: 'READY_BUYER',
    expectedLiftPercent: 25.0,
  },
  
  FALL_COMEBACK: {
    name: 'Fall Comeback 2025',
    utmParams: {
      utm_source: 'email',
      utm_medium: 'reactivation',
      utm_campaign: 'fall_comeback_2025',
      utm_content: '15_percent_off',
    },
    targetPersona: 'ENGAGED_SHOPPER',
    expectedLiftPercent: 12.0,
  },
};

export const ACQUISITION_CAMPAIGNS: Record<string, Campaign> = {
  FACEBOOK_SUMMER: {
    name: 'Facebook Summer Campaign',
    utmParams: {
      utm_source: 'facebook',
      utm_medium: 'paid',
      utm_campaign: 'summer_social_2025',
      utm_content: 'carousel_ad',
    },
    targetPersona: 'CASUAL_BROWSER',
    expectedLiftPercent: 8.0,
  },
  
  GOOGLE_BRAND: {
    name: 'Google Brand Campaign',
    utmParams: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'brand_search_2025',
      utm_content: 'hedgehog_shop',
    },
    targetPersona: 'READY_BUYER',
    expectedLiftPercent: 20.0,
  },
};

export const buildURLWithUTM = (baseURL: string, utmParams: UTMParams): string => {
  const url = new URL(baseURL);
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

export const getReactivationCampaign = (userValue: number): Campaign => {
  if (userValue > 200) {
    return REACTIVATION_CAMPAIGNS.VIP_EXCLUSIVE;
  }
  
  const campaigns = [
    REACTIVATION_CAMPAIGNS.SPRING_COMEBACK,
    REACTIVATION_CAMPAIGNS.SUMMER_WINBACK,
    REACTIVATION_CAMPAIGNS.FALL_COMEBACK,
  ];
  
  return campaigns[Math.floor(Math.random() * campaigns.length)];
};
