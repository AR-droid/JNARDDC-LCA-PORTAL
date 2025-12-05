# DigiLocker Mock Authentication

A realistic simulation of DigiLocker authentication for **SIH2025 hackathon demo**.

## 🔐 Features

- **Aadhaar-based Authentication** - Enter 12-digit Aadhaar, receive OTP
- **OTP Verification** - 6-digit OTP with expiry and retry limits
- **Document Fetch** - PAN Card, Driving License, Vehicle RC, Marksheets
- **Identity Verification** - Generate KYC verification certificates
- **100% Realistic UI** - Looks exactly like real DigiLocker

---

## 📁 Files

```
Digi-Locker/
├── __init__.py           # Module exports
├── mock_data.py          # Mock users & documents database
├── digilocker_api.py     # Core API logic
├── routes.py             # Flask blueprint (optional standalone)
└── README.md             # This file
```

---

## 🚀 Quick Start

### Demo Credentials

| Aadhaar Number | Name | OTP |
|----------------|------|-----|
| `1111 2222 3333` | Demo User | `123456` |
| `1234 5678 9012` | Rahul Sharma | Check console |
| `9876 5432 1098` | Priya Patel | Check console |

> **Note:** OTP `123456` works for ALL users in demo mode!

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/digilocker/auth/initiate` | Send OTP to Aadhaar |
| POST | `/api/v1/digilocker/auth/verify-otp` | Verify OTP & login |
| POST | `/api/v1/digilocker/auth/resend-otp` | Resend OTP |
| POST | `/api/v1/digilocker/logout` | Logout |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/digilocker/profile` | Get user profile |
| GET | `/api/v1/digilocker/documents` | List all documents |
| GET | `/api/v1/digilocker/documents/:id` | Get document details |
| POST | `/api/v1/digilocker/verify-identity` | Generate KYC certificate |

---

## 📝 Usage Examples

### 1. Initiate Authentication

```bash
curl -X POST http://localhost:5000/api/v1/digilocker/auth/initiate \
  -H "Content-Type: application/json" \
  -d '{"aadhaar": "111122223333"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to mobile XXXXXX7890",
  "masked_mobile": "XXXXXX7890",
  "demo_otp": "123456"
}
```

### 2. Verify OTP

```bash
curl -X POST http://localhost:5000/api/v1/digilocker/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"aadhaar": "111122223333", "otp": "123456"}'
```

**Response:**
```json
{
  "success": true,
  "token": "abc123...",
  "user": {
    "name": "Demo User",
    "masked_aadhaar": "XXXX XXXX 3333",
    "verified": true
  }
}
```

### 3. Get Documents

```bash
curl http://localhost:5000/api/v1/digilocker/documents \
  -H "X-DigiLocker-Token: abc123..."
```

---

## 🎨 Frontend Integration

The DigiLocker login component is already integrated into the login page!

1. **Start backend:** `cd backend && py app.py`
2. **Start frontend:** `cd frontend && npm run dev`
3. Go to **Login Page** → Click "**Sign in with DigiLocker**"
4. Enter `1111 2222 3333` as Aadhaar
5. Enter `123456` as OTP

---

## 📱 Mock Documents Available

For user `123456789012` (Rahul Sharma):
- **PAN Card:** ABCDE1234F
- **Driving License:** DL-1420110012345
- **Vehicle RC:** DL01AB1234
- **Class X Marksheet:** CBSE-2010-123456
- **Class XII Marksheet:** CBSE-2012-789012

---

## ⚠️ Important Notes

1. **This is a MOCK/DEMO** - No real Aadhaar verification happens
2. **For SIH2025 only** - Judges understand this is prototype
3. **Real DigiLocker** requires partner registration (not available for students)

---

## 🔗 Real DigiLocker (For Future)

If your organization wants real integration:
1. Register at https://partners.digitallocker.gov.in/
2. Get API credentials
3. Replace mock API calls with real endpoints

---

**Created for JNARDDC LCA Project** | SIH2025 Hackathon
