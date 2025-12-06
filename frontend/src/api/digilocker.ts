// DigiLocker Authentication API Client
// Frontend API calls for DigiLocker mock integration

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE = `${baseUrl.replace(/\/$/, '')}/api/v1/digilocker`;

export interface DigiLockerUser {
  name: string;
  masked_aadhaar: string;
  verified: boolean;
  dob?: string;
  gender?: string;
  address?: string;
}

export interface DigiLockerDocument {
  doc_id: string;
  type: string;
  doc_name: string;
  holder_name: string;
  status: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  doc_number: string;
  type_info?: {
    name: string;
    issuer: string;
    icon: string;
    color: string;
  };
}

export interface InitiateAuthResponse {
  success: boolean;
  message: string;
  masked_mobile: string;
  masked_aadhaar: string;
  demo_otp?: string;
  demo_mode?: boolean;
  error?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  token: string;
  user: DigiLockerUser;
  message: string;
  error?: string;
}

// Initiate DigiLocker authentication
export async function initiateDigiLockerAuth(aadhaar: string): Promise<InitiateAuthResponse> {
  const response = await fetch(`${API_BASE}/auth/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aadhaar })
  });
  return response.json();
}

// Verify OTP
export async function verifyDigiLockerOTP(aadhaar: string, otp: string): Promise<VerifyOTPResponse> {
  const response = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aadhaar, otp })
  });
  return response.json();
}

// Resend OTP
export async function resendDigiLockerOTP(aadhaar: string) {
  const response = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aadhaar })
  });
  return response.json();
}

// Get user profile
export async function getDigiLockerProfile(token: string) {
  const response = await fetch(`${API_BASE}/profile`, {
    headers: { 'X-DigiLocker-Token': token }
  });
  return response.json();
}

// Get user documents
export async function getDigiLockerDocuments(token: string): Promise<{ documents: DigiLockerDocument[] }> {
  const response = await fetch(`${API_BASE}/documents`, {
    headers: { 'X-DigiLocker-Token': token }
  });
  return response.json();
}

// Get document details
export async function getDigiLockerDocument(token: string, docId: string) {
  const response = await fetch(`${API_BASE}/documents/${docId}`, {
    headers: { 'X-DigiLocker-Token': token }
  });
  return response.json();
}

// Verify identity (KYC)
export async function verifyDigiLockerIdentity(token: string) {
  const response = await fetch(`${API_BASE}/verify-identity`, {
    method: 'POST',
    headers: { 'X-DigiLocker-Token': token }
  });
  return response.json();
}

// Logout
export async function digiLockerLogout(token: string) {
  const response = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: { 'X-DigiLocker-Token': token }
  });
  return response.json();
}

// Get demo credentials
export async function getDigiLockerDemoCredentials() {
  const response = await fetch(`${API_BASE}/demo-credentials`);
  return response.json();
}
