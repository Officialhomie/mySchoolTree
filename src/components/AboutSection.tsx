import { motion } from 'framer-motion';
import BenefitItem from './ui/elements/BenefitItem';
import SystemBlock from './ui/cards/SystemBlock';

const AboutSection = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="max-w-7xl mx-auto mt-24 bg-gray-800/40 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-700"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Reimagining Education Management</h2>
          <p className="text-gray-300 mb-4">
            mySchoolTree creates a seamless bridge between traditional educational systems and blockchain technology, offering institutions the best of both worlds.
          </p>
          <p className="text-gray-300 mb-6">
            Maintain familiar operations while gaining the benefits of immutable record-keeping, transparent accounting, and secure digital identity for students of all ages.
          </p>
          
          <div className="space-y-4">
            <BenefitItem title="Synchronize On-Chain & Off-Chain">
              Transform standard educational processes into blockchain-secured operations without disrupting existing workflows.
            </BenefitItem>
            <BenefitItem title="Adopt at Your Own Pace">
              Institutions can embrace blockchain benefits while preserving the efficiency of current systems.
            </BenefitItem>
            <BenefitItem title="Early Blockchain Exposure">
              Introduce students to digital identity and blockchain interaction from a young age, preparing them for the future.
            </BenefitItem>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-75 blur-xl"></div>
          <motion.div 
            initial={{ y: 0 }}
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="relative bg-gray-900/90 p-6 rounded-2xl border border-gray-700"
          >
            <div className="grid grid-cols-2 gap-4">
              <SystemBlock title="Student Records" color="blue">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </SystemBlock>
              <SystemBlock title="Attendance" color="purple">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </SystemBlock>
              <SystemBlock title="Certificates" color="green">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </SystemBlock>
              <SystemBlock title="Payments" color="amber">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </SystemBlock>
            </div>
            
            <div className="mt-8 flex justify-center">
              <div className="relative py-3 px-6 bg-blue-500/20 text-blue-400 rounded-lg flex items-center space-x-2">
                <div className="absolute -left-2 -top-2 w-4 h-4 bg-blue-400 rounded-full animate-ping"></div>
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span>Blockchain Integration</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default AboutSection;