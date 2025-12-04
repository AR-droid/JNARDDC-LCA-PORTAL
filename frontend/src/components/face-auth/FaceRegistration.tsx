import { useState } from 'react'
import { Scan, Shield, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import FaceCamera from './FaceCamera'
import { faceAuthApi, FaceAuthStatus } from '../../api/faceAuth'

interface FaceRegistrationProps {
  faceStatus: FaceAuthStatus | null
  onStatusChange: () => void
}

export default function FaceRegistration({ faceStatus, onStatusChange }: FaceRegistrationProps) {
  const [showCamera, setShowCamera] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleCapture = async (imageBase64: string) => {
    setIsRegistering(true)
    setMessage(null)

    try {
      await faceAuthApi.register(imageBase64)
      setMessage({ type: 'success', text: 'Face registered successfully! You can now use face login.' })
      setShowCamera(false)
      onStatusChange()
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to register face. Please try again.'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setIsRegistering(false)
    }
  }

  const handleRemoveFace = async () => {
    if (!confirm('Are you sure you want to remove face authentication?')) return

    setIsRemoving(true)
    setMessage(null)

    try {
      await faceAuthApi.remove()
      setMessage({ type: 'success', text: 'Face authentication removed.' })
      onStatusChange()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to remove face authentication.' })
    } finally {
      setIsRemoving(false)
    }
  }

  if (showCamera) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <FaceCamera
          mode="register"
          onCapture={handleCapture}
          onCancel={() => setShowCamera(false)}
          showQualityCheck={true}
        />
        
        {isRegistering && (
          <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Registering face...</span>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Scan className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Face Authentication</h3>
          <p className="text-sm text-gray-500">Use your face to log in securely</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {faceStatus?.face_registered ? (
        /* Face is registered */
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800">Face Authentication Enabled</p>
              <p className="text-sm text-green-600">
                Registered on {faceStatus.registered_at 
                  ? new Date(faceStatus.registered_at).toLocaleDateString() 
                  : 'Unknown date'
                }
              </p>
            </div>
            <Check className="w-6 h-6 text-green-500" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCamera(true)}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Scan className="w-4 h-4" />
              Update Face
            </button>
            <button
              onClick={handleRemoveFace}
              disabled={isRemoving}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Remove
            </button>
          </div>

          <p className="text-xs text-gray-500">
            You can use face authentication as an alternative to password login.
          </p>
        </div>
      ) : (
        /* Face not registered */
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Why use face authentication?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Quick and secure login
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                No need to remember passwords
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Powered by Face++ AI technology
              </li>
            </ul>
          </div>

          <button
            onClick={() => setShowCamera(true)}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            <Scan className="w-5 h-5" />
            Set Up Face Authentication
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your face data is processed securely. Only a unique identifier is stored, not your actual image.
          </p>
        </div>
      )}
    </div>
  )
}
