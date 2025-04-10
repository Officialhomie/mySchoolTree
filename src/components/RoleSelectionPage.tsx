import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import OCIDLoginButton from '../components/ui/buttons/OCIDLoginButton';

// Define the Role interface
interface Role {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  route: string;
  authRequired: boolean;
  roleCheck: string | null;
}

const RoleSelectionPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Role definitions
  const roles: Role[] = [
    { 
      id: 'school-admin', 
      title: 'School Administrator', 
      description: 'Manage school operations, programs, students, and finances',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
        </svg>
      ),
      route: '/school-admin',
      authRequired: true,
      roleCheck: 'admin'
    },
    {
      id: 'teacher',
      title: 'Teacher',
      description: 'Manage classes, track attendance, and grade students',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
      route: '/teachers',
      authRequired: true,
      roleCheck: 'teacher'
    },
    {
      id: 'student',
      title: 'Student',
      description: 'View classes, track progress, and manage tuition',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      ),
      route: '/student-dashboard',
      authRequired: true,
      roleCheck: 'student'
    },
    {
      id: 'guest',
      title: 'Guest',
      description: 'Explore the platform with limited access',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
      route: '/guest-dashboard',
      authRequired: false,
      roleCheck: null
    }
  ];

  // Role selection handler
  const handleRoleSelection = (role: Role) => {
    setSelectedRole(role);
  };

  // Navigate to selected dashboard
  const continueToRole = async () => {
    if (!selectedRole) return;
    
    // If role requires authentication but user is not connected
    if (selectedRole.authRequired && !isConnected) {
      // Show wallet connection prompt
      alert('Please connect your wallet to continue');
      return;
    }
    
    // For demo purposes, normally you would check the role on the blockchain
    if (selectedRole.roleCheck) {
      // Here you would check if the user has the required role
      // For now, we'll simulate a successful role check
      console.log(`Checking ${selectedRole.roleCheck} role for address: ${address}`);
      
      // Navigate to the selected role's dashboard
      navigate(selectedRole.route);
    } else {
      // Guest role doesn't need authentication
      navigate(selectedRole.route);
    }
  };

  // Return to homepage
  const goBack = () => {
    navigate('/');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-4xl bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Select Your Role</h1>
            <button 
              onClick={goBack}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Wallet Connection Status */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-700/50 border-b border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-1 sm:mr-2`}></div>
            <span className="text-xs sm:text-sm text-gray-300">
              {isConnected && address
                ? `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
                : 'Wallet not connected'
              }
            </span>
            {!isConnected && (
              <OCIDLoginButton 
                className="text-xs px-2 sm:px-3 py-1 bg-blue-500/20 rounded-md border border-blue-500/30 text-blue-400" 
              />
            )}
          </div>
        </div>
        
        {/* Role Selection Grid */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {roles.map((role) => (
              <motion.div
                key={role.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelection(role)}
                className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-lg cursor-pointer transition-all ${
                  selectedRole?.id === role.id 
                    ? 'bg-blue-500/20 border-2 border-blue-500' 
                    : 'bg-gray-700 border-2 border-transparent hover:bg-gray-700/70'
                }`}
              >
                <div className={`${selectedRole?.id === role.id ? 'text-blue-400' : 'text-gray-300'} h-8 w-8 sm:h-12 sm:w-12 mb-2 sm:mb-4`}>
                  {role.icon}
                </div>
                <h3 className={`text-base sm:text-lg font-semibold ${selectedRole?.id === role.id ? 'text-blue-400' : 'text-white'} text-center`}>
                  {role.title}
                </h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-center text-gray-400">
                  {role.description}
                </p>
                {role.authRequired && (
                  <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs px-2 py-1 rounded-full bg-yellow-900/30 text-yellow-500">
                    Authentication Required
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-700/30 border-t border-gray-700 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <button
            onClick={goBack}
            className="w-full sm:w-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm sm:text-base"
          >
            Back to Home
          </button>
          
          <button
            onClick={continueToRole}
            disabled={!selectedRole}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-colors text-sm sm:text-base ${
              selectedRole 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedRole ? 'Continue' : 'Select a Role'}
          </button>
        </div>
      </div>
      
      {/* Information Section */}
      <div className="mt-4 sm:mt-6 text-center max-w-2xl px-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-300 mb-2">About Role-Based Access</h2>
        <p className="text-gray-400 text-xs sm:text-sm">
          Different roles have different access levels and features within mySchoolTree.
          Administrators can manage schools, teachers can handle classes, and students can track their progress.
          Guest access provides a limited view of the platform's capabilities.
        </p>
      </div>
    </motion.div>
  );
};

export default RoleSelectionPage;