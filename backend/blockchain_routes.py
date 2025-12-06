"""
Flask routes for Blockchain Carbon Credit System
"""

from flask import Blueprint, request, jsonify

try:
    from blockchain_mock import get_blockchain, CarbonTokenCalculator
    BLOCKCHAIN_AVAILABLE = True
except ImportError:
    BLOCKCHAIN_AVAILABLE = False
    print("⚠️  Blockchain module not found")

# Create Blueprint
blockchain_bp = Blueprint('blockchain', __name__, url_prefix='/api/v1/blockchain')


@blockchain_bp.route('/wallet/connect', methods=['POST'])
def connect_wallet():
    """Connect wallet for a user"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    data = request.get_json() or {}
    user_id = data.get('user_id') or request.headers.get('X-User-Id')
    
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    blockchain = get_blockchain()
    wallet = blockchain.get_or_create_wallet(user_id)
    connection_info = wallet.connect()
    
    return jsonify(connection_info)


@blockchain_bp.route('/wallet/disconnect', methods=['POST'])
def disconnect_wallet():
    """Disconnect wallet"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    data = request.get_json() or {}
    user_id = data.get('user_id') or request.headers.get('X-User-Id')
    
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    blockchain = get_blockchain()
    wallet = blockchain.get_or_create_wallet(user_id)
    wallet.disconnect()
    
    return jsonify({"success": True, "message": "Wallet disconnected"})


@blockchain_bp.route('/wallet/info', methods=['GET'])
def get_wallet_info():
    """Get wallet information"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    user_id = request.args.get('user_id') or request.headers.get('X-User-Id')
    
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    blockchain = get_blockchain()
    wallet_info = blockchain.get_wallet_info(user_id)
    
    return jsonify(wallet_info)


@blockchain_bp.route('/tokens/calculate', methods=['POST'])
def calculate_tokens():
    """Calculate tokens for a project"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    data = request.get_json() or {}
    
    calculator = CarbonTokenCalculator()
    result = calculator.calculate_tokens(data)
    
    return jsonify(result)


@blockchain_bp.route('/tokens/mint', methods=['POST'])
def mint_tokens():
    """Mint carbon tokens for a project"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    data = request.get_json() or {}
    user_id = data.get('user_id') or request.headers.get('X-User-Id')
    amount = data.get('amount')
    project_name = data.get('project_name', 'Unnamed Project')
    
    if not user_id or not amount:
        return jsonify({"error": "User ID and amount required"}), 400
    
    blockchain = get_blockchain()
    result = blockchain.mint_tokens(user_id, amount, project_name)
    
    return jsonify(result)


@blockchain_bp.route('/tokens/info', methods=['GET'])
def get_token_info():
    """Get token contract information"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    blockchain = get_blockchain()
    token_info = blockchain.get_token_info()
    
    return jsonify(token_info)


@blockchain_bp.route('/marketplace', methods=['GET'])
def get_marketplace():
    """Get marketplace listings"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    blockchain = get_blockchain()
    marketplace_data = blockchain.get_marketplace_data()
    
    return jsonify(marketplace_data)


@blockchain_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """Get user's transactions"""
    if not BLOCKCHAIN_AVAILABLE:
        return jsonify({"error": "Blockchain not available"}), 503
    
    user_id = request.args.get('user_id') or request.headers.get('X-User-Id')
    
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    blockchain = get_blockchain()
    wallet = blockchain.get_or_create_wallet(user_id)
    
    return jsonify({
        "transactions": wallet.transactions,
        "total": len(wallet.transactions)
    })
