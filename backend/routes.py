"""
DigiLocker Flask Routes
=======================
REST API endpoints for DigiLocker mock authentication.
Add these routes to your main app.py
"""

from flask import Blueprint, request, jsonify
import sys
import os

# Add Digi-Locker to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from digilocker_api import digilocker_api

# Create Blueprint
digilocker_bp = Blueprint('digilocker', __name__, url_prefix='/api/v1/digilocker')


@digilocker_bp.route('/auth/initiate', methods=['POST', 'OPTIONS'])
def initiate_auth():
    """
    Initiate DigiLocker authentication with Aadhaar.
    
    Request body:
        {"aadhaar": "123456789012"}
    
    Response:
        {"success": true, "message": "OTP sent...", "demo_otp": "123456"}
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json() or {}
    aadhaar = data.get('aadhaar', '')
    
    if not aadhaar:
        return jsonify({"error": "MISSING_AADHAAR", "message": "Aadhaar number is required"}), 400
    
    success, result = digilocker_api.initiate_auth(aadhaar)
    
    return jsonify(result), 200 if success else 400


@digilocker_bp.route('/auth/verify-otp', methods=['POST', 'OPTIONS'])
def verify_otp():
    """
    Verify OTP and complete authentication.
    
    Request body:
        {"aadhaar": "123456789012", "otp": "123456"}
    
    Response:
        {"success": true, "token": "abc123...", "user": {...}}
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json() or {}
    aadhaar = data.get('aadhaar', '')
    otp = data.get('otp', '')
    
    if not aadhaar or not otp:
        return jsonify({"error": "MISSING_DATA", "message": "Aadhaar and OTP are required"}), 400
    
    success, result = digilocker_api.verify_otp(aadhaar, otp)
    
    return jsonify(result), 200 if success else 400


@digilocker_bp.route('/auth/resend-otp', methods=['POST', 'OPTIONS'])
def resend_otp():
    """Resend OTP"""
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json() or {}
    aadhaar = data.get('aadhaar', '')
    
    if not aadhaar:
        return jsonify({"error": "MISSING_AADHAAR", "message": "Aadhaar number is required"}), 400
    
    success, result = digilocker_api.resend_otp(aadhaar)
    
    return jsonify(result), 200 if success else 400


@digilocker_bp.route('/profile', methods=['GET', 'OPTIONS'])
def get_profile():
    """Get authenticated user's profile"""
    if request.method == 'OPTIONS':
        return '', 200
    
    token = request.headers.get('X-DigiLocker-Token', '')
    
    if not token:
        return jsonify({"error": "MISSING_TOKEN", "message": "DigiLocker token is required"}), 401
    
    success, result = digilocker_api.get_user_profile(token)
    
    return jsonify(result), 200 if success else 401


@digilocker_bp.route('/documents', methods=['GET', 'OPTIONS'])
def get_documents():
    """Get list of user's documents"""
    if request.method == 'OPTIONS':
        return '', 200
    
    token = request.headers.get('X-DigiLocker-Token', '')
    
    if not token:
        return jsonify({"error": "MISSING_TOKEN", "message": "DigiLocker token is required"}), 401
    
    success, result = digilocker_api.get_documents(token)
    
    return jsonify(result), 200 if success else 401


@digilocker_bp.route('/documents/<doc_id>', methods=['GET', 'OPTIONS'])
def get_document(doc_id):
    """Get specific document details"""
    if request.method == 'OPTIONS':
        return '', 200
    
    token = request.headers.get('X-DigiLocker-Token', '')
    
    if not token:
        return jsonify({"error": "MISSING_TOKEN", "message": "DigiLocker token is required"}), 401
    
    success, result = digilocker_api.get_document_details(token, doc_id)
    
    return jsonify(result), 200 if success else (401 if "TOKEN" in result.get("error", "") else 404)


@digilocker_bp.route('/verify-identity', methods=['POST', 'OPTIONS'])
def verify_identity():
    """Generate identity verification certificate (KYC)"""
    if request.method == 'OPTIONS':
        return '', 200
    
    token = request.headers.get('X-DigiLocker-Token', '')
    
    if not token:
        return jsonify({"error": "MISSING_TOKEN", "message": "DigiLocker token is required"}), 401
    
    success, result = digilocker_api.verify_identity(token)
    
    return jsonify(result), 200 if success else 401


@digilocker_bp.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    """Logout from DigiLocker"""
    if request.method == 'OPTIONS':
        return '', 200
    
    token = request.headers.get('X-DigiLocker-Token', '')
    
    success, result = digilocker_api.logout(token)
    
    return jsonify(result), 200


# Available test Aadhaar numbers for demo
@digilocker_bp.route('/demo-credentials', methods=['GET'])
def demo_credentials():
    """Get demo credentials for testing"""
    return jsonify({
        "message": "Use these Aadhaar numbers for testing",
        "demo_credentials": [
            {"aadhaar": "111122223333", "name": "Demo User", "otp": "123456"},
            {"aadhaar": "123456789012", "name": "Rahul Sharma", "otp": "Use OTP from console"},
            {"aadhaar": "987654321098", "name": "Priya Patel", "otp": "Use OTP from console"},
        ],
        "note": "OTP '123456' works for all users in demo mode"
    })
