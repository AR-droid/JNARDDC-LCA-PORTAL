"""
Mock DigiLocker Data
====================
Simulated user data and documents for demo purposes.
"""

import random
from datetime import datetime, timedelta

# Mock Aadhaar Users Database
MOCK_USERS = {
    # Test user 1
    "123456789012": {
        "name": "Rahul Sharma",
        "dob": "1995-05-15",
        "gender": "Male",
        "address": "123 Gandhi Nagar, New Delhi - 110001",
        "phone": "9876543210",
        "email": "rahul.sharma@example.com",
        "photo": "/images/mock-user-1.jpg",
        "verified": True
    },
    # Test user 2
    "987654321098": {
        "name": "Priya Patel",
        "dob": "1998-08-22",
        "gender": "Female",
        "address": "456 MG Road, Mumbai - 400001",
        "phone": "9123456780",
        "email": "priya.patel@example.com",
        "photo": "/images/mock-user-2.jpg",
        "verified": True
    },
    # Test user 3
    "456789123456": {
        "name": "Amit Kumar",
        "dob": "1992-12-10",
        "gender": "Male",
        "address": "789 Park Street, Kolkata - 700001",
        "phone": "9988776655",
        "email": "amit.kumar@example.com",
        "photo": "/images/mock-user-3.jpg",
        "verified": True
    },
    # Demo user (easy to remember)
    "111122223333": {
        "name": "Demo User",
        "dob": "2000-01-01",
        "gender": "Male",
        "address": "JNARDDC Campus, Nagpur - 440001",
        "phone": "1234567890",
        "email": "demo@jnarddc.gov.in",
        "photo": "/images/demo-user.jpg",
        "verified": True
    }
}

# Mock Documents Database
MOCK_DOCUMENTS = {
    # PAN Cards
    "ABCDE1234F": {
        "type": "PAN",
        "doc_name": "Permanent Account Number Card",
        "holder_name": "Rahul Sharma",
        "aadhaar": "123456789012",
        "issue_date": "2015-03-20",
        "issuing_authority": "Income Tax Department, Government of India",
        "status": "Active",
        "doc_number": "ABCDE1234F"
    },
    "PQRST5678G": {
        "type": "PAN",
        "doc_name": "Permanent Account Number Card",
        "holder_name": "Priya Patel",
        "aadhaar": "987654321098",
        "issue_date": "2018-07-15",
        "issuing_authority": "Income Tax Department, Government of India",
        "status": "Active",
        "doc_number": "PQRST5678G"
    },
    
    # Driving Licenses
    "DL-1420110012345": {
        "type": "DRIVING_LICENSE",
        "doc_name": "Driving License",
        "holder_name": "Rahul Sharma",
        "aadhaar": "123456789012",
        "issue_date": "2018-05-10",
        "expiry_date": "2038-05-09",
        "issuing_authority": "Transport Department, Delhi",
        "vehicle_classes": ["LMV", "MCWG"],
        "blood_group": "O+",
        "status": "Active",
        "doc_number": "DL-1420110012345"
    },
    "MH-0220150067890": {
        "type": "DRIVING_LICENSE",
        "doc_name": "Driving License",
        "holder_name": "Priya Patel",
        "aadhaar": "987654321098",
        "issue_date": "2020-02-28",
        "expiry_date": "2040-02-27",
        "issuing_authority": "Transport Department, Maharashtra",
        "vehicle_classes": ["LMV"],
        "blood_group": "B+",
        "status": "Active",
        "doc_number": "MH-0220150067890"
    },
    
    # Vehicle Registration
    "DL01AB1234": {
        "type": "VEHICLE_RC",
        "doc_name": "Vehicle Registration Certificate",
        "holder_name": "Rahul Sharma",
        "aadhaar": "123456789012",
        "vehicle_make": "Maruti Suzuki",
        "vehicle_model": "Swift",
        "vehicle_type": "Hatchback",
        "fuel_type": "Petrol",
        "registration_date": "2022-01-15",
        "expiry_date": "2037-01-14",
        "issuing_authority": "RTO Delhi",
        "status": "Active",
        "doc_number": "DL01AB1234"
    },
    
    # Class 10 Marksheet
    "CBSE-2010-123456": {
        "type": "CLASS_10_MARKSHEET",
        "doc_name": "Class X Marksheet",
        "holder_name": "Rahul Sharma",
        "aadhaar": "123456789012",
        "board": "CBSE",
        "year": "2010",
        "roll_number": "8765432",
        "percentage": "85.6%",
        "result": "PASS",
        "issuing_authority": "Central Board of Secondary Education",
        "status": "Verified",
        "doc_number": "CBSE-2010-123456"
    },
    
    # Class 12 Marksheet
    "CBSE-2012-789012": {
        "type": "CLASS_12_MARKSHEET",
        "doc_name": "Class XII Marksheet",
        "holder_name": "Rahul Sharma",
        "aadhaar": "123456789012",
        "board": "CBSE",
        "year": "2012",
        "roll_number": "9876543",
        "percentage": "82.4%",
        "result": "PASS",
        "stream": "Science",
        "issuing_authority": "Central Board of Secondary Education",
        "status": "Verified",
        "doc_number": "CBSE-2012-789012"
    },
    
    # Demo User Documents
    "DEMO12345X": {
        "type": "PAN",
        "doc_name": "Permanent Account Number Card",
        "holder_name": "Demo User",
        "aadhaar": "111122223333",
        "issue_date": "2020-01-01",
        "issuing_authority": "Income Tax Department, Government of India",
        "status": "Active",
        "doc_number": "DEMO12345X"
    }
}

# Document types available in DigiLocker
DOCUMENT_TYPES = {
    "PAN": {
        "name": "PAN Card",
        "issuer": "Income Tax Department",
        "icon": "credit-card",
        "color": "#1a365d"
    },
    "DRIVING_LICENSE": {
        "name": "Driving License",
        "issuer": "Transport Department",
        "icon": "car",
        "color": "#2d3748"
    },
    "VEHICLE_RC": {
        "name": "Vehicle Registration",
        "issuer": "Regional Transport Office",
        "icon": "truck",
        "color": "#285e61"
    },
    "AADHAAR": {
        "name": "Aadhaar Card",
        "issuer": "UIDAI",
        "icon": "fingerprint",
        "color": "#f56500"
    },
    "CLASS_10_MARKSHEET": {
        "name": "Class X Marksheet",
        "issuer": "Education Board",
        "icon": "file-text",
        "color": "#553c9a"
    },
    "CLASS_12_MARKSHEET": {
        "name": "Class XII Marksheet",
        "issuer": "Education Board",
        "icon": "file-text",
        "color": "#744210"
    },
    "VOTER_ID": {
        "name": "Voter ID Card",
        "issuer": "Election Commission",
        "icon": "check-square",
        "color": "#22543d"
    }
}


def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))


def mask_aadhaar(aadhaar: str) -> str:
    """Mask Aadhaar number for display (XXXX XXXX 1234)"""
    if len(aadhaar) == 12:
        return f"XXXX XXXX {aadhaar[-4:]}"
    return aadhaar


def mask_phone(phone: str) -> str:
    """Mask phone number for display (XXXXXX7890)"""
    if len(phone) >= 10:
        return f"XXXXXX{phone[-4:]}"
    return phone


def get_user_by_aadhaar(aadhaar: str):
    """Get user data by Aadhaar number"""
    return MOCK_USERS.get(aadhaar.replace(" ", ""))


def get_user_documents(aadhaar: str):
    """Get all documents linked to an Aadhaar number"""
    aadhaar = aadhaar.replace(" ", "")
    documents = []
    
    for doc_id, doc in MOCK_DOCUMENTS.items():
        if doc.get("aadhaar") == aadhaar:
            documents.append({
                "doc_id": doc_id,
                **doc
            })
    
    return documents


def verify_document(doc_number: str):
    """Verify a document by its number"""
    return MOCK_DOCUMENTS.get(doc_number)
