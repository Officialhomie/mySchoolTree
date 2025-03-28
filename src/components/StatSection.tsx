import { motion } from 'framer-motion';
import StatCard from './ui/cards/StatCard';

const StatsSection = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.5 }}
      className="max-w-7xl mx-auto mt-24 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-700"
    >
      <h2 className="text-2xl font-bold text-center mb-8">Protocol Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Institutions" value="243" />
        <StatCard title="Students Onchain" value="124,582" />
        <StatCard title="Records Secured" value="1.7M+" />
        <StatCard title="Countries" value="37" />
      </div>
    </motion.div>
  );
};

export default StatsSection;