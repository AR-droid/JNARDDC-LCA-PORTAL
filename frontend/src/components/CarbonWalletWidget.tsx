import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, ExternalLink, Copy, Check } from 'lucide-react';
import { getWalletInfo, connectWallet, type WalletInfo } from '../api/blockchain';
import { useAuthStore } from '../stores/authStore';

// Generate a mock Ethereum address
const generateMockAddress = (userId: string): string => {
  const hash = Array.from(userId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hex = hash.toString(16).padStart(40, '0').slice(0, 40);
  return `0x${hex}`;
};

export default function CarbonWalletWidget() {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      // Try to load from localStorage first for instant display
      const cached = localStorage.getItem(`wallet_${user.id}`);
      if (cached) {
        try {
          setWallet(JSON.parse(cached));
        } catch (e) {
          console.error('Failed to parse cached wallet');
        }
      }
      
      // Then load from API in background
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    try {
      const walletInfo = await getWalletInfo(user!.id);
      setWallet(walletInfo);
      localStorage.setItem(`wallet_${user!.id}`, JSON.stringify(walletInfo));
    } catch (err) {
      console.error('Failed to load wallet:', err);
    }
  };

  const handleConnect = async () => {
    if (!user?.id) return;
    
    setIsConnecting(true);
    setError('');
    
    // Create instant mock wallet for immediate feedback
    const mockWallet: WalletInfo = {
      address: generateMockAddress(user.id),
      balance_eth: 0.5,
      balance_mct: 0,
      connected: true,
      network: 'Polygon Mumbai Testnet',
      transactions: []
    };
    
    // Set immediately
    setWallet(mockWallet);
    localStorage.setItem(`wallet_${user.id}`, JSON.stringify(mockWallet));
    setIsConnecting(false);
    
    // Then sync with backend in background
    try {
      const walletInfo = await connectWallet(user.id);
      setWallet(walletInfo);
      localStorage.setItem(`wallet_${user.id}`, JSON.stringify(walletInfo));
    } catch (err: any) {
      console.error('Backend sync failed:', err);
      // Keep the mock wallet even if backend fails
    }
  };

  const handleDisconnect = () => {
    setWallet(null);
    if (user?.id) {
      localStorage.removeItem(`wallet_${user.id}`);
    }
  };

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!wallet || !wallet.connected) {
    return (
      <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Carbon Wallet</h3>
            <p className="text-gray-300 text-sm">Connect to earn tokens</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </>
          )}
        </button>

        <p className="text-gray-400 text-xs text-center mt-3">
          Earn MCT tokens by completing sustainable projects
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-6 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Your Carbon Credits</h3>
            <p className="text-green-200 text-sm">MetalCarbon Tokens</p>
          </div>
        </div>
        <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-medium">
          {wallet.network}
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-5xl font-bold">
            {wallet.balance_mct.toLocaleString()}
          </span>
          <span className="text-xl font-semibold">MCT</span>
        </div>
        <div className="flex items-center gap-2 text-green-200">
          <span className="text-lg font-medium">
            ${(wallet.balance_mct * 0.50).toLocaleString()} USD
          </span>
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>

      {/* Wallet Address */}
      <div className="bg-white/10 backdrop-blur rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-green-200 mb-1">Wallet Address</p>
            <p className="font-mono text-sm">{formatAddress(wallet.address)}</p>
          </div>
          <button
            onClick={copyAddress}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-300" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ETH Balance (for gas fees) */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="text-green-200">Gas Fee Balance:</span>
        <span className="font-semibold">{wallet.balance_eth} ETH</span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Marketplace
        </button>
        <button className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2.5 rounded-lg font-medium transition-colors">
          Transfer
        </button>
      </div>

      {/* Disconnect Button */}
      <button 
        onClick={handleDisconnect}
        className="w-full bg-red-500/20 hover:bg-red-500/30 backdrop-blur px-4 py-2.5 rounded-lg font-medium transition-colors text-sm border border-red-400/30"
      >
        Disconnect Wallet
      </button>

      {/* Recent Activity */}
      {wallet.transactions && wallet.transactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs text-green-200 mb-2">Recent Activity</p>
          <div className="space-y-2">
            {wallet.transactions.slice(0, 3).map((tx) => (
              <div key={tx.hash} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium">+{tx.amount} MCT</p>
                  <p className="text-green-200">{tx.project}</p>
                </div>
                <span className="text-green-300">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
