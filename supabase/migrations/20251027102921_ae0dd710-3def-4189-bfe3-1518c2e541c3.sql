-- Add subscription fields to products table
ALTER TABLE public.products 
ADD COLUMN is_subscription BOOLEAN DEFAULT false,
ADD COLUMN subscription_interval TEXT,
ADD COLUMN subscription_interval_count INTEGER DEFAULT 1;

-- Update products with hedgehog/PostHog themed items
DELETE FROM public.products;

INSERT INTO public.products (title, description, price, image_url, stock, category, is_subscription, subscription_interval, subscription_interval_count) VALUES
  ('Hedgehog Plushie', 'Adorable PostHog mascot plushie. Soft, cuddly, and perfect for your desk. Limited edition collectible.', 29.99, 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80', 150, 'Merchandise', false, null, null),
  ('PostHog Pro Analytics', 'Complete product analytics platform. Track events, analyze user behavior, and optimize your product.', 49.99, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', 999, 'Subscription', true, 'month', 1),
  ('Hedgehog Hoodie', 'Premium cotton hoodie with embroidered PostHog logo. Comfortable and stylish for developers.', 59.99, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', 85, 'Apparel', false, null, null),
  ('Feature Flags Enterprise', 'Advanced feature flag management with targeting, experiments, and rollouts. Scale with confidence.', 99.99, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', 999, 'Subscription', true, 'month', 1),
  ('Hedgehog Sticker Pack', 'Set of 12 vinyl stickers featuring the PostHog hedgehog in various poses. Waterproof and durable.', 12.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 500, 'Merchandise', false, null, null),
  ('PostHog Team Plan', 'Collaborative analytics for growing teams. Unlimited events, session recordings, and feature flags.', 149.99, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', 999, 'Subscription', true, 'month', 1),
  ('Hedgehog Mug', 'Ceramic coffee mug with heat-reactive PostHog design. Watch the hedgehog appear as your coffee heats up.', 19.99, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80', 200, 'Merchandise', false, null, null),
  ('Session Replay Pro', 'Watch user sessions, debug issues, and understand behavior. Includes heatmaps and console logs.', 79.99, 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80', 999, 'Subscription', true, 'month', 1),
  ('Hedgehog Laptop Sticker', 'Premium vinyl laptop sticker. Large PostHog logo that makes a statement. 6" diameter.', 8.99, 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80', 750, 'Merchandise', false, null, null),
  ('PostHog Enterprise Annual', 'Full-featured analytics suite with dedicated support and custom integrations. Best value.', 1199.99, 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80', 999, 'Subscription', true, 'year', 1);