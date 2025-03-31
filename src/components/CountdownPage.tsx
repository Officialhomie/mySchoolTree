import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Readycomponent from './Readycomponent';

const CountdownPage = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      {/* Back button */}
      <motion.button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-50 bg-gray-800/50 hover:bg-gray-700/70 text-gray-300 rounded-full p-2 backdrop-blur-sm border border-gray-700/50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </motion.button>
      
      {/* CountdownTimer component */}
      <Readycomponent />
    </motion.div>
  );
};

export default CountdownPage;