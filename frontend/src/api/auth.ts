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
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    console.log('🔐 Register:', data.email)
    const response = await api.post('/auth/register', data)
    console.log('✅ Registered:', response.data)
    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    console.log('🔐 Login:', data.email)
    const response = await api.post('/auth/login', data)
    console.log('✅ Logged in:', response.data)
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
