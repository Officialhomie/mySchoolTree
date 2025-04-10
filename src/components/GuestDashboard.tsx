import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OCIDLoginButton from '../components/ui/buttons/OCIDLoginButton';

const GuestDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  
  // Demo program data
  const demoPrograms = [
    { id: 1, name: "Introduction to Blockchain", students: 24, institution: "Crypto Academy" },
    { id: 2, name: "Smart Contract Development", students: 18, institution: "Blockchain University" },
    { id: 3, name: "Web3 Fundamentals", students: 32, institution: "DeFi Institute" }
  ];
  
  // Handle section change
  const changeSection = (section: string) => {
    setActiveSection(section);
  };
  
  // Return to role selection
  const backToRoleSelection = () => {
    navigate('/role-select');
  };
  
  // Go to account creation/login
  const createAccount = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                mySchoolTree
              </div>
              <span className="ml-3 px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-md">
                Guest Mode
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <OCIDLoginButton className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-md border border-blue-500/30 text-sm" />
              
              <button 
                onClick={createAccount}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 rounded-md text-sm transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => changeSection('overview')}
              className={`px-3 py-3 text-sm ${
                activeSection === 'overview' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button 
              onClick={() => changeSection('programs')}
              className={`px-3 py-3 text-sm ${
                activeSection === 'programs' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Programs
            </button>
            <button 
              onClick={() => changeSection('demo')}
              className={`px-3 py-3 text-sm ${
                activeSection === 'demo' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Interactive Demo
            </button>
            <button 
              onClick={() => changeSection('about')}
              className={`px-3 py-3 text-sm ${
                activeSection === 'about' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              About
            </button>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Limited Access Alert */}
        <div className="mb-8 bg-yellow-900/30 border border-yellow-800/50 rounded-lg p-4 text-yellow-500 flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">You are browsing in Guest Mode</p>
            <p className="mt-1 text-sm">Guest access provides limited functionality. To access all features, please create an account or connect your wallet.</p>
            <div className="mt-2 flex space-x-2">
              <button 
                onClick={createAccount}
                className="text-xs px-2 py-1 bg-yellow-700/30 hover:bg-yellow-700/50 rounded transition-colors"
              >
                Sign Up
              </button>
              <button 
                onClick={backToRoleSelection}
                className="text-xs px-2 py-1 bg-yellow-700/30 hover:bg-yellow-700/50 rounded transition-colors"
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
        
        {/* Dynamic Content */}
        {activeSection === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h1 className="text-2xl font-bold text-white">Welcome to mySchoolTree</h1>
            <p className="text-gray-300">
              mySchoolTree bridges traditional education with blockchain technology, providing a secure and transparent system for academic record management. 
              As a guest, you can explore our platform's key features before creating an account.
            </p>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Immutable Academic Records</h3>
                <p className="mt-2 text-gray-400 text-sm">
                  Student records and achievements are securely stored on the blockchain, preventing tampering and ensuring authenticity.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Transparent Verification</h3>
                <p className="mt-2 text-gray-400 text-sm">
                  Employers and educational institutions can instantly verify credentials without lengthy verification processes.
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                    <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                    <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Efficient Tuition Management</h3>
                <p className="mt-2 text-gray-400 text-sm">
                  Streamlined payment processing with automatic record-keeping and transparent fee structures.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {activeSection === 'programs' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-white mb-6">Educational Programs</h1>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="bg-gray-700 px-6 py-4">
                <h2 className="text-lg font-medium text-white">Blockchain Education Programs</h2>
                <p className="text-sm text-gray-400">Sample programs available on the platform</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-700/50">
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Program Name</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Institution</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Students</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {demoPrograms.map(program => (
                      <tr key={program.id} className="hover:bg-gray-700/30">
                        <td className="py-4 px-6 text-sm font-medium text-white">{program.name}</td>
                        <td className="py-4 px-6 text-sm text-gray-300">{program.institution}</td>
                        <td className="py-4 px-6 text-sm text-gray-300">{program.students}</td>
                        <td className="py-4 px-6 text-sm">
                          <button 
                            onClick={() => alert('Feature only available for registered users')}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-gray-700/30 px-6 py-4 text-center">
                <p className="text-sm text-gray-400">
                  Full program details and enrollment options are available to registered users only
                </p>
                <button 
                  onClick={createAccount}
                  className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
                >
                  Create Account to Explore
                </button>
              </div>
            </div>
          </motion.div>
        )}
        
        {activeSection === 'demo' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-white mb-6">Interactive Demo</h1>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="text-center py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-white">Interactive Demo</h3>
                <p className="mt-2 text-gray-400">
                  Experience how mySchoolTree works with our interactive demo.
                </p>
                <button 
                  onClick={() => alert('Demo feature restricted to registered users')}
                  className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Start Demo
                </button>
                <p className="mt-4 text-xs text-gray-500">
                  Demo functionality is restricted in guest mode. Create an account for full access.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {activeSection === 'about' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-white mb-6">About mySchoolTree</h1>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <p className="text-gray-300">
                mySchoolTree is a revolutionary platform that combines traditional education systems with blockchain technology.
                Our mission is to create a secure, transparent, and efficient educational ecosystem for all stakeholders.
              </p>
              
              <h2 className="text-xl font-semibold text-white mt-6 mb-3">Our Vision</h2>
              <p className="text-gray-300">
                We envision a future where educational records are immutable, instantly verifiable, and controlled by the students who earned them.
                By leveraging blockchain technology, we eliminate fraud, reduce administrative overhead, and empower students with ownership of their credentials.
              </p>
              
              <div className="mt-8 border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Join the Revolution</h3>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <button 
                    onClick={createAccount}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:opacity-90 transition-opacity"
                  >
                    Create an Account
                  </button>
                  <button 
                    onClick={() => navigate('/about')}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              © 2025 mySchoolTree - Blockchain Education Management
            </div>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-gray-300 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-300 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-300 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GuestDashboard;