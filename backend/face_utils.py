"""
Face++ API Utility Module
Handles face detection, comparison, and liveness verification using Face++ (Megvii) API.
"""

import os
import requests
import base64
from typing import Optional, Dict, Any, Tuple

# Face++ API Configuration
FACEPP_API_KEY = os.getenv('FACEPP_API_KEY', 'djHyv6nM7FXcsKmRO-65CrY_zvSA_qxH')
FACEPP_API_SECRET = os.getenv('FACEPP_API_SECRET', 'QN0P-iayDif9UComBL34UQx94WkOhqQ9')

# Face++ API Endpoints
FACEPP_DETECT_URL = 'https://api-us.faceplusplus.com/facepp/v3/detect'
FACEPP_COMPARE_URL = 'https://api-us.faceplusplus.com/facepp/v3/compare'
FACEPP_SEARCH_URL = 'https://api-us.faceplusplus.com/facepp/v3/search'
FACEPP_FACESET_CREATE_URL = 'https://api-us.faceplusplus.com/facepp/v3/faceset/create'
FACEPP_FACESET_ADDFACE_URL = 'https://api-us.faceplusplus.com/facepp/v3/faceset/addface'
FACEPP_FACESET_REMOVEFACE_URL = 'https://api-us.faceplusplus.com/facepp/v3/faceset/removeface'


def detect_face(image_base64: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Detect face in an image and return face_token.
    
    Args:
        image_base64: Base64 encoded image string (with or without data URI prefix)
    
    Returns:
        Tuple of (face_token, error_message)
        - face_token is None if detection fails
        - error_message is None if detection succeeds
    """
    try:
        # Remove data URI prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Prepare request data
        data = {
            'api_key': FACEPP_API_KEY,
            'api_secret': FACEPP_API_SECRET,
            'image_base64': image_base64,
            'return_attributes': 'headpose,blur,eyestatus'  # For quality checks
        }
        
        # Make API request
        response = requests.post(FACEPP_DETECT_URL, data=data, timeout=30)
        result = response.json()
        
        # Check for API errors
        if 'error_message' in result:
            return None, result['error_message']
        
        # Check if faces were detected
        faces = result.get('faces', [])
        if not faces:
            return None, 'No face detected in the image. Please ensure your face is clearly visible.'
        
        if len(faces) > 1:
            return None, 'Multiple faces detected. Please ensure only one face is in the frame.'
        
        face = faces[0]
        face_token = face.get('face_token')
        
        # Quality checks
        attributes = face.get('attributes', {})
        
        # Check head pose (not too tilted)
        headpose = attributes.get('headpose', {})
        if headpose:
            pitch = abs(headpose.get('pitch_angle', 0))
            yaw = abs(headpose.get('yaw_angle', 0))
            roll = abs(headpose.get('roll_angle', 0))
            
            if pitch > 30 or yaw > 30 or roll > 30:
                return None, 'Please face the camera directly. Your face appears tilted.'
        
        # Check blur
        blur = attributes.get('blur', {})
        if blur:
            blurness = blur.get('blurness', {}).get('value', 0)
            if blurness > 50:
                return None, 'Image is too blurry. Please hold still and ensure good lighting.'
        
        # Check if eyes are open
        eyestatus = attributes.get('eyestatus', {})
        if eyestatus:
            left_open = eyestatus.get('left_eye_status', {}).get('normal_glass_eye_open', 0)
            right_open = eyestatus.get('right_eye_status', {}).get('normal_glass_eye_open', 0)
            # Also check for no glasses
            left_open += eyestatus.get('left_eye_status', {}).get('no_glass_eye_open', 0)
            right_open += eyestatus.get('right_eye_status', {}).get('no_glass_eye_open', 0)
            
            if left_open < 30 and right_open < 30:
                return None, 'Please keep your eyes open for face registration.'
        
        return face_token, None
        
    except requests.exceptions.Timeout:
        return None, 'Face++ API request timed out. Please try again.'
    except requests.exceptions.RequestException as e:
        return None, f'Network error connecting to Face++ API: {str(e)}'
    except Exception as e:
        return None, f'Unexpected error during face detection: {str(e)}'


def compare_faces(face_token1: str, image_base64: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Compare a stored face_token with a new image.
    
    Args:
        face_token1: Stored face_token from registration
        image_base64: Base64 encoded image for verification
    
    Returns:
        Tuple of (confidence_score, error_message)
        - confidence_score is 0-100, None if comparison fails
        - error_message is None if comparison succeeds
    """
    try:
        # Remove data URI prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Prepare request data
        data = {
            'api_key': FACEPP_API_KEY,
            'api_secret': FACEPP_API_SECRET,
            'face_token1': face_token1,
            'image_base64_2': image_base64
        }
        
        # Make API request
        response = requests.post(FACEPP_COMPARE_URL, data=data, timeout=30)
        result = response.json()
        
        # Check for API errors
        if 'error_message' in result:
            error_msg = result['error_message']
            if 'INVALID_FACE_TOKEN' in error_msg:
                return None, 'Face registration has expired. Please re-register your face.'
            return None, error_msg
        
        # Get confidence score
        confidence = result.get('confidence', 0)
        
        # Face++ provides thresholds
        thresholds = result.get('thresholds', {})
        threshold_1e5 = thresholds.get('1e-5', 70)  # Very secure threshold
        threshold_1e4 = thresholds.get('1e-4', 65)  # Secure threshold
        
        return confidence, None
        
    except requests.exceptions.Timeout:
        return None, 'Face++ API request timed out. Please try again.'
    except requests.exceptions.RequestException as e:
        return None, f'Network error connecting to Face++ API: {str(e)}'
    except Exception as e:
        return None, f'Unexpected error during face comparison: {str(e)}'


def verify_face(stored_face_token: str, image_base64: str, threshold: float = 70.0) -> Tuple[bool, float, Optional[str]]:
    """
    Verify if a face matches the stored face_token.
    
    Args:
        stored_face_token: Face token from registration
        image_base64: Base64 encoded image for verification
        threshold: Minimum confidence score for verification (default 70%)
    
    Returns:
        Tuple of (is_verified, confidence_score, error_message)
    """
    confidence, error = compare_faces(stored_face_token, image_base64)
    
    if error:
        return False, 0.0, error
    
    is_verified = confidence >= threshold
    
    if not is_verified:
        return False, confidence, 'Face verification failed. The face does not match the registered face.'
    
    return True, confidence, None


def get_face_quality_score(image_base64: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Get detailed face quality information for an image.
    
    Args:
        image_base64: Base64 encoded image string
    
    Returns:
        Tuple of (quality_info, error_message)
    """
    try:
        # Remove data URI prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Prepare request data with all quality attributes
        data = {
            'api_key': FACEPP_API_KEY,
            'api_secret': FACEPP_API_SECRET,
            'image_base64': image_base64,
            'return_attributes': 'headpose,blur,eyestatus,facequality'
        }
        
        # Make API request
        response = requests.post(FACEPP_DETECT_URL, data=data, timeout=30)
        result = response.json()
        
        if 'error_message' in result:
            return None, result['error_message']
        
        faces = result.get('faces', [])
        if not faces:
            return None, 'No face detected'
        
        face = faces[0]
        attributes = face.get('attributes', {})
        
        quality_info = {
            'face_token': face.get('face_token'),
            'face_rectangle': face.get('face_rectangle'),
            'headpose': attributes.get('headpose', {}),
            'blur': attributes.get('blur', {}),
            'eyestatus': attributes.get('eyestatus', {}),
            'facequality': attributes.get('facequality', {}),
            'face_count': len(faces)
        }
        
        return quality_info, None
        
    except Exception as e:
        return None, str(e)


# Liveness detection (basic implementation)
def check_liveness_simple(image_base64: str) -> Tuple[bool, Optional[str]]:
    """
    Basic liveness check using face quality metrics.
    This is a simplified version - for production, use Face++ Liveness API.
    
    Args:
        image_base64: Base64 encoded image string
    
    Returns:
        Tuple of (is_live, error_message)
    """
    quality_info, error = get_face_quality_score(image_base64)
    
    if error:
        return False, error
    
    # Check facequality threshold (higher = more likely real)
    facequality = quality_info.get('facequality', {})
    quality_value = facequality.get('value', 0)
    
    # Check blur (lower = sharper, more likely real camera)
    blur = quality_info.get('blur', {})
    motion_blur = blur.get('motionblur', {}).get('value', 0)
    gaussian_blur = blur.get('gaussianblur', {}).get('value', 0)
    
    # Simple heuristic: real faces typically have better quality
    # and natural motion blur patterns
    is_likely_live = quality_value > 50 and gaussian_blur < 30
    
    if not is_likely_live:
        return False, 'Liveness check failed. Please ensure you are using a live camera.'
    
    return True, None
