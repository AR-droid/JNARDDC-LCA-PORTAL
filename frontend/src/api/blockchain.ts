/**
 * Mock Blockchain API Client
 * Simulates Web3 wallet and carbon token operations
 */

const API_BASE = 'http://localhost:5000/api/v1/blockchain';

export interface WalletInfo {
  address: string;
  balance_eth: number;
  balance_mct: number;
  connected: boolean;
  network: string;
  transactions: Transaction[];
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  token: string;
  project: string;
  timestamp: string;
  status: string;
  block_number: number;
}

export interface TokenCalculation {
  co2_saved_kg: number;
  tokens_earned: number;
  usd_value: number;
  material_breakdown: MaterialBreakdown[];
  token_symbol: string;
  token_name: string;
}

export interface MaterialBreakdown {
  material: string;
  quantity: number;
  recycled_content: number;
  co2_saved: number;
  tokens_earned: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  contract_address: string;
  total_supply: number;
  decimals: number;
  network: string;
  chain_id: number;
  token_price_usd: number;
  total_holders: number;
}

export interface MarketplaceListing {
  id: number;
  seller: string;
  amount: number;
  price_per_token: number;
  total_price: number;
  status: string;
}

export interface MarketplaceData {
  listings: MarketplaceListing[];
  total_volume: number;
  average_price: number;
  active_listings: number;
}

/**
 * Connect wallet for a user
 */
export async function connectWallet(userId: string): Promise<WalletInfo> {
  const response = await fetch(`${API_BASE}/wallet/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to connect wallet');
  }
  
  return response.json();
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet(userId: string): Promise<void> {
  await fetch(`${API_BASE}/wallet/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
}

/**
 * Get wallet information
 */
export async function getWalletInfo(userId: string): Promise<WalletInfo> {
  const response = await fetch(`${API_BASE}/wallet/info?user_id=${userId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get wallet info');
  }
  
  return response.json();
}

/**
 * Calculate tokens for project materials
 */
export async function calculateTokens(materials: any[]): Promise<TokenCalculation> {
  const response = await fetch(`${API_BASE}/tokens/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ materials }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to calculate tokens');
  }
  
  return response.json();
}

/**
 * Mint carbon tokens to user wallet
 */
export async function mintTokens(
  userId: string,
  amount: number,
  projectName: string
): Promise<any> {
  const response = await fetch(`${API_BASE}/tokens/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount,
      project_name: projectName,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to mint tokens');
  }
  
  return response.json();
}

/**
 * Get token contract information
 */
export async function getTokenInfo(): Promise<TokenInfo> {
  const response = await fetch(`${API_BASE}/tokens/info`);
  
  if (!response.ok) {
    throw new Error('Failed to get token info');
  }
  
  return response.json();
}

/**
 * Get marketplace data
 */
export async function getMarketplace(): Promise<MarketplaceData> {
  const response = await fetch(`${API_BASE}/marketplace`);
  
  if (!response.ok) {
    throw new Error('Failed to get marketplace data');
  }
  
  return response.json();
}

/**
 * Get user transactions
 */
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE}/transactions?user_id=${userId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get transactions');
  }
  
  const data = await response.json();
  return data.transactions || [];
}
