import api from './client'

export interface RegisterData {
  email: string
  password: string
  full_name?: string
  organization_name?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  organization_name?: string
  tier?: 'free' | 'pro' | 'enterprise'
  tier_expires_at?: string | null
  project_limit?: number
  project_count?: number
  features?: {
    projects: number
    cbam_export: boolean
    brsr_export: boolean
    scenario_compare: boolean
    ai_advisor: boolean
    verification: boolean
  }
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data
  },

  logout: async () => {
    localStorage.removeItem('access_token')
  },
}
