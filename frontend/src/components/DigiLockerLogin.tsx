// DigiLocker Authentication Component
// Provides Aadhaar-based authentication with OTP verification

import { useState } from 'react';
import {
  initiateDigiLockerAuth,
  verifyDigiLockerOTP,
  resendDigiLockerOTP,
  DigiLockerUser
} from '../api/digilocker';
import {
  Shield,
  Fingerprint,
  Smartphone,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Info,
  Lock
} from 'lucide-react';

interface DigiLockerLoginProps {
  onSuccess: (user: DigiLockerUser, token: string) => void;
  onBack: () => void;
}

type Step = 'aadhaar' | 'otp' | 'success';

export function DigiLockerLogin({ onSuccess, onBack }: DigiLockerLoginProps) {
  const [step, setStep] = useState<Step>('aadhaar');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [user, setUser] = useState<DigiLockerUser | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Format Aadhaar as user types (XXXX XXXX XXXX)
  const formatAadhaar = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAadhaar(formatAadhaar(e.target.value));
    setError('');
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  const handleInitiateAuth = async () => {
    const cleanAadhaar = aadhaar.replace(/\s/g, '');

    if (cleanAadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await initiateDigiLockerAuth(cleanAadhaar);

      if (response.success) {
        setMaskedMobile(response.masked_mobile);
        setDemoOtp(response.demo_otp || '123456');
        setStep('otp');
        startResendCooldown();
      } else {
        setError(response.message || 'Failed to initiate authentication');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cleanAadhaar = aadhaar.replace(/\s/g, '');
      const response = await verifyDigiLockerOTP(cleanAadhaar, otp);

      if (response.success) {
        setUser(response.user);
        setStep('success');

        // Store token in localStorage
        localStorage.setItem('digilocker_token', response.token);

        // Call success callback after brief delay
        setTimeout(() => {
          onSuccess(response.user, response.token);
        }, 2000);
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const cleanAadhaar = aadhaar.replace(/\s/g, '');
      const response = await resendDigiLockerOTP(cleanAadhaar);

      if (response.success) {
        setDemoOtp(response.demo_otp);
        startResendCooldown();
      } else {
        setError(response.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* DigiLocker Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">DigiLocker</h2>
            <p className="text-xs text-gray-500">Government of India</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Secure Aadhaar-based authentication
        </p>
      </div>

      {/* Step: Enter Aadhaar */}
      {step === 'aadhaar' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Fingerprint className="w-4 h-4 inline mr-2" />
              Aadhaar Number
            </label>
            <input
              type="text"
              value={aadhaar}
              onChange={handleAadhaarChange}
              placeholder="XXXX XXXX XXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg tracking-wider font-mono text-center"
              maxLength={14}
            />
            <p className="mt-2 text-xs text-gray-500 text-center">
              Enter your 12-digit Aadhaar number
            </p>
          </div>

          {/* Demo Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Demo Mode</p>
                <p className="text-xs mt-1">
                  Try: <code className="bg-blue-100 px-1 rounded">1111 2222 3333</code>
                  <br />
                  OTP: <code className="bg-blue-100 px-1 rounded">123456</code> works for all
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleInitiateAuth}
            disabled={isLoading || aadhaar.replace(/\s/g, '').length !== 12}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2 shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending OTP...
              </>
            ) : (
              <>
                <Smartphone className="w-5 h-5" />
                Send OTP
              </>
            )}
          </button>

          <button
            onClick={onBack}
            className="w-full text-gray-600 hover:text-gray-800 py-2 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login Options
          </button>
        </div>
      )}

      {/* Step: Enter OTP */}
      {step === 'otp' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">OTP Sent!</h3>
            <p className="text-sm text-gray-600 mt-1">
              Enter the OTP sent to {maskedMobile}
            </p>
          </div>

          {/* Demo OTP Display */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-800">
              <strong>Demo OTP:</strong> <code className="bg-yellow-100 px-2 py-1 rounded text-lg">{demoOtp}</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={handleOtpChange}
              placeholder="• • • • • •"
              className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-2xl tracking-[0.5em] font-mono text-center"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={isLoading || otp.length !== 6}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2 shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Verify OTP
              </>
            )}
          </button>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setStep('aadhaar');
                setOtp('');
                setError('');
              }}
              className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Change Aadhaar
            </button>

            <button
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isLoading}
              className="text-orange-600 hover:text-orange-700 text-sm flex items-center gap-1 disabled:text-gray-400"
            >
              <RefreshCw className="w-4 h-4" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && user && (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900">Verification Successful!</h3>
            <p className="text-gray-600 mt-1">Your identity has been verified via DigiLocker</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Aadhaar</span>
                <span className="text-sm font-medium">{user.masked_aadhaar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to dashboard...
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          <Lock className="w-4 h-4 inline" /> Secured by DigiLocker • Government of India
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Demo mode for SIH2025
        </p>
      </div>
    </div>
  );
}

export default DigiLockerLogin;
