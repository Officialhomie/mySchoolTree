import { useState, useRef } from 'react';
import { useAccount } from "wagmi";
import { motion } from 'framer-motion';

// Import main components
import StudentMakeUp from "./StudentMakeUp";
import StudentMakeUpOne from "./StudentMakeUpOne";
import StudentVerificationHub from "./StudentMakeUpTwo";
import StudentMakeUpThree from "./StudentMakeUpThree";
import StudentMakeUpFour from "./StudentMakeUpFour";
import StudentRecordManager from "./StudentMakeUpFive";
import TuitionPaymentForm from "../MSTWriteFunctions/SMWrite/TuitionPaymentForm";

// Import contracts configuration
import { 
  contractAttendanceTrackingConfig, 
  contractStudentManagementConfig,
  contractTuitionSystemConfig,
} from "../contracts";

const StudentDashboard = () => {
  const { address } = useAccount();
  const [activeModule, setActiveModule] = useState('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Create refs for components that expose imperative methods
  const tuitionPaymentRef = useRef(null);
  const studentRecordRef = useRef(null);
  
  // Handle logout
  const handleLogout = () => {
    console.log("Logout requested");
    // Add actual logout logic here
  };
  
  // Handle module change
  const changeModule = (moduleName: string) => {
    setActiveModule(moduleName);
    setIsMenuOpen(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-800/80 border-b border-gray-700 backdrop-blur-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                EduChain
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-6">
                <button 
                  onClick={() => changeModule('overview')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeModule === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => changeModule('records')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeModule === 'records' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Records
                </button>
                <button 
                  onClick={() => changeModule('verification')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeModule === 'verification' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Verification
                </button>
                <button 
                  onClick={() => changeModule('tuition')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeModule === 'tuition' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Tuition
                </button>
                <button 
                  onClick={() => changeModule('management')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeModule === 'management' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Management
                </button>
              </div>
            </div>
            
            <div className="flex items-center">
              {/* User Profile Info */}
              {address && (
                <div className="flex items-center">
                  <div className="bg-gray-700 rounded-full p-1 mr-2">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-300">
                      {address.substring(2, 4).toUpperCase()}
                    </div>
                  </div>
                  <div className="hidden md:block text-sm">
                    <div className="text-gray-300">{`${address.slice(0, 6)}...${address.slice(-4)}`}</div>
                    <div className="text-xs text-gray-500">Student</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-4 text-gray-300 hover:text-gray-100"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Mobile Menu Button */}
              <div className="md:hidden ml-2">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
                >
                  <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    {isMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 border-b border-gray-700">
            <button
              onClick={() => changeModule('overview')}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                activeModule === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => changeModule('records')}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                activeModule === 'records' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Records
            </button>
            <button
              onClick={() => changeModule('verification')}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                activeModule === 'verification' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Verification
            </button>
            <button
              onClick={() => changeModule('tuition')}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                activeModule === 'tuition' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Tuition
            </button>
            <button
              onClick={() => changeModule('management')}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                activeModule === 'management' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Management
            </button>
          </div>
        </div>
      </nav>
      
      {/* Main Content Area */}
      <main className="pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            {activeModule === 'overview' && 'Student Dashboard'}
            {activeModule === 'records' && 'Student Records'}
            {activeModule === 'verification' && 'Student Verification'}
            {activeModule === 'tuition' && 'Tuition Management'}
            {activeModule === 'management' && 'Student Management'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {activeModule === 'overview' && 'Overview of your educational progress and attendance'}
            {activeModule === 'records' && 'View and manage your student records'}
            {activeModule === 'verification' && 'Verify your academic credentials and status'}
            {activeModule === 'tuition' && 'Manage tuition payments and fee information'}
            {activeModule === 'management' && 'Administrative tools for student management'}
          </p>
        </div>
        
        {/* Module Content */}
        <div className="space-y-6">
          {/* Overview Module */}
          {activeModule === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <StudentMakeUp />
            </motion.div>
          )}
          
          {/* Records Module */}
          {activeModule === 'records' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <StudentMakeUpOne />
              <StudentMakeUpFour
                onCountUpdateSuccess={(address, increased, ) => {
                  console.log(`Attendance ${increased ? 'increased' : 'decreased'} for ${address}`);
                }}
                onDateUpdateSuccess={(address, timestamp, ) => {
                  console.log(`Attendance date updated for ${address} to ${new Date(Number(timestamp) * 1000)}`);
                }}
              />
            </motion.div>
          )}
          
          {/* Verification Module */}
          {activeModule === 'verification' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <StudentVerificationHub
                attendanceContract={{
                  address: contractAttendanceTrackingConfig.address,
                  abi: contractAttendanceTrackingConfig.abi
                }}
                studentContractView={{
                  address: contractStudentManagementConfig.address,
                  abi: contractStudentManagementConfig.abi
                }}
                reputationContract={{
                  address: contractAttendanceTrackingConfig.address,
                  abi: contractAttendanceTrackingConfig.abi
                }}
                schoolVerificationContract={{
                  address: contractAttendanceTrackingConfig.address,
                  abi: contractAttendanceTrackingConfig.abi
                }}
                termCompletionContract={{
                  address: contractAttendanceTrackingConfig.address,
                  abi: contractAttendanceTrackingConfig.abi
                }}
                studentAddress={address}
                defaultMode="attendance"
                onDataFetched={(data) => console.log("Verification data fetched:", data)}
              />
            </motion.div>
          )}
          
          {/* Tuition Module */}
          {activeModule === 'tuition' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <StudentMakeUpThree
                feeContract={contractTuitionSystemConfig}
                statusContract={contractTuitionSystemConfig}
                studentAddress={address}
                defaultMode="fees"
                onFeesDataFetched={(data) => console.log("Fee data fetched:", data)}
                onStatusDataFetched={(isPaid, dueDate) => console.log("Status data fetched:", { isPaid, dueDate })}
              />
              
              <TuitionPaymentForm
                ref={tuitionPaymentRef}
                contract={contractTuitionSystemConfig}
                currentTerm={1}
                onPaymentSuccess={(term, amount,) => {
                  console.log(`Payment of ${amount} ETH for term ${term} successful`);
                }}
                onPaymentError={(error) => {
                  console.error("Payment error:", error);
                }}
              />
            </motion.div>
          )}
          
          {/* Management Module */}
          {activeModule === 'management' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <StudentRecordManager
                ref={studentRecordRef}
                contractAddress={contractStudentManagementConfig.address as `0x${string}`}
                contractAbi={contractStudentManagementConfig.abi}
                roleContract={contractStudentManagementConfig}
                onUpdateComplete={(success, address, action, data) => {
                  console.log(`Record update ${success ? 'successful' : 'failed'} for ${address}`);
                  console.log("Action:", action);
                  console.log("Data:", data);
                }}
                title="Student Record Management"
              />
            </motion.div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800/80 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              © 2025 EduChain - Blockchain Education Management
            </div>
            <div className="text-sm text-gray-400">
              <button onClick={() => console.log("Support clicked")} className="text-blue-400 hover:text-blue-300">
                Support
              </button>
              {" | "}
              <button onClick={() => console.log("Documentation clicked")} className="text-blue-400 hover:text-blue-300">
                Documentation
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentDashboard;