import React from 'react';
import { motion } from 'framer-motion';

const CallToActionButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
  >
    {children}
  </motion.button>
);

export default CallToActionButton;


