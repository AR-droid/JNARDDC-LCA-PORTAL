"""
DigiLocker Mock Authentication Module
=====================================
A realistic simulation of DigiLocker authentication for SIH2025 demo.

Features:
- Aadhaar-based authentication simulation
- Document verification (PAN, Driving License, etc.)
- OTP verification flow
- eSign simulation

Author: SIH2025-AXEFORTUNE Team
"""

from .digilocker_api import DigiLockerAPI, digilocker_api
from .mock_data import MOCK_USERS, MOCK_DOCUMENTS

__all__ = [
    'DigiLockerAPI',
    'digilocker_api',
    'MOCK_USERS',
    'MOCK_DOCUMENTS'
]

__version__ = '1.0.0'
