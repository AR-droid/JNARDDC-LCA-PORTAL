import { useState, useEffect } from 'react';
import { Coins, TrendingUp, History, AlertCircle, CheckCircle, Wallet as WalletIcon } from 'lucide-react';
import { connectWallet, disconnectWallet, getWalletInfo, getTransactions } from '../api/blockchain';
import type { WalletInfo, Transaction } from '../api/blockchain';
import { useAuthStore } from '../stores/authStore';

const WalletPage = () => {
  const { user } = useAuthStore();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
    }
  }, [user?.id]);

  const loadWalletData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const info = await getWalletInfo(user.id.toString());
      setWalletInfo(info);
      
      if (info.address) {
        const txs = await getTransactions(user.id.toString());
        setTransactions(txs);
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
      setError('Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    if (!user?.id) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      await connectWallet(user.id.toString());
      await loadWalletData();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (!user?.id) return;
    
    try {
      await disconnectWallet(user.id.toString());
      setWalletInfo(null);
      setTransactions([]);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError('Failed to disconnect wallet');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string | number) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <WalletIcon className="w-8 h-8 text-blue-600" />
            Carbon Wallet
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your Mock Carbon Tokens (MCT) and view transaction history
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {!walletInfo?.address ? (
          /* Connect Wallet Section */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <WalletIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Connect your wallet to view your Mock Carbon Token balance and transaction history
            </p>
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          /* Wallet Connected Section */
          <div className="space-y-6">
            {/* Wallet Info Card */}
            <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Wallet Address</p>
                  <p className="text-xl font-mono">{formatAddress(walletInfo.address)}</p>
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5" />
                    <p className="text-sm font-medium">MCT Balance</p>
                  </div>
                  <p className="text-3xl font-bold">{walletInfo.balance_mct.toFixed(2)}</p>
                  <p className="text-blue-100 text-sm mt-1">Mock Carbon Tokens</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5" />
                    <p className="text-sm font-medium">ETH Balance</p>
                  </div>
                  <p className="text-3xl font-bold">{walletInfo.balance_eth.toFixed(4)}</p>
                  <p className="text-blue-100 text-sm mt-1">Ethereum (Test)</p>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <History className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Transaction History
                </h2>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No transactions yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Your transaction history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.hash}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {tx.token} Transaction
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(tx.timestamp)}
                            </span>
                          </div>
                          {tx.project && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Project: <span className="font-medium">{tx.project}</span>
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            From: <span className="font-mono">{formatAddress(tx.from)}</span>
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            To: <span className="font-mono">{formatAddress(tx.to)}</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                            Hash: {formatAddress(tx.hash)} • Block: {tx.block_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {tx.amount.toFixed(2)} {tx.token}
                          </p>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            tx.status === 'confirmed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
