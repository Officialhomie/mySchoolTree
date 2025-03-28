import React from 'react';
import { motion } from 'framer-motion';

const SystemBlock = ({ title, color, children }: { title: string, color: string, children: React.ReactNode }) => {
  const colorMap = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30"
  };
  
  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      className={`p-3 ${colorMap[color as keyof typeof colorMap]} rounded-lg border flex flex-col items-center justify-center text-center`}
    >
      {children}
      <p className="text-xs mt-2 font-medium">{title}</p>
    </motion.div>
  );
};

export default SystemBlock;