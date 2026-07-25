"use client";

import { createContext, useContext, useReducer, useEffect, useCallback, useState } from "react";

export interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  color: string;
  size: string;
  qty: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; index: number }
  | { type: "UPDATE_QTY"; index: number; qty: number }
  | { type: "LOAD"; items: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.findIndex(
        (i) => i.id === action.item.id && i.color === action.item.color && i.size === action.item.size
      );
      if (existing >= 0) {
        const items = [...state.items];
        items[existing] = { ...items[existing], qty: items[existing].qty + action.item.qty };
        return { items };
      }
      return { items: [...state.items, action.item] };
    }
    case "REMOVE":
      return { items: state.items.filter((_, i) => i !== action.index) };
    case "UPDATE_QTY": {
      if (action.qty <= 0) {
        return { items: state.items.filter((_, i) => i !== action.index) };
      }
      const items = [...state.items];
      items[action.index] = { ...items[action.index], qty: action.qty };
      return { items };
    }
    case "LOAD":
      return { items: action.items };
    default:
      return state;
  }
}

const CartContext = createContext<{
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQty: (index: number, qty: number) => void;
  totalItems: number;
  subtotal: number;
} | null>(null);

const STORAGE_KEY = "samaqu-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "LOAD", items: JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    }
  }, [state.items, loaded]);

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD", item });
  }, []);

  const removeItem = useCallback((index: number) => {
    dispatch({ type: "REMOVE", index });
  }, []);

  const updateQty = useCallback((index: number, qty: number) => {
    dispatch({ type: "UPDATE_QTY", index, qty });
  }, []);

  const totalItems = state.items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items: state.items, addItem, removeItem, updateQty, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
