import { create } from "zustand";
import { api } from "../services/api";
import { User } from "../types/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  appleLogin: (identityToken: string, fullName?: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  upgradeAccount: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: user !== null }),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true });
    } catch {
      // No valid session. On a truly fresh install (no token at all) we silently
      // create a guest account so the user can start without a signup wall.
      // If a token existed but is dead, treat as logged-out (returning user).
      try {
        const hadSession = await api.hasStoredSession();
        if (!hadSession) {
          const { user } = await api.createGuest();
          set({ user, isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false });
        }
      } catch {
        set({ user: null, isAuthenticated: false });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { user } = await api.login(email, password);
    set({ user, isAuthenticated: true });
  },

  register: async (email, password, fullName) => {
    const { user } = await api.register(email, password, fullName);
    set({ user, isAuthenticated: true });
  },

  appleLogin: async (identityToken, fullName) => {
    const { user } = await api.loginWithApple(identityToken, fullName);
    set({ user, isAuthenticated: true });
  },

  googleLogin: async (idToken) => {
    const { user } = await api.loginWithGoogle(idToken);
    set({ user, isAuthenticated: true });
  },

  upgradeAccount: async (email, password, fullName) => {
    const user = await api.upgradeAccount(email, password, fullName);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    const refreshToken = await api.getRefreshToken();
    if (refreshToken) {
      await api.logout(refreshToken).catch(() => {});
    }
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },
}));
