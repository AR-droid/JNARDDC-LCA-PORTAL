import api from './client'

export interface FaceAuthStatus {
  face_auth_enabled: boolean
  face_registered: boolean
  registered_at: string | null
}

export interface FaceRegisterResponse {
  message: string
  face_auth_enabled: boolean
  registered_at: string
}

export interface FaceVerifyResponse {
  access_token: string
  token_type: string
  auth_method: string
  confidence: number
  user: {
    id: string
    email: string
    full_name: string | null
    organization_name: string | null
    tier: 'free' | 'pro' | 'enterprise'
    tier_expires_at: string | null
    project_limit: number
    project_count: number
    features: {
      projects: number
      cbam_export: boolean
      brsr_export: boolean
      scenario_compare: boolean
      ai_advisor: boolean
      verification: boolean
    }
    face_auth_enabled: boolean
  }
}

export interface FaceQualityResponse {
  quality_ok: boolean
  issues?: string[]
  face_detected?: boolean
  detail?: string
  details?: {
    headpose: {
      pitch_angle: number
      yaw_angle: number
      roll_angle: number
    }
    blur_score: number
    quality_score: number
  }
}

export const faceAuthApi = {
  /**
   * Get face authentication status for current user
   */
  getStatus: async (): Promise<FaceAuthStatus> => {
    const response = await api.get('/auth/face/status')
    return response.data
  },

  /**
   * Register face for biometric authentication
   */
  register: async (imageBase64: string): Promise<FaceRegisterResponse> => {
    const response = await api.post('/auth/face/register', {
      image: imageBase64
    })
    return response.data
  },

  /**
   * Verify face for login (returns JWT if successful)
   */
  verify: async (email: string, imageBase64: string): Promise<FaceVerifyResponse> => {
    const response = await api.post('/auth/face/verify', {
      email,
      image: imageBase64
    })
    return response.data
  },

  /**
   * Remove face authentication
   */
  remove: async (): Promise<{ message: string; face_auth_enabled: boolean }> => {
    const response = await api.delete('/auth/face')
    return response.data
  },

  /**
   * Check face quality before registration
   */
  checkQuality: async (imageBase64: string): Promise<FaceQualityResponse> => {
    const response = await api.post('/auth/face/check-quality', {
      image: imageBase64
    })
    return response.data
  }
}
