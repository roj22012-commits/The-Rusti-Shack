"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SHIPPING_FEE } from "./constants";

export { SHIPPING_FEE };

export type CartItem = {
  sku: string; // exact variant SKU (size + color), not the parent/family SKU
  parentSku: string;
  name: string;
  image: string | null;
  unitPrice: number;
  size: string | null;
  color: string | null;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "rusti-shack-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage after mount, deliberately not in
    // the initial useState: reading localStorage during the lazy initializer
    // would run on the client's first render pass and mismatch the SSR'd
    // (always-empty) markup, since Next renders this component on the
    // server first. This is a sync-from-external-system effect, not a
    // derived-state one.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore malformed local storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.sku === item.sku);
      if (existing) {
        return prev.map((i) =>
          i.sku === item.sku ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const removeItem = useCallback((sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.sku !== sku)
        : prev.map((i) => (i.sku === sku ? { ...i, qty } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((n, i) => n + i.qty * i.unitPrice, 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    setQty,
    clear,
    itemCount,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
