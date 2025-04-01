import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * RoleAdminReader Component
 * 
 * This component reads the admin role associated with a specific role
 * from the contract. It displays the bytes32 role identifier and its admin role.
 * 
 * The component handles loading states, errors, and successful data fetching.
 */
interface RoleAdminReaderProps {
  contract: any;
  roleId: string; // The bytes32 role identifier to check
  onRoleAdminRead?: (adminRole: string) => void; // Callback when admin role is successfully read
  knownRoles?: Record<string, string>; // Optional mapping of known role IDs to human-readable names
}

const RoleAdminReader = ({ 
  contract, 
  roleId,
  onRoleAdminRead,
  knownRoles = {}
}: RoleAdminReaderProps) => {
  // State for role admin
  const [adminRole, setAdminRole] = useState<string>('');
  
  // Get role admin from the contract
  const { 
    data: roleAdminData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'getRoleAdmin',
    args: [roleId], // Pass the role ID as an argument
    enabled: roleId !== '', // Only run the query if we have a role ID
  });

  // Process the role admin data when it's received
  useEffect(() => {
    if (roleAdminData !== undefined && isSuccess) {
      const adminRoleString = roleAdminData as string;
      setAdminRole(adminRoleString);
      
      // Call the callback with the admin role if provided
      if (onRoleAdminRead) {
        onRoleAdminRead(adminRoleString);
      }
    }
  }, [roleAdminData, isSuccess, onRoleAdminRead]);

  // Helper function to get readable role names
  const getRoleName = (role: string): string => {
    // Check if we have a known name for this role
    if (knownRoles[role]) {
      return knownRoles[role];
    }
    
    // For the default admin role (all zeros)
    if (role === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return 'DEFAULT_ADMIN_ROLE';
    }
    
    // For unknown roles, return the first 8 and last 8 characters
    return `${role.slice(0, 10)}...${role.slice(-8)}`;
  };

  // Format a bytes32 value for display
  const formatBytes32 = (bytes32: string): string => {
    if (!bytes32 || bytes32.length < 66) return bytes32;
    return `${bytes32.slice(0, 10)}...${bytes32.slice(-8)}`;
  };
  
  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Role Admin Reader
      </h3>
      
      {roleId === '' && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <p className="text-sm">Please provide a valid role ID to check its admin role.</p>
        </div>
      )}
      
      {roleId !== '' && isLoading && (
        <div className="flex items-center justify-center py-3">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Reading contract data...</span>
        </div>
      )}
      
      {roleId !== '' && error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error reading role admin: {(error as Error).message || 'Unknown error'}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {roleId !== '' && isSuccess && roleAdminData !== undefined && (
        <div className="space-y-3">
          <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-md p-3">
            <p className="text-sm font-medium text-indigo-400">
              Role Information
            </p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs text-gray-400">Current Role:</p>
                {knownRoles[roleId] ? (
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-white font-medium">{knownRoles[roleId]}</span>
                    <span className="text-xs text-gray-400 ml-2">({formatBytes32(roleId)})</span>
                  </div>
                ) : (
                  <p className="text-sm font-mono text-gray-200 mt-1 break-all">{roleId}</p>
                )}
              </div>
              
              <div>
                <p className="text-xs text-gray-400">Admin Role:</p>
                {knownRoles[adminRole] ? (
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-white font-medium">{knownRoles[adminRole]}</span>
                    <span className="text-xs text-gray-400 ml-2">({formatBytes32(adminRole)})</span>
                  </div>
                ) : (
                  <p className="text-sm font-mono text-gray-200 mt-1 break-all">{adminRole}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700/50 rounded-md p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400">Relationship</p>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="text-sm text-gray-300">{getRoleName(roleId)}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm text-gray-300">{getRoleName(adminRole)}</span>
                </div>
              </div>
              <button
                onClick={() => refetch()}
                className="text-xs bg-blue-600/30 hover:bg-blue-600/40 text-blue-400 py-1 px-2 rounded"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RoleAdminReader;