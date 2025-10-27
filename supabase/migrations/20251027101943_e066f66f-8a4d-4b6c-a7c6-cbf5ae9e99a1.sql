-- Create products table for HogShop
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view products (public store)
CREATE POLICY "Anyone can view products"
  ON public.products
  FOR SELECT
  USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products for demo
INSERT INTO public.products (title, description, price, image_url, stock, category) VALUES
  ('Premium Wireless Headphones', 'High-fidelity audio with active noise cancellation. Perfect for music lovers and professionals.', 299.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 45, 'Electronics'),
  ('Minimalist Watch', 'Elegant timepiece with sapphire crystal and Italian leather strap. Timeless design meets modern craftsmanship.', 449.99, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', 28, 'Accessories'),
  ('Leather Laptop Bag', 'Handcrafted full-grain leather bag with padded laptop compartment. Ages beautifully with use.', 189.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 52, 'Accessories'),
  ('Smart Home Speaker', 'Voice-controlled speaker with premium sound and smart home integration.', 199.99, 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800&q=80', 67, 'Electronics'),
  ('Designer Sunglasses', 'UV400 protection with acetate frames. Contemporary style with vintage inspiration.', 229.99, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', 34, 'Accessories'),
  ('Wireless Charging Pad', 'Fast wireless charging for all Qi-enabled devices. Sleek aluminum design.', 59.99, 'https://images.unsplash.com/photo-1591290619762-5a3c44f7f93e?w=800&q=80', 89, 'Electronics');