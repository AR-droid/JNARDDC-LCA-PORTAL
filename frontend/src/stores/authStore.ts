import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, User } from '@/api/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string, orgName?: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login({ email, password })
          localStorage.setItem('access_token', response.access_token)
          
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Login failed'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      register: async (email: string, password: string, fullName?: string, orgName?: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.register({
            email,
            password,
            full_name: fullName,
            organization_name: orgName,
          })
          
          localStorage.setItem('access_token', response.access_token)
          
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Registration failed'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      logout: () => {
        authApi.logout()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      checkAuth: async () => {
        const token = localStorage.getItem('access_token')
        if (!token) {
          set({ isAuthenticated: false, user: null })
          return
        }

        try {
          const user = await authApi.getCurrentUser()
          set({
            user,
            token,
            isAuthenticated: true,
          })
        } catch (error) {
          localStorage.removeItem('access_token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
