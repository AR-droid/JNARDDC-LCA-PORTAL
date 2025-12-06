# Mock Blockchain Carbon Credit System

A realistic simulation of Web3 wallet integration and ERC-20 carbon token minting **without needing real blockchain or API keys**. Perfect for SIH2025 demo!

## 🎯 Features

- ✅ **Mock Wallet Connection** - Simulates MetaMask/WalletConnect
- ✅ **Carbon Token Minting** - ERC-20 MetalCarbon Tokens (MCT)
- ✅ **Realistic Addresses** - Generates Ethereum-style addresses
- ✅ **Transaction History** - Complete tx hashes & block numbers
- ✅ **Token Marketplace** - Mock trading platform
- ✅ **Automatic Calculation** - CO2 savings → Tokens

## 💰 Token Economics

**MetalCarbon Token (MCT)**
- Symbol: `MCT`
- Standard: ERC-20 (simulated)
- Rate: 1 MCT = 1 kg CO2 saved
- Price: $0.50 USD per token
- Network: Polygon Mumbai Testnet (simulated)

## 🔢 CO2 Savings Rates

| Material | CO2 Saved (kg/kg recycled) |
|----------|----------------------------|
| Aluminium | 10.0 |
| Lithium | 8.5 |
| Cobalt | 9.1 |
| Nickel | 7.2 |
| Copper | 3.5 |
| Steel | 1.8 |
| Plastic | 2.1 |

**Example:** Using 100kg of 80% recycled aluminium saves:
```
100 kg × 0.8 × 10.0 = 800 kg CO2
= 800 MCT tokens
= $400 USD value
```

## 📡 API Endpoints

### Wallet Management

**POST** `/api/v1/blockchain/wallet/connect`
```json
{
  "user_id": "user_123"
}
```

**GET** `/api/v1/blockchain/wallet/info?user_id=user_123`

---

### Token Operations

**POST** `/api/v1/blockchain/tokens/calculate`
```json
{
  "materials": [
    {
      "name": "aluminium",
      "quantity": 100,
      "recycled_content": 0.8
    }
  ]
}
```

**POST** `/api/v1/blockchain/tokens/mint`
```json
{
  "user_id": "user_123",
  "amount": 800,
  "project_name": "Battery Project"
}
```

**GET** `/api/v1/blockchain/tokens/info`

---

### Marketplace

**GET** `/api/v1/blockchain/marketplace`

**GET** `/api/v1/blockchain/transactions?user_id=user_123`

## 🎨 Frontend Integration

### Dashboard Widget Example
```tsx
<div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-6 text-white">
  <div className="flex items-center gap-3 mb-4">
    <Wallet className="w-8 h-8" />
    <div>
      <h3 className="text-lg font-semibold">Your Carbon Credits</h3>
      <p className="text-green-200 text-sm">MetalCarbon Tokens (MCT)</p>
    </div>
  </div>
  
  <div className="flex items-baseline gap-2 mb-2">
    <span className="text-4xl font-bold">{balance.toLocaleString()}</span>
    <span className="text-xl">MCT</span>
  </div>
  
  <div className="text-green-200 text-sm mb-4">
    Worth: ${(balance * 0.50).toLocaleString()} USD
  </div>
  
  <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg">
    View Marketplace
  </button>
</div>
```

## 🚀 How It Works

### 1. User Completes LCA
```
Project: "EV Battery Pack"
Materials:
  - 100kg aluminium (80% recycled)
  - 50kg copper (70% recycled)
  - 200kg steel (50% recycled)
```

### 2. System Calculates CO2 Savings
```python
calculator = CarbonTokenCalculator()
result = calculator.calculate_tokens(project_data)
# Returns: 1,302 kg CO2 saved
```

### 3. Tokens Auto-Minted
```python
blockchain.mint_tokens(user_id, 1302, "EV Battery Pack")
# User wallet: +1,302 MCT tokens
# Value: $651 USD
```

### 4. User Can Trade
- View marketplace listings
- Sell tokens to other companies
- Transfer to other wallets

## 🎭 Demo Credentials

**Wallet Address (auto-generated):**
```
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Network:**
```
Polygon Mumbai Testnet (Chain ID: 80001)
```

**Initial Balance:**
- ETH: 2.5 (for gas fees - mock)
- MCT: 0 (earned through projects)

## ⚡ Installation

Already integrated into main Flask app!

Just ensure the blockchain module is imported:
```python
from blockchain.routes import blockchain_bp
app.register_blueprint(blockchain_bp)
```

## 🎯 For Judges (SIH Demo)

**Key Points to Highlight:**

1. **Gamification of Sustainability**
   - Users earn money for being green
   - Real economic incentive

2. **Blockchain Integration**
   - Web3-ready infrastructure
   - Token-based reward system

3. **Marketplace Potential**
   - Companies can trade carbon credits
   - Creates circular economy

4. **No Real Blockchain Needed**
   - Works offline
   - No gas fees during demo
   - Realistic simulation

## 📊 Sample Data Flow

```
User Login
    ↓
Create Project (LCA)
    ↓
Add Materials (with recycled %)
    ↓
Calculate Environmental Impact
    ↓
System Calculates CO2 Saved
    ↓
Auto-Mint MCT Tokens
    ↓
Show in Dashboard Wallet
    ↓
User Can Trade in Marketplace
```

## 🔐 Security Note

This is a **MOCK SYSTEM** for demonstration purposes:
- No real cryptocurrency
- No real blockchain transactions
- No private keys needed
- Perfect for hackathon demo

For production, you would integrate:
- Real Alchemy API
- WalletConnect SDK
- Deployed ERC-20 contract
- Polygon mainnet

---

**Built for JNARDDC LCA Project** | SIH2025 Hackathon
**Making Sustainability Profitable** 🌱💰
