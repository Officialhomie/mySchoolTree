import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import CallToActionButton from './ui/buttons/CallToActionButton';
import OCIDLoginButton from './ui/buttons/OCIDLoginButton';

const HeroSection = () => {
  const { status } = useAccount();
  const navigate = useNavigate();

  // Navigate to role selection page
  const navigateToRoleSelection = () => {
    navigate('/role-select');
  };

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="max-w-7xl mx-auto mt-8 sm:mt-12 md:mt-20 px-3 sm:px-4"
    >
      <div className="flex flex-col items-center">
        {/* Animated Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center w-full"
        >
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="block"
            >
              Get into <span className="text-blue-400">my</span><span className="text-purple-500">SchoolTree</span>
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="block mt-2 sm:mt-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
            >
              Education Meets Blockchain
            </motion.span>
          </h1>
          
          <p className="mt-4 sm:mt-6 max-w-xs xs:max-w-sm sm:max-w-lg md:max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-300">
            Bridging traditional education with blockchain technology for secure, transparent academic record management.
          </p>
        </motion.div>
        
        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6 sm:mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full px-4 sm:px-0"
        >
          {status !== 'connected' ? (
            <CallToActionButton 
              onClick={() => {}}
            >
              Connect Wallet
            </CallToActionButton>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 sm:p-4 bg-green-500/20 rounded-xl border border-green-500/30 text-green-400 flex items-center justify-center w-full sm:w-auto text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Ready to Explore
            </motion.div>
          )}
          
          {/* OpenCampus ID Login Button - Styled like "Ready to Explore" */}
          <div className="block sm:hidden w-full sm:w-auto">
            <OCIDLoginButton 
              className="p-3 sm:p-4 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400 flex items-center justify-center w-full sm:w-auto text-sm sm:text-base" 
            />
          </div>
          
          {/* EnterDapp Button */}
          <motion.button
            onClick={navigateToRoleSelection}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg shadow-lg flex items-center justify-center sm:justify-start space-x-2 transition-all duration-200 text-sm sm:text-base"
          >
            <span>Enter DApp</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </motion.button>
        </motion.div>
        
        {/* Educational Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 sm:mt-8 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400 text-xs sm:text-sm flex items-center max-w-full overflow-hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
          </svg>
          <span className="truncate">Interactive Learning Environment</span>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default HeroSection;