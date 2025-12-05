"""
DigiLocker Mock API
===================
Flask API endpoints for DigiLocker simulation.
"""

import random
import hashlib
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from functools import wraps

# Handle imports for standalone or module usage
try:
    from .mock_data import (
        MOCK_USERS, MOCK_DOCUMENTS, DOCUMENT_TYPES,
        generate_otp, mask_aadhaar, mask_phone,
        get_user_by_aadhaar, get_user_documents, verify_document
    )
except ImportError:
    from mock_data import (
        MOCK_USERS, MOCK_DOCUMENTS, DOCUMENT_TYPES,
        generate_otp, mask_aadhaar, mask_phone,
        get_user_by_aadhaar, get_user_documents, verify_document
    )


class DigiLockerAPI:
    """
    Mock DigiLocker API for authentication and document verification.
    Simulates the real DigiLocker API behavior.
    """
    
    def __init__(self):
        # Store active OTPs (aadhaar -> {otp, expires_at})
        self.active_otps: Dict[str, Dict] = {}
        
        # Store active sessions (token -> user_data)
        self.active_sessions: Dict[str, Dict] = {}
        
        # Demo OTP (always works for testing)
        self.demo_otp = "123456"
        
        print("🔐 DigiLocker Mock API initialized")
    
    def _generate_token(self, aadhaar: str) -> str:
        """Generate a session token"""
        data = f"{aadhaar}{time.time()}{random.random()}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]
    
    def initiate_auth(self, aadhaar: str) -> Tuple[bool, Dict]:
        """
        Initiate Aadhaar-based authentication.
        Sends OTP to registered mobile (simulated).
        
        Returns:
            Tuple of (success, response_data)
        """
        aadhaar = aadhaar.replace(" ", "")
        
        # Validate Aadhaar format
        if len(aadhaar) != 12 or not aadhaar.isdigit():
            return False, {
                "error": "INVALID_AADHAAR",
                "message": "Please enter a valid 12-digit Aadhaar number"
            }
        
        # Check if user exists
        user = get_user_by_aadhaar(aadhaar)
        if not user:
            # For demo, create a temporary user
            user = {
                "name": "New User",
                "phone": "9999999999",
                "verified": True
            }
        
        # Generate OTP
        otp = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        self.active_otps[aadhaar] = {
            "otp": otp,
            "expires_at": expires_at,
            "attempts": 0
        }
        
        # In real scenario, OTP is sent via SMS
        # For demo, we'll show it in console
        print(f"📱 [DigiLocker] OTP for {mask_aadhaar(aadhaar)}: {otp}")
        
        return True, {
            "success": True,
            "message": f"OTP sent to mobile {mask_phone(user.get('phone', '9999999999'))}",
            "masked_mobile": mask_phone(user.get('phone', '9999999999')),
            "masked_aadhaar": mask_aadhaar(aadhaar),
            "otp_valid_for": "10 minutes",
            # For demo purposes, include OTP in response
            "demo_otp": otp if aadhaar in MOCK_USERS else self.demo_otp,
            "demo_mode": True
        }
    
    def verify_otp(self, aadhaar: str, otp: str) -> Tuple[bool, Dict]:
        """
        Verify OTP and complete authentication.
        
        Returns:
            Tuple of (success, response_data with token)
        """
        aadhaar = aadhaar.replace(" ", "")
        
        # Check if OTP was requested
        otp_data = self.active_otps.get(aadhaar)
        
        if not otp_data:
            return False, {
                "error": "OTP_NOT_REQUESTED",
                "message": "Please request OTP first"
            }
        
        # Check expiry
        if datetime.now() > otp_data["expires_at"]:
            del self.active_otps[aadhaar]
            return False, {
                "error": "OTP_EXPIRED",
                "message": "OTP has expired. Please request a new one."
            }
        
        # Check attempts
        if otp_data["attempts"] >= 3:
            del self.active_otps[aadhaar]
            return False, {
                "error": "MAX_ATTEMPTS",
                "message": "Maximum attempts exceeded. Please request a new OTP."
            }
        
        # Verify OTP (accept demo OTP for any user)
        if otp != otp_data["otp"] and otp != self.demo_otp:
            otp_data["attempts"] += 1
            remaining = 3 - otp_data["attempts"]
            return False, {
                "error": "INVALID_OTP",
                "message": f"Invalid OTP. {remaining} attempts remaining.",
                "attempts_remaining": remaining
            }
        
        # OTP verified - create session
        del self.active_otps[aadhaar]
        
        # Get or create user data
        user = get_user_by_aadhaar(aadhaar)
        if not user:
            user = {
                "name": "DigiLocker User",
                "dob": "1990-01-01",
                "gender": "Not specified",
                "address": "India",
                "phone": "9999999999",
                "email": "user@example.com",
                "verified": True
            }
        
        # Generate session token
        token = self._generate_token(aadhaar)
        
        session_data = {
            "aadhaar": aadhaar,
            "user": user,
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(hours=24)).isoformat()
        }
        
        self.active_sessions[token] = session_data
        
        return True, {
            "success": True,
            "message": "Authentication successful",
            "token": token,
            "user": {
                "name": user["name"],
                "masked_aadhaar": mask_aadhaar(aadhaar),
                "verified": True,
                "dob": user.get("dob"),
                "gender": user.get("gender"),
                "address": user.get("address")
            },
            "expires_in": "24 hours"
        }
    
    def get_user_profile(self, token: str) -> Tuple[bool, Dict]:
        """Get authenticated user's profile"""
        session = self.active_sessions.get(token)
        
        if not session:
            return False, {
                "error": "INVALID_TOKEN",
                "message": "Session expired or invalid. Please login again."
            }
        
        user = session["user"]
        aadhaar = session["aadhaar"]
        
        return True, {
            "success": True,
            "profile": {
                "name": user["name"],
                "dob": user.get("dob"),
                "gender": user.get("gender"),
                "address": user.get("address"),
                "phone": mask_phone(user.get("phone", "")),
                "email": user.get("email"),
                "aadhaar_masked": mask_aadhaar(aadhaar),
                "verified": True,
                "verification_date": datetime.now().isoformat()
            }
        }
    
    def get_documents(self, token: str) -> Tuple[bool, Dict]:
        """Get list of documents linked to user's DigiLocker"""
        session = self.active_sessions.get(token)
        
        if not session:
            return False, {
                "error": "INVALID_TOKEN",
                "message": "Session expired or invalid"
            }
        
        aadhaar = session["aadhaar"]
        documents = get_user_documents(aadhaar)
        
        # Add document type info
        for doc in documents:
            doc_type = DOCUMENT_TYPES.get(doc["type"], {})
            doc["type_info"] = doc_type
        
        return True, {
            "success": True,
            "documents": documents,
            "total_count": len(documents),
            "available_types": list(DOCUMENT_TYPES.keys())
        }
    
    def get_document_details(self, token: str, doc_id: str) -> Tuple[bool, Dict]:
        """Get details of a specific document"""
        session = self.active_sessions.get(token)
        
        if not session:
            return False, {
                "error": "INVALID_TOKEN",
                "message": "Session expired or invalid"
            }
        
        aadhaar = session["aadhaar"]
        doc = MOCK_DOCUMENTS.get(doc_id)
        
        if not doc:
            return False, {
                "error": "DOCUMENT_NOT_FOUND",
                "message": "Document not found"
            }
        
        # Verify document belongs to user
        if doc.get("aadhaar") != aadhaar:
            return False, {
                "error": "UNAUTHORIZED",
                "message": "You don't have access to this document"
            }
        
        return True, {
            "success": True,
            "document": {
                "doc_id": doc_id,
                **doc,
                "type_info": DOCUMENT_TYPES.get(doc["type"], {}),
                "verification_status": "Verified",
                "last_verified": datetime.now().isoformat()
            }
        }
    
    def verify_identity(self, token: str) -> Tuple[bool, Dict]:
        """
        Generate identity verification certificate.
        Used for KYC compliance.
        """
        session = self.active_sessions.get(token)
        
        if not session:
            return False, {
                "error": "INVALID_TOKEN",
                "message": "Session expired or invalid"
            }
        
        user = session["user"]
        aadhaar = session["aadhaar"]
        
        # Generate verification ID
        verification_id = hashlib.sha256(
            f"{aadhaar}{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16].upper()
        
        return True, {
            "success": True,
            "verification": {
                "verification_id": verification_id,
                "status": "VERIFIED",
                "name": user["name"],
                "aadhaar_masked": mask_aadhaar(aadhaar),
                "verification_date": datetime.now().isoformat(),
                "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
                "issuer": "DigiLocker (Government of India)",
                "qr_data": f"DIGILOCKER-VERIFY:{verification_id}"
            }
        }
    
    def logout(self, token: str) -> Tuple[bool, Dict]:
        """Logout and invalidate session"""
        if token in self.active_sessions:
            del self.active_sessions[token]
            return True, {"success": True, "message": "Logged out successfully"}
        
        return False, {"error": "INVALID_TOKEN", "message": "Session not found"}
    
    def resend_otp(self, aadhaar: str) -> Tuple[bool, Dict]:
        """Resend OTP for authentication"""
        aadhaar = aadhaar.replace(" ", "")
        
        # Rate limiting check
        existing = self.active_otps.get(aadhaar)
        if existing and existing.get("resend_count", 0) >= 3:
            return False, {
                "error": "RATE_LIMITED",
                "message": "Maximum resend attempts reached. Please try again later."
            }
        
        # Generate new OTP
        otp = generate_otp()
        resend_count = (existing.get("resend_count", 0) if existing else 0) + 1
        
        self.active_otps[aadhaar] = {
            "otp": otp,
            "expires_at": datetime.now() + timedelta(minutes=10),
            "attempts": 0,
            "resend_count": resend_count
        }
        
        print(f"📱 [DigiLocker] New OTP for {mask_aadhaar(aadhaar)}: {otp}")
        
        user = get_user_by_aadhaar(aadhaar) or {"phone": "9999999999"}
        
        return True, {
            "success": True,
            "message": f"New OTP sent to {mask_phone(user.get('phone', '9999999999'))}",
            "demo_otp": otp,
            "resend_remaining": 3 - resend_count
        }


# Global instance
digilocker_api = DigiLockerAPI()
