import React from 'react';
import { motion } from 'framer-motion';

const SecondaryButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="px-6 py-3 rounded-xl font-medium text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 shadow-lg"
  >
    {children}
  </motion.button>
);

export default SecondaryButton;