"""
Mock Blockchain Carbon Credit System
Simulates Web3 wallet connection and ERC-20 token minting
No real blockchain or API keys needed - perfect for SIH demo
"""

import json
import random
import hashlib
from datetime import datetime
from typing import Dict, List, Optional


class MockWallet:
    """Simulates a Web3 wallet (like MetaMask)"""
    
    def __init__(self, address: str = None):
        self.address = address or self._generate_address()
        self.balance_eth = round(random.uniform(0.5, 5.0), 4)
        self.balance_mct = 0  # MetalCarbon Tokens
        self.transactions = []
        self.connected = False
    
    def _generate_address(self) -> str:
        """Generate realistic Ethereum address"""
        random_hex = hashlib.sha256(str(random.random()).encode()).hexdigest()
        return f"0x{random_hex[:40]}"
    
    def connect(self) -> Dict:
        """Simulate wallet connection"""
        self.connected = True
        return {
            "success": True,
            "address": self.address,
            "balance_eth": self.balance_eth,
            "balance_mct": self.balance_mct,
            "network": "Polygon Mumbai Testnet",
            "chain_id": 80001
        }
    
    def disconnect(self):
        """Disconnect wallet"""
        self.connected = False
    
    def add_tokens(self, amount: float, project_name: str):
        """Add MCT tokens to wallet"""
        self.balance_mct += amount
        tx_hash = f"0x{hashlib.sha256(f'{self.address}{amount}{datetime.now()}'.encode()).hexdigest()}"
        
        transaction = {
            "hash": tx_hash,
            "from": "0x0000000000000000000000000000000000000000",  # Mint address
            "to": self.address,
            "amount": amount,
            "token": "MCT",
            "project": project_name,
            "timestamp": datetime.now().isoformat(),
            "status": "confirmed",
            "block_number": random.randint(10000000, 11000000)
        }
        
        self.transactions.append(transaction)
        return transaction


class CarbonTokenCalculator:
    """Calculate carbon tokens based on LCA results"""
    
    # Token conversion rates (1 token = 1 kg CO2 saved)
    TOKEN_RATE = 1.0
    
    # Material CO2 savings (virgin vs recycled, kg CO2/kg material)
    MATERIAL_SAVINGS = {
        'aluminium': 10.0,  # Using recycled saves 10 kg CO2 per kg
        'steel': 1.8,
        'copper': 3.5,
        'plastic': 2.1,
        'lithium': 8.5,
        'nickel': 7.2,
        'cobalt': 9.1
    }
    
    @staticmethod
    def calculate_tokens(project_data: Dict) -> Dict:
        """
        Calculate carbon tokens earned based on project LCA
        
        Args:
            project_data: {
                'materials': [{'name': 'aluminium', 'quantity': 100, 'recycled_content': 0.5}],
                'gwp_saved': 500  # Optional: direct CO2 savings in kg
            }
        """
        total_co2_saved = 0
        material_breakdown = []
        
        # Calculate from materials
        materials = project_data.get('materials', [])
        for material in materials:
            material_name = material['name'].lower()
            quantity = material['quantity']
            recycled_content = material.get('recycled_content', 0)
            
            # Get savings rate for this material
            savings_rate = CarbonTokenCalculator.MATERIAL_SAVINGS.get(material_name, 2.0)
            
            # Calculate CO2 saved
            co2_saved = quantity * recycled_content * savings_rate
            total_co2_saved += co2_saved
            
            material_breakdown.append({
                'material': material_name,
                'quantity': quantity,
                'recycled_content': recycled_content * 100,
                'co2_saved': round(co2_saved, 2),
                'tokens_earned': round(co2_saved * CarbonTokenCalculator.TOKEN_RATE, 2)
            })
        
        # Add direct GWP savings if provided
        if 'gwp_saved' in project_data:
            total_co2_saved += project_data['gwp_saved']
        
        # Calculate tokens
        tokens_earned = total_co2_saved * CarbonTokenCalculator.TOKEN_RATE
        
        # Calculate USD value (mock price: 1 MCT = $0.50)
        token_price_usd = 0.50
        usd_value = tokens_earned * token_price_usd
        
        return {
            'co2_saved_kg': round(total_co2_saved, 2),
            'tokens_earned': round(tokens_earned, 2),
            'usd_value': round(usd_value, 2),
            'material_breakdown': material_breakdown,
            'token_symbol': 'MCT',
            'token_name': 'MetalCarbon Token'
        }


class MockBlockchain:
    """Simulates blockchain operations"""
    
    def __init__(self):
        self.wallets = {}  # address -> MockWallet
        self.total_supply = 0
        self.transactions = []
        self.contract_address = "0x" + hashlib.sha256(b"MetalCarbonToken").hexdigest()[:40]
    
    def get_or_create_wallet(self, user_id: str) -> MockWallet:
        """Get existing wallet or create new one for user"""
        if user_id not in self.wallets:
            self.wallets[user_id] = MockWallet()
        return self.wallets[user_id]
    
    def mint_tokens(self, user_id: str, amount: float, project_name: str) -> Dict:
        """Mint new carbon tokens to user's wallet"""
        wallet = self.get_or_create_wallet(user_id)
        
        # Mint tokens
        transaction = wallet.add_tokens(amount, project_name)
        self.total_supply += amount
        self.transactions.append(transaction)
        
        return {
            "success": True,
            "transaction": transaction,
            "new_balance": wallet.balance_mct,
            "message": f"Successfully minted {amount} MCT tokens!"
        }
    
    def get_wallet_info(self, user_id: str) -> Dict:
        """Get wallet information"""
        wallet = self.get_or_create_wallet(user_id)
        
        return {
            "address": wallet.address,
            "balance_eth": wallet.balance_eth,
            "balance_mct": wallet.balance_mct,
            "connected": wallet.connected,
            "network": "Polygon Mumbai Testnet",
            "transactions": wallet.transactions[-10:]  # Last 10 transactions
        }
    
    def get_token_info(self) -> Dict:
        """Get token contract information"""
        return {
            "name": "MetalCarbon Token",
            "symbol": "MCT",
            "contract_address": self.contract_address,
            "total_supply": self.total_supply,
            "decimals": 18,
            "network": "Polygon Mumbai",
            "chain_id": 80001,
            "token_price_usd": 0.50,
            "total_holders": len(self.wallets)
        }
    
    def get_marketplace_data(self) -> Dict:
        """Get mock marketplace data"""
        return {
            "listings": [
                {
                    "id": 1,
                    "seller": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                    "amount": 500,
                    "price_per_token": 0.52,
                    "total_price": 260,
                    "status": "active"
                },
                {
                    "id": 2,
                    "seller": "0x123d35Cc6634C0532925a3b844Bc9e7595f0abc",
                    "amount": 1000,
                    "price_per_token": 0.48,
                    "total_price": 480,
                    "status": "active"
                },
                {
                    "id": 3,
                    "seller": "0x456d35Cc6634C0532925a3b844Bc9e7595f0def",
                    "amount": 250,
                    "price_per_token": 0.51,
                    "total_price": 127.5,
                    "status": "active"
                }
            ],
            "total_volume": 12500,
            "average_price": 0.50,
            "active_listings": 3
        }


# Singleton instance
_blockchain = None

def get_blockchain() -> MockBlockchain:
    """Get or create blockchain instance"""
    global _blockchain
    if _blockchain is None:
        _blockchain = MockBlockchain()
    return _blockchain


# Example usage
if __name__ == "__main__":
    # Initialize blockchain
    blockchain = get_blockchain()
    
    # Create wallet for user
    user_id = "user_123"
    wallet = blockchain.get_or_create_wallet(user_id)
    
    # Connect wallet
    connection = wallet.connect()
    print("Wallet Connected:", json.dumps(connection, indent=2))
    
    # Calculate tokens for a project
    project_data = {
        'materials': [
            {'name': 'aluminium', 'quantity': 100, 'recycled_content': 0.8},
            {'name': 'steel', 'quantity': 200, 'recycled_content': 0.5},
            {'name': 'copper', 'quantity': 50, 'recycled_content': 0.7}
        ]
    }
    
    calc = CarbonTokenCalculator()
    result = calc.calculate_tokens(project_data)
    print("\nTokens Calculated:", json.dumps(result, indent=2))
    
    # Mint tokens
    mint_result = blockchain.mint_tokens(user_id, result['tokens_earned'], "Battery Project Alpha")
    print("\nTokens Minted:", json.dumps(mint_result, indent=2))
    
    # Get wallet info
    wallet_info = blockchain.get_wallet_info(user_id)
    print("\nWallet Info:", json.dumps(wallet_info, indent=2))
    
    # Get token info
    token_info = blockchain.get_token_info()
    print("\nToken Info:", json.dumps(token_info, indent=2))
