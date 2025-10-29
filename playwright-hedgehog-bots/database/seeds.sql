-- Seed UTM campaigns
INSERT OR IGNORE INTO utm_campaigns (name, utm_source, utm_medium, utm_campaign, utm_content, target_persona, expected_lift_percent, active) VALUES
  ('Spring Comeback 2025', 'email', 'reactivation', 'spring_comeback_2025', '20_percent_off', 'ENGAGED_SHOPPER', 15.0, 1),
  ('Summer Win-Back 2025', 'email', 'reactivation', 'summer_deals_2025', 'free_shipping', 'CASUAL_BROWSER', 10.0, 1),
  ('VIP Exclusive 2025', 'email', 'reactivation', 'vip_exclusive_2025', 'premium_gifts', 'READY_BUYER', 25.0, 1),
  ('Fall Comeback 2025', 'email', 'reactivation', 'fall_comeback_2025', '15_percent_off', 'ENGAGED_SHOPPER', 12.0, 1),
  ('Facebook Summer Campaign', 'facebook', 'paid', 'summer_social_2025', 'carousel_ad', 'CASUAL_BROWSER', 8.0, 1),
  ('Google Brand Campaign', 'google', 'cpc', 'brand_search_2025', 'hedgehog_shop', 'READY_BUYER', 20.0, 1);
