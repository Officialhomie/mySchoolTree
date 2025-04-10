import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useReadContract } from 'wagmi';
import { type Address, zeroAddress } from 'viem';
import { contractRoleManagementConfig } from '../contracts';

// Role check states
type RoleState = {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isChecking: boolean;
  error: string | null;
};

const RoleBasedRouter = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [roleState, setRoleState] = useState<RoleState>({
    isAdmin: false,
    isTeacher: false,
    isStudent: false,
    isChecking: true,
    error: null
  });

  // Role check contracts
  const { refetch: refetchAdminRole } = useReadContract({
    abi: contractRoleManagementConfig.abi,
    address: contractRoleManagementConfig.address as Address,
    functionName: 'hasAdminRole',
    args: [address || zeroAddress],
    account: address,
  });

  const { refetch: refetchTeacherRole } = useReadContract({
    abi: contractRoleManagementConfig.abi,
    address: contractRoleManagementConfig.address as Address,
    functionName: 'hasTeacherRole',
    args: [address || zeroAddress],
    account: address,
  });

  const { refetch: refetchStudentRole } = useReadContract({
    abi: contractRoleManagementConfig.abi,
    address: contractRoleManagementConfig.address as Address,
    functionName: 'hasStudentRole',
    args: [address || zeroAddress],
    account: address,
  });

  // Check roles when address changes
  useEffect(() => {
    const checkRoles = async () => {
      if (!isConnected || !address) {
        setRoleState(prev => ({
          ...prev,
          isChecking: false,
          error: null
        }));
        return;
      }

      setRoleState(prev => ({ ...prev, isChecking: true, error: null }));

      try {
        // Fetch all roles
        const [adminRole, teacherRole, studentRole] = await Promise.all([
          refetchAdminRole(),
          refetchTeacherRole(),
          refetchStudentRole()
        ]);

        setRoleState({
          isAdmin: !!adminRole.data,
          isTeacher: !!teacherRole.data,
          isStudent: !!studentRole.data,
          isChecking: false,
          error: null
        });

        // Route based on role
        if (adminRole.data) {
          navigate('/school-admin');
        } else if (teacherRole.data) {
          navigate('/teacher');
        } else if (studentRole.data) {
          navigate('/student');
        } else {
          // No role - show guest view
          navigate('/');
        }
      } catch (error) {
        setRoleState(prev => ({
          ...prev,
          isChecking: false,
          error: error instanceof Error ? error.message : 'Error checking roles'
        }));
      }
    };

    checkRoles();
  }, [address, isConnected, navigate, refetchAdminRole, refetchTeacherRole, refetchStudentRole]);

  // Loading state
  if (roleState.isChecking) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-900 flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200/20 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Checking permissions...</p>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (roleState.error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-900 flex items-center justify-center"
      >
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-red-400 text-lg font-semibold mb-2">Error Checking Permissions</h2>
          <p className="text-gray-300">{roleState.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-900 flex items-center justify-center"
      >
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 max-w-md mx-4 text-center">
          <h2 className="text-blue-400 text-lg font-semibold mb-2">Welcome to mySchoolTree</h2>
          <p className="text-gray-300 mb-4">Please connect your wallet to access the platform.</p>
          <div className="inline-block bg-blue-500/20 text-blue-400 px-4 py-2 rounded-md">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>Connect Wallet</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null; // Router will handle the redirection
};

export default RoleBasedRouter; 