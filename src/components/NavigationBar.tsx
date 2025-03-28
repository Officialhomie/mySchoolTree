import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConnectWallet from './ConnectWallet';
import { useAccount } from 'wagmi';

const NavigationBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const account = useAccount();

  // Handle scroll events to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-gray-900/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-shrink-0"
            >
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                mySchoolTree
              </span>
            </motion.div>
            
            {/* Desktop menu */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                <NavLink href="#" active>Dashboard</NavLink>
                <NavLink href="#" active={false}>Explore</NavLink>
                <NavLink href="#" active={false}>Marketplace</NavLink>
                <NavLink href="#" active={false}>Documentation</NavLink>
              </div>
            </div>
            
            {/* Wallet connection button */}
            <div className="hidden md:flex items-center">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsWalletOpen(!isWalletOpen)}
                className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all ${
                  account.status === 'connected'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                }`}
              >
                {account.status === 'connected' ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    {formatAddress(account.address)}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Connect Wallet
                  </>
                )}
              </motion.button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              {account.status === 'connected' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl px-3 py-1 mr-3 text-sm flex items-center"
                  onClick={() => setIsWalletOpen(!isWalletOpen)}
                >
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></div>
                  {formatAddress(account.address)}
                </motion.button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-gray-800"
            >
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <MobileNavLink href="#" active>Dashboard</MobileNavLink>
                <MobileNavLink href="#" active={false}>Explore</MobileNavLink>
                <MobileNavLink href="#" active={false}>Marketplace</MobileNavLink>
                <MobileNavLink href="#" active={false}>Documentation</MobileNavLink>
                
                {account.status !== 'connected' && (
                  <button 
                    onClick={() => {
                      setIsWalletOpen(!isWalletOpen);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Connect Wallet
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      
      {/* Wallet connection modal */}
      <AnimatePresence>
        {isWalletOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setIsWalletOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsWalletOpen(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <ConnectWallet />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Navigation link for desktop
const NavLink = ({ href, active, children }: { href: string, active: boolean, children: React.ReactNode }) => (
  <motion.a
    href={href}
    whileHover={{ y: -2 }}
    className={`px-3 py-2 text-sm font-medium ${
      active 
        ? 'text-white border-b-2 border-blue-400' 
        : 'text-gray-300 hover:text-white transition-colors'
    }`}
  >
    {children}
  </motion.a>
);

// Navigation link for mobile
const MobileNavLink = ({ href, active, children }: { href: string, active: boolean, children: React.ReactNode }) => (
  <a
    href={href}
    className={`block px-3 py-2 rounded-md text-base font-medium ${
      active 
        ? 'bg-gray-700 text-white' 
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {children}
  </a>
);

export default NavigationBar;