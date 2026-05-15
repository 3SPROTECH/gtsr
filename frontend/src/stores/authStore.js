import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set, get) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,

    setSession: ({ accessToken, refreshToken, user }) =>
      set({ accessToken, refreshToken, user, isAuthenticated: !!accessToken }),

    setAccessToken: (accessToken) => set({ accessToken }),

    setUser: (user) => set({ user }),

    logout: () => set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),

    hasRole: (...roles) => roles.includes(get().user?.role),
  }),
  { name: 'gtsr-auth' },
));
