import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { Chain } from 'wagmi/chains'
import { useState, useRef, useCallback, useEffect } from 'react'

// Get chain configuration from wagmi.ts
import { config } from '../wagmi'

// Define supported chains
const SUPPORTED_CHAINS = config.chains;

// Define eduChain (Open Campus Codex)
const EDU_CHAIN = SUPPORTED_CHAINS.find(chain => chain.id === 656476);

// Chain emoji mapping
const CHAIN_EMOJI = {
  1: '🌐', // Ethereum
  11155111: '🧪', // Sepolia
  137: '💜', // Polygon
  10: '🔴', // Optimism
  42161: '🔵', // Arbitrum
  8453: '🟢', // Base
  56: '🟡', // BSC
  656476: '🎓', // Open Campus Codex
  defaultEmoji: '🔗' // Default emoji for unknown chains
} as const;

// Get chain emoji helper
const getChainEmoji = (chainId: number): string => {
  return chainId in CHAIN_EMOJI 
    ? CHAIN_EMOJI[chainId as keyof typeof CHAIN_EMOJI] 
    : CHAIN_EMOJI.defaultEmoji;
};

interface NetworkSwitchStatus {
  message: string;
  isError: boolean;
}

// Helper to detect if device is mobile
const isMobile = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Helper to detect if MetaMask is installed
const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
};

// Helper to check if connector is ready
const isConnectorReady = (connector: any) => {
  if (isMobile()) {
    if (connector.id === 'injected') {
      return false; // Don't show injected on mobile
    }
    if (connector.id === 'metaMask') {
      return isMetaMaskInstalled();
    }
    return true; // Other connectors (like WalletConnect) are always ready on mobile
  }
  
  // Desktop behavior
  if (connector.id === 'injected') {
    return typeof window !== 'undefined' && !!window.ethereum;
  }
  return true;
};

export default function ConnectWallet() {
  // Wagmi hooks
  const account = useAccount()
  const { connectors, connect, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  // Local state
  const [showNetworks, setShowNetworks] = useState(false)
  const [switchStatus, setSwitchStatus] = useState<NetworkSwitchStatus | null>(null)
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false)
  const networkDropdownRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom')
  const [showMobileWalletOptions, setShowMobileWalletOptions] = useState(false)
  const [showEduChainPrompt, setShowEduChainPrompt] = useState(false)

  // Calculate dropdown position based on available space
  useEffect(() => {
    const calculatePosition = () => {
      if (networkDropdownRef.current && modalRef.current) {
        const buttonRect = networkDropdownRef.current.getBoundingClientRect();
        const modalRect = modalRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Space below button
        const spaceBelow = viewportHeight - buttonRect.bottom;
        // Space above button
        const spaceAbove = buttonRect.top - modalRect.top;
        
        // If space below is less than 240px and space above is greater, position above
        const newPosition = spaceBelow < 240 && spaceAbove > 240 ? 'top' : 'bottom';
        setDropdownPosition(newPosition);
      }
    };

    if (showNetworks) {
      calculatePosition();
    }

    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [showNetworks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target as Node)) {
        setShowNetworks(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user needs to be prompted for eduChain switch on connect
  useEffect(() => {
    if (account.isConnected && chainId !== 656476) {
      setShowEduChainPrompt(true);
    } else {
      setShowEduChainPrompt(false);
    }
  }, [account.isConnected, chainId]);

  // Handle mobile deep linking
  const handleMobileWalletConnection = (connector: any) => {
    if (isMobile()) {
      if (connector.id === 'metaMask') {
        if (!isMetaMaskInstalled()) {
          // Open MetaMask in app store with deep link back to dapp
          window.open('https://metamask.app.link/dapp/' + window.location.host);
          return;
        }
        // If MetaMask is installed, connect directly
        connect({ connector });
      } else if (connector.id === 'walletConnect') {
        // Show QR code modal for WalletConnect
        setShowMobileWalletOptions(true);
        connect({ connector });
      } else {
        // For other connectors, try connecting directly
        connect({ connector });
      }
    } else {
      // Desktop behavior - connect directly
      connect({ connector });
    }
  };

  // Clear status message after delay
  const clearStatusMessage = useCallback(() => {
    const timer = setTimeout(() => setSwitchStatus(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Handle network switching
  const handleNetworkSwitch = async (targetChain: Chain) => {
    if (targetChain.id === chainId || isNetworkSwitching) return;

    try {
      setIsNetworkSwitching(true);
      setSwitchStatus({
        message: `Switching to ${targetChain.name}...`,
        isError: false
      });

      // Get the current connector type
      const activeConnector = account.connector;
      const chainIdHex = `0x${targetChain.id.toString(16)}`;
      
      if (activeConnector?.id === 'walletConnect') {
        // For WalletConnect, use wagmi's switchChainAsync
        await switchChainAsync({ chainId: targetChain.id });
      } else {
        // For other wallets (MetaMask, etc.)
        if (!window.ethereum) {
          if (isMobile()) {
            if (activeConnector?.id === 'metaMask') {
              window.open('https://metamask.app.link/dapp/' + window.location.host);
              throw new Error('Please install MetaMask to switch networks');
            } else {
              // For other mobile wallets, try using wagmi's switchChainAsync
              await switchChainAsync({ chainId: targetChain.id });
            }
          } else {
            throw new Error('No wallet found! Please install MetaMask or use WalletConnect');
          }
          return;
        }

        try {
          await switchChainAsync({ chainId: targetChain.id });
        } catch (switchError: any) {
          if (switchError.code === 4902 || switchError.code === -32603) {
            try {
              const provider = window.ethereum as any;
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: chainIdHex,
                    chainName: targetChain.name,
                    nativeCurrency: {
                      name: targetChain.nativeCurrency.name,
                      symbol: targetChain.nativeCurrency.symbol,
                      decimals: targetChain.nativeCurrency.decimals,
                    },
                    rpcUrls: [...targetChain.rpcUrls.default.http],
                    blockExplorerUrls: targetChain.blockExplorers 
                      ? [targetChain.blockExplorers.default.url]
                      : undefined,
                  },
                ],
              });
            } catch (addError: any) {
              throw new Error(addError.message || 'Failed to add network');
            }
          } else {
            throw switchError;
          }
        }
      }

      setSwitchStatus({
        message: `Successfully switched to ${targetChain.name}`,
        isError: false
      });
      setShowNetworks(false);
      setShowEduChainPrompt(false);
      clearStatusMessage();
    } catch (error: any) {
      console.error('Network switch failed:', error);
      setSwitchStatus({
        message: error.message || 'Failed to switch network',
        isError: true
      });
      clearStatusMessage();
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get current chain info
  const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  const chainEmoji = getChainEmoji(chainId);

  // Render mobile-specific wallet options
  const renderMobileWalletOptions = () => {
    if (!showMobileWalletOptions) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowMobileWalletOptions(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-gray-800 rounded-xl p-6 w-full max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Connect Wallet</h3>
          <div className="space-y-3">
            {connectors.map((connector) => {
              const isReady = isConnectorReady(connector);
              
              return (
                <button
                  key={connector.uid}
                  onClick={() => handleMobileWalletConnection(connector)}
                  disabled={!isReady}
                  className="w-full flex items-center justify-between p-4 bg-gray-700/50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-white">{connector.name}</span>
                  {isReady ? (
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  ) : (
                    <span className="text-xs text-yellow-400">Not available</span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowMobileWalletOptions(false)}
            className="mt-4 w-full p-3 bg-gray-700 rounded-lg text-gray-300"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    );
  };

  // Render eduChain switch prompt
  const renderEduChainPrompt = () => {
    if (!showEduChainPrompt || !EDU_CHAIN) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
        onClick={() => setShowEduChainPrompt(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-md border border-blue-500/30 mx-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center mb-4">
            <span className="text-3xl md:text-4xl">🎓</span>
            <h3 className="text-lg md:text-xl font-bold text-white mt-2">Switch to eduChain</h3>
            <p className="text-sm md:text-base text-gray-300 mt-2">
              This application works best on the Open Campus Codex network (eduChain).
            </p>
          </div>
          
          <div className="bg-blue-500/10 p-3 md:p-4 rounded-lg border border-blue-500/20 mb-4 md:mb-6">
            <div className="flex items-center">
              <span className="text-xl md:text-2xl mr-3">🎓</span>
              <div>
                <p className="text-sm md:text-base font-medium text-blue-300">{EDU_CHAIN.name}</p>
                <p className="text-xs md:text-sm text-gray-400">Native token: {EDU_CHAIN.nativeCurrency.symbol}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <button
              onClick={() => handleNetworkSwitch(EDU_CHAIN)}
              disabled={isNetworkSwitching}
              className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isNetworkSwitching ? (
                <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Switch to eduChain"
              )}
            </button>
            <button
              onClick={() => setShowEduChainPrompt(false)}
              className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-700 hover:bg-gray-600 text-sm md:text-base text-gray-300 font-medium rounded-xl transition-colors"
            >
              Continue anyway
            </button>
          </div>
          
          <p className="text-xs md:text-sm text-gray-400 mt-4 text-center">
            You can switch networks at any time using the network selector
          </p>
        </motion.div>
      </motion.div>
    );
  };

  // Main render
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-6 rounded-2xl shadow-xl border border-gray-800/50 backdrop-blur-sm max-h-[90vh] overflow-y-auto" ref={modalRef}>
      <div className="max-w-md mx-auto space-y-4 md:space-y-5">
        {/* Header with enhanced styling */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Wallet Connection
            </h2>
            <p className="text-xs md:text-sm text-gray-400 mt-1">Manage your wallet connection and network</p>
          </div>
          {account.isConnected && (
            <button
              onClick={() => disconnect()}
              className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-red-400 bg-red-400/10 rounded-xl hover:bg-red-400/20 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Connection Status with animation */}
        <div className="p-4 bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700/50 transition-all duration-300 hover:bg-gray-800/70">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Status</span>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                account.isConnected 
                  ? 'bg-green-400 animate-pulse' 
                  : 'bg-yellow-400'
              }`} />
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                account.isConnected
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {account.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Connected Wallet Info with improved layout */}
        {account.isConnected && account.address && (
          <div className="space-y-4">
            {/* Address with copy animation */}
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 space-y-2 group hover:bg-gray-800/70 transition-all duration-300">
              <p className="text-sm text-gray-400">Wallet Address</p>
              <div className="flex items-center justify-between">
                <code className="bg-gray-900/50 px-4 py-2 rounded-lg text-sm font-mono text-gray-300 overflow-x-auto scrollbar-thin">
                  {formatAddress(account.address)}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(account.address || '');
                    setSwitchStatus({
                      message: 'Address copied to clipboard!',
                      isError: false
                    });
                    clearStatusMessage();
                  }}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ml-2 flex-shrink-0"
                  title="Copy address"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Network Selector with enhanced dropdown */}
            <div className="relative" ref={networkDropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNetworks(!showNetworks);
                }}
                disabled={isNetworkSwitching}
                className="w-full flex items-center justify-between p-3 md:p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center">
                  <span className="text-xl md:text-2xl mr-2 md:mr-3 group-hover:scale-110 transition-transform duration-200">{chainEmoji}</span>
                  <div>
                    <p className="text-xs md:text-sm text-gray-400">Network</p>
                    <p className="text-sm md:text-base font-medium text-gray-200">{currentChain?.name || 'Unknown'}</p>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 md:w-5 md:h-5 text-gray-400 transition-all duration-200 ${showNetworks ? 'rotate-180 text-blue-400' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Network Dropdown */}
              <AnimatePresence>
                {showNetworks && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" 
                      onClick={() => setShowNetworks(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      className={`
                        absolute ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} 
                        left-0 right-0 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 
                        rounded-xl shadow-xl z-50 max-h-[60vh] md:max-h-[240px]
                      `}
                    >
                      <div className="overflow-y-auto max-h-[60vh] md:max-h-[240px] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {SUPPORTED_CHAINS.map((chain) => {
                          const isCurrentChain = chain.id === chainId;
                          const isEduChain = chain.id === 656476;
                          const emoji = getChainEmoji(chain.id);

                          return (
                            <button
                              key={chain.id}
                              onClick={() => {
                                if (!isCurrentChain) {
                                  handleNetworkSwitch(chain);
                                }
                                setShowNetworks(false);
                              }}
                              disabled={isNetworkSwitching}
                              className={`w-full flex items-center px-3 py-2.5 md:px-4 md:py-3 hover:bg-gray-700/50 transition-all duration-200 ${
                                isCurrentChain ? 'bg-blue-500/10 text-blue-400' : ''
                              } ${
                                isEduChain && !isCurrentChain ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : ''
                              } disabled:opacity-50 disabled:cursor-not-allowed group`}
                            >
                              <span className="text-lg md:text-xl mr-2 md:mr-3 group-hover:scale-110 transition-transform duration-200">{emoji}</span>
                              <span className="text-sm md:text-base font-medium">{chain.name}</span>
                              {isCurrentChain && (
                                <span className="ml-auto text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 md:px-3 md:py-1 rounded-lg">
                                  Connected
                                </span>
                              )}
                              {isEduChain && !isCurrentChain && (
                                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 md:px-3 md:py-1 rounded-lg">
                                  Recommended
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Network Switch Status with improved animation */}
            <AnimatePresence>
              {switchStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 md:p-4 rounded-xl text-xs md:text-sm flex items-start backdrop-blur-sm ${
                    switchStatus.isError
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {switchStatus.isError ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <span>{switchStatus.message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Wallet Connection Options with enhanced buttons */}
        {!account.isConnected && (
          <div className="space-y-3">
            {connectors.map((connector) => {
              const isReady = isConnectorReady(connector);

              return (
                <button
                  key={connector.uid}
                  onClick={() => handleMobileWalletConnection(connector)}
                  disabled={!isReady}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group ${
                    isReady
                      ? 'bg-gray-800/50 hover:bg-gray-800/70 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-800/30 cursor-not-allowed'
                  } border border-gray-700/50`}
                >
                  <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{connector.name}</span>
                  {isReady ? (
                    <svg className="w-5 h-5 text-blue-400 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  ) : (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-lg border border-yellow-400/20">
                      Not available
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile wallet options modal */}
        <AnimatePresence>
          {showMobileWalletOptions && renderMobileWalletOptions()}
        </AnimatePresence>

        {/* eduChain prompt modal */}
        <AnimatePresence>
          {showEduChainPrompt && renderEduChainPrompt()}
        </AnimatePresence>

        {/* Connection error message */}
        <AnimatePresence>
          {connectError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
            >
              {connectError.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}