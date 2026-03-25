import React, { createContext, useContext, useState, ReactNode } from "react";
import { trackEvent } from "@/lib/posthog";

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  image_url: string;
  stock?: number;
  category?: string;
  quantity?: number;
  is_subscription: boolean;
  subscription_interval?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const newItems = existing 
        ? prev.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...prev, { ...product, quantity: 1 }];
      
      // Calculate totals AFTER adding item
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      trackEvent("add_to_cart", {
        product_id: product.id,
        product_name: product.title,
        price: product.price,
        quantity: 1,
        new_quantity: existing ? existing.quantity + 1 : 1,
        category: product.category,
        is_subscription: product.is_subscription,
        cart_total_items: totalItems,
        cart_total_value: totalValue,
        product_category: product.category,
      });
      
      // Track cart_updated event
      trackEvent("cart_updated", {
        cart_total_items: totalItems,
        cart_total_value: totalValue,
        action: "add",
        product_id: product.id,
      });
      
      return newItems;
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === productId);
      if (item) {
        trackEvent("remove_from_cart", {
          product_id: item.id,
          product_name: item.title,
          price: item.price,
          quantity: item.quantity,
          cart_value_removed: item.price * item.quantity,
        });
      }
      return prev.filter((item) => item.id !== productId);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) => {
      const item = prev.find((i) => i.id === productId);
      if (item && item.quantity !== quantity) {
        trackEvent("update_cart_quantity", {
          product_id: item.id,
          product_name: item.title,
          old_quantity: item.quantity,
          new_quantity: quantity,
          price: item.price,
        });
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => {
    const totalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    trackEvent("cart_cleared", {
      items_count: totalCount,
      cart_value: totalValue,
      items: items.map(item => ({ id: item.id, title: item.title, quantity: item.quantity })),
    });
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
