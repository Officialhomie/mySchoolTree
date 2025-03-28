import React from 'react';
import { motion } from 'framer-motion';
import NavigationBar from './NavigationBar';
import { useAccount } from 'wagmi';
import GetDeployedContracts from '../MSTReadfunction/SMFRead/GetDeployedContracts';

const Home = () => {
  const account = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <NavigationBar />
      
      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto mt-12 sm:mt-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              <span className="block">The Future of Grassroots Education</span>
              <span className="block mt-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Decentralized Education
              </span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-gray-300">
                Connect your wallet to access the full functionality of our decentralized platform.
            </p>
            
            <div className="mt-10 flex justify-center">
              {account.status !== 'connected' ? (
                <CallToActionButton>Get Started</CallToActionButton>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-green-500/20 rounded-xl border border-green-500/30 text-green-400 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Wallet Connected
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
        




      </main>
    </div>
  );
};

// Call to Action Button
const CallToActionButton = ({ children }: { children: React.ReactNode }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
    className="px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
  >
    {children}
  </motion.button>
);


export default Home;