/**
 * Token Manager Utility
 * Handles JWT token operations
 */

const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

export const tokenManager = {
  /**
   * Get access token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  /**
   * Set access token
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  /**
   * Remove access token
   */
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  },

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  /**
   * Set refresh token
   */
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  },

  /**
   * Remove refresh token
   */
  removeRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  /**
   * Get stored user
   */
  getUser(): any | null {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  /**
   * Set user
   */
  setUser(user: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  /**
   * Remove user
   */
  removeUser(): void {
    localStorage.removeItem(USER_KEY)
  },

  /**
   * Clear all auth data
   */
  clearAll(): void {
    this.removeToken()
    this.removeRefreshToken()
    this.removeUser()
  },

  /**
   * Check if token exists
   */
  hasToken(): boolean {
    return !!this.getToken()
  },

  /**
   * Decode JWT token (without verification)
   * Returns payload or null if invalid
   */
  decodeToken(token: string): any | null {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      return null
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token)
    if (!payload || !payload.exp) return true
    
    const expirationTime = payload.exp * 1000 // Convert to milliseconds
    return Date.now() >= expirationTime
  },

  /**
   * Get token expiration date
   */
  getTokenExpiration(token: string): Date | null {
    const payload = this.decodeToken(token)
    if (!payload || !payload.exp) return null
    
    return new Date(payload.exp * 1000)
  },
}
