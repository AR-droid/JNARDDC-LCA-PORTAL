import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Scan, Shield } from 'lucide-react'
import { FaceLogin } from '../components/face-auth'
import DigiLockerLogin from '../components/DigiLockerLogin'

type LoginMode = 'email' | 'face' | 'digilocker';

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, setAuth, isLoading, error } = useAuthStore()
  const [loginMode, setLoginMode] = useState<LoginMode>('email')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    try {
      await login(formData.email, formData.password)
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 animate-fade-in-down">
        {/* Face Login Mode */}
        {loginMode === 'face' ? (
          <FaceLogin 
            onSuccess={() => navigate('/dashboard')}
            onBack={() => setLoginMode('email')}
            initialEmail={formData.email}
          />
        ) : loginMode === 'digilocker' ? (
          <DigiLockerLogin
            onSuccess={async (digiUser, digiToken) => {
              try {
                // Convert DigiLocker auth to app auth via backend
                const response = await fetch('http://localhost:5000/api/v1/auth/digilocker-login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    digilocker_token: digiToken,
                    name: digiUser.name,
                    aadhaar_masked: digiUser.masked_aadhaar
                  })
                });
                
                const data = await response.json();
                
                if (data.access_token && data.user) {
                  // Set auth state and token
                  localStorage.setItem('access_token', data.access_token);
                  localStorage.setItem('digilocker_verified', 'true');
                  setAuth(data.user, data.access_token);
                  navigate('/dashboard');
                } else {
                  console.error('DigiLocker login failed:', data);
                }
              } catch (err) {
                console.error('Error during DigiLocker login:', err);
              }
            }}
            onBack={() => setLoginMode('email')}
          />
        ) : (
          <>
            {/* Logo inside card */}
            <div className="text-center mb-8">
              <img src="/images/logo.png" alt="JNARDDC" className="w-16 h-16 object-contain mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to JNARDDC LCA Portal</p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Face Login Button */}
        <button
          type="button"
          onClick={() => setLoginMode('face')}
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Scan className="w-5 h-5" />
          Sign in with Face
        </button>

        {/* DigiLocker Login Button */}
        <button
          type="button"
          onClick={() => setLoginMode('digilocker')}
          className="w-full mt-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium flex items-center justify-center gap-2 shadow-md"
        >
          <Shield className="w-5 h-5" />
          Sign in with DigiLocker
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
        
        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Home
          </Link>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
