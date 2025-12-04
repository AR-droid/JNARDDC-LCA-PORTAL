import { useState } from 'react'
import { Scan, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import FaceCamera from './FaceCamera'
import { faceAuthApi } from '../../api/faceAuth'
import { useAuthStore } from '../../stores/authStore'

interface FaceLoginProps {
  onSuccess: () => void
  onBack: () => void
  initialEmail?: string
}

export default function FaceLogin({ onSuccess, onBack, initialEmail = '' }: FaceLoginProps) {
  const [email, setEmail] = useState(initialEmail)
  const [showCamera, setShowCamera] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  
  const { setAuth } = useAuthStore()

  const handleStartVerification = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setError(null)
    setShowCamera(true)
  }

  const handleCapture = async (imageBase64: string) => {
    setIsVerifying(true)
    setError(null)
    setConfidence(null)

    try {
      const response = await faceAuthApi.verify(email, imageBase64)
      
      // Store auth data
      localStorage.setItem('access_token', response.access_token)
      
      // Convert null values to undefined to match User type
      const user = {
        ...response.user,
        full_name: response.user.full_name ?? undefined,
        organization_name: response.user.organization_name ?? undefined,
        tier_expires_at: response.user.tier_expires_at ?? undefined,
      }
      setAuth(user, response.access_token)
      
      setConfidence(response.confidence)
      
      // Small delay to show success before redirect
      setTimeout(() => {
        onSuccess()
      }, 500)
    } catch (err: any) {
      const errorData = err.response?.data
      setError(errorData?.detail || 'Face verification failed. Please try again.')
      if (errorData?.confidence) {
        setConfidence(errorData.confidence)
      }
      setShowCamera(false)
    } finally {
      setIsVerifying(false)
    }
  }

  if (showCamera) {
    return (
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setShowCamera(false)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <FaceCamera
          mode="verify"
          onCapture={handleCapture}
          onCancel={() => setShowCamera(false)}
          showQualityCheck={false}
        />

        {isVerifying && (
          <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verifying your face...</span>
          </div>
        )}

        {confidence !== null && !error && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-700 font-medium">Face verified!</p>
            <p className="text-sm text-green-600">Confidence: {confidence.toFixed(1)}%</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Scan className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Face Login</h2>
        <p className="text-gray-600 mt-1">
          Enter your email and verify with your face
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span>{error}</span>
            {confidence !== null && (
              <p className="text-xs mt-1">Match confidence: {confidence.toFixed(1)}%</p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleStartVerification} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
        >
          <Scan className="w-5 h-5" />
          Continue with Face
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900 transition"
        >
          ← Back to password login
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Requirements:</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Face authentication must be enabled on your account</li>
          <li>• Good lighting and clear view of your face</li>
          <li>• Same face used during registration</li>
        </ul>
      </div>
    </div>
  )
}
