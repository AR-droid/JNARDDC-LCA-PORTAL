import { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react'
import { faceAuthApi, FaceQualityResponse } from '../../api/faceAuth'

interface FaceCameraProps {
  onCapture: (imageBase64: string) => void
  onCancel?: () => void
  mode: 'register' | 'verify'
  showQualityCheck?: boolean
}

export default function FaceCamera({ 
  onCapture, 
  onCancel, 
  mode,
  showQualityCheck = true
}: FaceCameraProps) {
  const webcamRef = useRef<Webcam>(null)
  const [isReady, setIsReady] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [qualityStatus, setQualityStatus] = useState<FaceQualityResponse | null>(null)
  const [isCheckingQuality, setIsCheckingQuality] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoConstraints = {
    width: 480,
    height: 360,
    facingMode: 'user'
  }

  // Auto quality check during registration
  useEffect(() => {
    if (!showQualityCheck || !isReady || capturedImage || mode !== 'register') return

    const checkQuality = async () => {
      if (!webcamRef.current) return
      
      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) return

      try {
        setIsCheckingQuality(true)
        const result = await faceAuthApi.checkQuality(imageSrc)
        setQualityStatus(result)
        setError(null)
      } catch (err: any) {
        // Silently fail quality checks - user can still capture
        setQualityStatus(null)
      } finally {
        setIsCheckingQuality(false)
      }
    }

    // Check quality every 2 seconds
    const interval = setInterval(checkQuality, 2000)
    return () => clearInterval(interval)
  }, [isReady, capturedImage, mode, showQualityCheck])

  const capture = useCallback(() => {
    if (!webcamRef.current) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      setError(null)
    }
  }, [])

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setQualityStatus(null)
    setError(null)
  }

  // Countdown timer for auto-capture
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdown === 0) {
        capture()
      }
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, capture])

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {mode === 'register' ? 'Register Your Face' : 'Face Verification'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {mode === 'register' 
            ? 'Position your face in the center of the frame'
            : 'Look at the camera to verify your identity'
          }
        </p>
      </div>

      {/* Camera/Preview Area */}
      <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-[4/3]">
        {!capturedImage ? (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              onUserMedia={() => setIsReady(true)}
              onUserMediaError={(err) => setError(`Camera access denied: ${err}`)}
              className="w-full h-full object-cover"
              mirrored
            />
            
            {/* Face guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 480 360">
                {/* Dark overlay with face cutout */}
                <defs>
                  <mask id="faceMask">
                    <rect width="100%" height="100%" fill="white" />
                    <ellipse cx="240" cy="160" rx="100" ry="130" fill="black" />
                  </mask>
                </defs>
                <rect 
                  width="100%" 
                  height="100%" 
                  fill="rgba(0,0,0,0.3)" 
                  mask="url(#faceMask)" 
                />
                {/* Face outline */}
                <ellipse 
                  cx="240" 
                  cy="160" 
                  rx="100" 
                  ry="130" 
                  fill="none" 
                  stroke={qualityStatus?.quality_ok ? '#22c55e' : '#fff'} 
                  strokeWidth="3"
                  strokeDasharray={qualityStatus?.quality_ok ? '0' : '10,5'}
                />
              </svg>
            </div>

            {/* Quality indicator */}
            {showQualityCheck && mode === 'register' && (
              <div className="absolute top-3 left-3 right-3">
                {isCheckingQuality ? (
                  <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2 text-white text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking face quality...
                  </div>
                ) : qualityStatus ? (
                  <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${
                    qualityStatus.quality_ok 
                      ? 'bg-green-500/80 text-white' 
                      : 'bg-yellow-500/80 text-white'
                  }`}>
                    {qualityStatus.quality_ok ? (
                      <>
                        <Check className="w-4 h-4" />
                        Face detected - Ready to capture
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        {qualityStatus.issues?.[0] || 'Adjust your position'}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Countdown overlay */}
            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-6xl font-bold text-white animate-pulse">
                  {countdown}
                </span>
              </div>
            )}

            {/* Camera not ready */}
            {!isReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Preview captured image */
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quality issues list (for registration) */}
      {showQualityCheck && mode === 'register' && !capturedImage && qualityStatus?.issues && qualityStatus.issues.length > 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-1">Tips for better capture:</p>
          <ul className="text-xs text-yellow-700 space-y-1">
            {qualityStatus.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-1">
                <span>•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        {!capturedImage ? (
          <>
            <button
              onClick={capture}
              disabled={!isReady}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Capture
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              {mode === 'register' ? 'Register Face' : 'Verify'}
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        {mode === 'register' ? (
          <p>Your face data is securely processed and only a unique identifier is stored.</p>
        ) : (
          <p>Face verification is used to confirm your identity.</p>
        )}
      </div>
    </div>
  )
}
