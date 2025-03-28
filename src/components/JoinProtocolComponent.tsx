import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import CallToActionButton from './ui/buttons/CallToActionButton';
import SecondaryButton from './ui/buttons/SecondaryButton';
import PartnerBenefit from './ui/elements/PartnerBenefit';

const JoinProtocolSection = () => {
  const account = useAccount();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.5 }}
      className="max-w-7xl mx-auto mt-24 bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-700/50"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-6">Join Our Educational Protocol</h2>
          <p className="text-gray-300 mb-6">
            Become part of the future of education by integrating your institution with mySchoolTree. We're bringing students onchain from an early age, preparing them for the digital future.
          </p>
          
          <div className="space-y-6 mb-8">
            <PartnerBenefit 
              number="01" 
              title="Student Digital Identity"
              description="Each student receives a secure wallet address and digital identity for lifelong learning credentials."
            />
            <PartnerBenefit 
              number="02" 
              title="Gradual Implementation"
              description="Adopt blockchain features at your own pace with our flexible integration options."
            />
            <PartnerBenefit 
              number="03" 
              title="Technical Support"
              description="Receive dedicated onboarding and ongoing support from our team of education and blockchain experts."
            />
          </div>
          
          {account.status !== 'connected' ? (
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <CallToActionButton onClick={() => {}}>Connect Wallet to Apply</CallToActionButton>
              <SecondaryButton onClick={() => {}}>Learn More</SecondaryButton>
            </div>
          ) : (
            <CallToActionButton onClick={() => {}}>Register Your Institution</CallToActionButton>
          )}
        </div>
        
        <div className="relative">
          <motion.div 
            initial={{ opacity: 0.8 }}
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-2xl blur-xl"
          />
          <div className="relative bg-gray-900/70 p-6 rounded-2xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Partner Application</h3>
            {account.status === 'connected' ? (
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Institution Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter institution name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Institution Type</label>
                  <select className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Elementary School</option>
                    <option>Middle School</option>
                    <option>High School</option>
                    <option>University</option>
                    <option>Vocational Training</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@institution.edu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Student Population</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Approximate number of students"
                  />
                </div>
                <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-medium text-white shadow-lg">
                  Submit Application
                </button>
              </form>
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-400 mb-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-.257-.257A6 6 0 1118 8zm-6-4a1 1 0 100 2h2a1 1 0 100-2h-2z" clipRule="evenodd" />
                </svg>
                <p className="text-gray-300 mb-4">Connect your wallet to access the application form and join our educational protocol.</p>
                <button className="w-full py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-medium">
                  Connect Wallet First
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default JoinProtocolSection;