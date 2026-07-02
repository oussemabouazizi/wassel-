import { create } from 'zustand';
import type { Profile, CartItem, Product } from '@/types';

interface AppStore {
  user: Profile | null;
  setUser: (user: Profile | null) => void;

  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;

  selectedStoreId: string | null;
  setSelectedStoreId: (storeId: string | null) => void;

  language: 'ar' | 'fr' | 'en';
  setLanguage: (lang: 'ar' | 'fr' | 'en') => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),

  cart: [],
  addToCart: (product, quantity = 1) => {
    const { cart, selectedStoreId } = get();

    if (selectedStoreId && selectedStoreId !== product.store_id) {
      if (!confirm('Adding items from a different store will clear your current cart. Continue?')) {
        return;
      }
      set({ cart: [{ product, quantity, notes: '' }], selectedStoreId: product.store_id });
      return;
    }

    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      set({
        cart: cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
        selectedStoreId: product.store_id,
      });
    } else {
      set({
        cart: [...cart, { product, quantity, notes: '' }],
        selectedStoreId: product.store_id,
      });
    }
  },
  removeFromCart: (productId) => {
    const { cart } = get();
    const newCart = cart.filter((item) => item.product.id !== productId);
    set({
      cart: newCart,
      selectedStoreId: newCart.length === 0 ? null : get().selectedStoreId,
    });
  },
  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    });
  },
  clearCart: () => set({ cart: [], selectedStoreId: null }),
  getCartTotal: () => get().cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  getCartCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),

  selectedStoreId: null,
  setSelectedStoreId: (storeId) => set({ selectedStoreId: storeId }),

  language: 'en',
  setLanguage: (language) => set({ language }),

  theme: 'light',
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        localStorage.setItem('wassel-theme', newTheme);
      }
      return { theme: newTheme };
    }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
