import { useState, useEffect } from 'react';
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';

/**
 * RoleManagementDashboard Component
 * 
 * A comprehensive educational dashboard for visualizing, understanding,
 * and managing roles within the educational system. This component provides
 * detailed information about different administrative roles, their relationships,
 * and functionality for checking and granting roles to addresses.
 */
interface RoleManagementDashboardProps {
  contract: any; // Contract for reading role identifiers
  hasRoleFunction?: any; // Optional contract for checking if an address has a role
  grantRoleFunction?: any; // Optional contract for granting roles
  revokeRoleFunction?: any; // Optional contract for revoking roles
  onRoleDataFetched?: (roleData: RoleData) => void; // Optional callback when role data is fetched
}

interface RoleData {
  MASTER_ADMIN_ROLE: string;
  DEFAULT_ADMIN_ROLE: string;
  ADMIN_ROLE: string;
  SCHOOL_ROLE: string;
  TEACHER_ROLE: string;
}

interface RoleDescription {
  name: string;
  description: string;
  capabilities: string[];
  color: string;
  importance: number; // For sorting (higher = more important)
  icon: React.ReactNode;
}

const RoleManagementDashboard = ({
  contract,
  hasRoleFunction,
  grantRoleFunction,
  revokeRoleFunction,
  onRoleDataFetched
}: RoleManagementDashboardProps) => {
  // User account
  const { address: connectedAddress } = useAccount();
  
  // Component states
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [lookupAddress, setLookupAddress] = useState<string>('');
  const [grantAddress, setGrantAddress] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [roleDescriptions, setRoleDescriptions] = useState<{[key: string]: RoleDescription}>({});
  const [userRoles, setUserRoles] = useState<{[key: string]: boolean}>({});
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  
  // Fetch all role identifiers from the contract
  const { 
    data: rolesData,
    isLoading: isLoadingRoles,
    isError: isRolesError
  } = useReadContracts({
    contracts: [
      { ...contract, functionName: 'MASTER_ADMIN_ROLE' },
      { ...contract, functionName: 'DEFAULT_ADMIN_ROLE' },
      { ...contract, functionName: 'ADMIN_ROLE' },
      { ...contract, functionName: 'SCHOOL_ROLE' },
      { ...contract, functionName: 'TEACHER_ROLE' }
    ]
  });
  
  // State for role lookup for a specific address
  const [lookupInitiated, setLookupInitiated] = useState<boolean>(false);
  
  // Setup role checking contracts for the lookup address
  const roleCheckLookupContracts = hasRoleFunction && lookupAddress && lookupInitiated && rolesData ? [
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[0].result, lookupAddress as `0x${string}`] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[1].result, lookupAddress as `0x${string}`] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[2].result, lookupAddress as `0x${string}`] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[3].result, lookupAddress as `0x${string}`] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[4].result, lookupAddress as `0x${string}`] }
  ] : [];
  
  // Check roles for the lookup address
  const { 
    data: lookupRolesData,
    isLoading: isLoadingLookupRoles,
    refetch: refetchLookupRoles
  } = useReadContracts({
    contracts: roleCheckLookupContracts,
    query: {
      enabled: hasRoleFunction !== undefined && 
               lookupAddress !== '' && 
               lookupInitiated &&
               rolesData !== undefined &&
               rolesData.length === 5 &&
               !isRolesError
    }
  });
  
  // Setup role checking for the connected user's address
  const roleCheckUserContracts = hasRoleFunction && connectedAddress && rolesData ? [
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[0].result, connectedAddress] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[1].result, connectedAddress] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[2].result, connectedAddress] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[3].result, connectedAddress] },
    { ...hasRoleFunction, functionName: 'hasRole', args: [rolesData[4].result, connectedAddress] }
  ] : [];
  
  // Check roles for the connected user
  const { 
    data: userRolesData,
  } = useReadContracts({
    contracts: roleCheckUserContracts,
    query: {
      enabled: hasRoleFunction !== undefined && 
               connectedAddress !== undefined && 
               rolesData !== undefined &&
               rolesData.length === 5 &&
               !isRolesError
    }
  });
  
  // Contract write state for granting a role
  const { 
    data: grantRoleHash,
    error: grantRoleError,
    isPending: isGrantRolePending,
    writeContract: writeGrantRole
  } = useWriteContract();
  
  // Transaction receipt state for granting a role
  const { 
    isLoading: isGrantConfirming,
    isSuccess: isGrantConfirmed,
    error: grantConfirmError
  } = useWaitForTransactionReceipt({ 
    hash: grantRoleHash,
  });
  
  // Contract write state for revoking a role
  const { 
    data: revokeRoleHash,
    isPending: isRevokeRolePending,
    writeContract: writeRevokeRole
  } = useWriteContract();
  
  // Transaction receipt state for revoking a role
  const { 
    isLoading: isRevokeConfirming,
    isSuccess: isRevokeConfirmed,
  } = useWaitForTransactionReceipt({ 
    hash: revokeRoleHash,
  });
  
  // Combined states for UI
  const isGrantProcessing = isGrantRolePending || isGrantConfirming;
  const isRevokeProcessing = isRevokeRolePending || isRevokeConfirming;
  const grantError = grantRoleError || grantConfirmError;
  
  // Format role identifiers for display
  const formatRoleId = (roleId: string): string => {
    if (!roleId) return 'N/A';
    return `${roleId.substring(0, 10)}...${roleId.substring(roleId.length - 8)}`;
  };
  
  // Process role data when it's loaded
  useEffect(() => {
    if (rolesData && rolesData.length === 5 && !isRolesError) {
      const roleData: RoleData = {
        MASTER_ADMIN_ROLE: rolesData[0].result as string,
        DEFAULT_ADMIN_ROLE: rolesData[1].result as string,
        ADMIN_ROLE: rolesData[2].result as string,
        SCHOOL_ROLE: rolesData[3].result as string,
        TEACHER_ROLE: rolesData[4].result as string
      };
      
      // Define role descriptions and capabilities
      const descriptions: {[key: string]: RoleDescription} = {
        MASTER_ADMIN_ROLE: {
          name: 'Master Administrator',
          description: 'The highest authority role with complete system control.',
          capabilities: [
            'Grant or revoke any role in the system',
            'Perform system-wide configuration changes',
            'Execute emergency system operations',
            'Manage critical contract parameters',
            'Access all administrative functions'
          ],
          color: 'purple',
          importance: 5,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )
        },
        DEFAULT_ADMIN_ROLE: {
          name: 'Default Administrator',
          description: 'The built-in administrator role from OpenZeppelin AccessControl.',
          capabilities: [
            'Grant or revoke most roles in the system',
            'Configure system parameters',
            'Perform administrative operations',
            'Manage contract functionality'
          ],
          color: 'indigo',
          importance: 4,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )
        },
        ADMIN_ROLE: {
          name: 'Administrator',
          description: 'Standard administrative role for day-to-day management.',
          capabilities: [
            'Manage student registrations',
            'Oversee program operations',
            'Configure educational parameters',
            'Run administrative reports',
            'Handle operational tasks'
          ],
          color: 'blue',
          importance: 3,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )
        },
        SCHOOL_ROLE: {
          name: 'School Manager',
          description: 'Role for school-level management and operations.',
          capabilities: [
            'Manage school-specific programs',
            'Register students in their school',
            'Record and update attendance',
            'Configure school parameters',
            'Generate school reports'
          ],
          color: 'green',
          importance: 2,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )
        },
        TEACHER_ROLE: {
          name: 'Teacher',
          description: 'Role for teachers and instructors in the system.',
          capabilities: [
            'Record student attendance',
            'Update attendance dates',
            'View student information',
            'Generate classroom reports',
            'Manage day-to-day educational activities'
          ],
          color: 'teal',
          importance: 1,
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
          )
        }
      };
      
      setRoleDescriptions(descriptions);
      
      // Call the callback if provided
      if (onRoleDataFetched) {
        onRoleDataFetched(roleData);
      }
    }
  }, [rolesData, isRolesError, onRoleDataFetched]);
  
  // Process user roles data when it's loaded
  useEffect(() => {
    if (userRolesData && userRolesData.length === 5) {
      const roles: {[key: string]: boolean} = {
        MASTER_ADMIN_ROLE: userRolesData[0].result as boolean,
        DEFAULT_ADMIN_ROLE: userRolesData[1].result as boolean,
        ADMIN_ROLE: userRolesData[2].result as boolean,
        SCHOOL_ROLE: userRolesData[3].result as boolean,
        TEACHER_ROLE: userRolesData[4].result as boolean
      };
      
      setUserRoles(roles);
    }
  }, [userRolesData]);
  
  // Process lookup roles data when it's loaded
  useEffect(() => {
    if (lookupRolesData && lookupRolesData.length === 5) {
      // This data will be used directly in the render function
      setLookupInitiated(true);
    }
  }, [lookupRolesData]);
  
  // Validate address format
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle lookup action
  const handleLookup = () => {
    if (validateAddress(lookupAddress)) {
      setLookupInitiated(true);
      refetchLookupRoles();
    }
  };
  
  // Handle grant role action
  const handleGrantRole = () => {
    if (!grantRoleFunction || !selectedRole || !grantAddress) return;
    
    if (validateAddress(grantAddress)) {
      try {
        const roleIndex = ['MASTER_ADMIN_ROLE', 'DEFAULT_ADMIN_ROLE', 'ADMIN_ROLE', 'SCHOOL_ROLE', 'TEACHER_ROLE'].indexOf(selectedRole);
        const roleId = roleIndex !== -1 && rolesData ? rolesData[roleIndex]?.result : undefined;
        
        if (!roleId) {
          setValidationError('Invalid role selected');
          return;
        }
        
        writeGrantRole({
          ...grantRoleFunction,
          functionName: 'grantRole',
          args: [roleId, grantAddress as `0x${string}`]
        });
      } catch (err) {
        console.error('Error granting role:', err);
      }
    }
  };
  
  // Handle revoke role action
  const handleRevokeRole = () => {
    if (!revokeRoleFunction || !selectedRole || !lookupAddress) return;
    
    if (validateAddress(lookupAddress)) {
      try {
        const roleIndex = ['MASTER_ADMIN_ROLE', 'DEFAULT_ADMIN_ROLE', 'ADMIN_ROLE', 'SCHOOL_ROLE', 'TEACHER_ROLE'].indexOf(selectedRole);
        const roleId = roleIndex !== -1 && rolesData ? rolesData[roleIndex]?.result : undefined;
        
        if (!roleId) {
          setValidationError('Invalid role selected');
          return;
        }
        
        writeRevokeRole({
          ...revokeRoleFunction,
          functionName: 'revokeRole',
          args: [roleId, lookupAddress as `0x${string}`]
        });
      } catch (err) {
        console.error('Error revoking role:', err);
      }
    }
  };
  
  // Toggle role expansion
  const toggleRoleExpansion = (role: string) => {
    if (expandedRole === role) {
      setExpandedRole(null);
    } else {
      setExpandedRole(role);
    }
  };
  
  // Reset after transaction
  useEffect(() => {
    if (isGrantConfirmed && !isGrantConfirming) {
      // Reset form after successful grant
      setSelectedRole('');
      
      // Refresh role lookup if we're looking at the same address
      if (lookupAddress === grantAddress) {
        refetchLookupRoles();
      }
    }
    
    if (isRevokeConfirmed && !isRevokeConfirming) {
      // Reset form after successful revoke
      setSelectedRole('');
      refetchLookupRoles();
    }
  }, [isGrantConfirmed, isGrantConfirming, isRevokeConfirmed, isRevokeConfirming, grantAddress, lookupAddress, refetchLookupRoles]);
  
  // Render role hierarchy diagram
  const renderRoleHierarchy = () => {
    return (
      <div className="mt-4 p-4 bg-gray-700/20 rounded-lg border border-gray-600">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Role Hierarchy</h4>
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-4 top-7 bottom-7 w-0.5 bg-gray-600"></div>
          
          {/* Role hierarchy items (ordered by importance) */}
          {Object.entries(roleDescriptions)
            .sort(([, a], [, b]) => b.importance - a.importance)
            .map(([roleKey, role]) => (
              <div key={roleKey} className="relative pl-8 pb-4 last:pb-0">
                {/* Horizontal connector line */}
                <div className="absolute left-4 top-3.5 w-4 h-0.5 bg-gray-600"></div>
                
                {/* Role badge */}
                <div className={`mb-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${role.color}-500/20 text-${role.color}-400 border border-${role.color}-500/30`}>
                  {role.name}
                </div>
                
                {/* Role description (brief) */}
                <p className="text-xs text-gray-400 ml-1">
                  {role.description}
                </p>
              </div>
            ))
          }
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          Higher roles typically have all capabilities of lower roles, plus additional privileges.
        </p>
      </div>
    );
  };
  
  // Render role details cards
  const renderRoleDetails = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {Object.entries(roleDescriptions)
          .sort(([, a], [, b]) => b.importance - a.importance)
          .map(([roleKey, role]) => {
            const isExpanded = expandedRole === roleKey;
            const roleIndex = ['MASTER_ADMIN_ROLE', 'DEFAULT_ADMIN_ROLE', 'ADMIN_ROLE', 'SCHOOL_ROLE', 'TEACHER_ROLE'].indexOf(roleKey);
            const roleId = roleIndex !== -1 && rolesData ? rolesData[roleIndex]?.result as string : '';
            
            return (
              <motion.div
                key={roleKey}
                initial={{ height: 'auto' }}
                animate={{ height: 'auto' }}
                className={`bg-gray-700/30 border border-gray-600 rounded-lg overflow-hidden`}
              >
                {/* Role Header */}
                <div 
                  className={`p-3 cursor-pointer flex items-center justify-between bg-${role.color}-500/10 hover:bg-${role.color}-500/20 transition-colors`}
                  onClick={() => toggleRoleExpansion(roleKey)}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full bg-${role.color}-500/20 text-${role.color}-400 flex items-center justify-center mr-3`}>
                      {role.icon}
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium text-${role.color}-400`}>{role.name}</h4>
                      <p className="text-xs text-gray-400">{roleKey}</p>
                    </div>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Role Details (expandable) */}
                {isExpanded && (
                  <div className="p-3 border-t border-gray-600">
                    <p className="text-sm text-gray-300 mb-3">{role.description}</p>
                    
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-gray-400 mb-1">Role Identifier:</h5>
                      <div className="flex items-center">
                        <span className="text-xs font-mono text-gray-300">{formatRoleId(roleId)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-gray-400 mb-1">Capabilities:</h5>
                      <ul className="text-xs text-gray-300 space-y-1">
                        {role.capabilities.map((capability, index) => (
                          <li key={index} className="flex items-start">
                            <svg className={`w-3 h-3 text-${role.color}-400 mr-1 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {capability}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        }
      </div>
    );
  };
  
  // Render role lookup results
  const renderRoleLookupResults = () => {
    if (!lookupRolesData || lookupRolesData.length !== 5) {
      return null;
    }
    
    const hasAnyRole = lookupRolesData.some(data => data.result);
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Roles for Address: <span className="font-mono text-xs">{lookupAddress}</span></h4>
        
        {hasAnyRole ? (
          <div className="space-y-2">
            {Object.entries(roleDescriptions)
              .sort(([, a], [, b]) => b.importance - a.importance)
              .map(([roleKey, role]) => {
                const roleIndex = ['MASTER_ADMIN_ROLE', 'DEFAULT_ADMIN_ROLE', 'ADMIN_ROLE', 'SCHOOL_ROLE', 'TEACHER_ROLE'].indexOf(roleKey);
                const hasRole = roleIndex !== -1 && lookupRolesData[roleIndex]?.result;
                
                return (
                  <div 
                    key={roleKey}
                    className={`p-3 rounded-md border ${
                      hasRole 
                        ? `border-${role.color}-500/30 bg-${role.color}-500/10` 
                        : 'border-gray-600 bg-gray-700/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full ${
                          hasRole 
                            ? `bg-${role.color}-500/20 text-${role.color}-400` 
                            : 'bg-gray-600/20 text-gray-400'
                        } flex items-center justify-center mr-2`}>
                          {hasRole ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h5 className={`text-sm font-medium ${
                            hasRole ? `text-${role.color}-400` : 'text-gray-400'
                          }`}>
                            {role.name}
                          </h5>
                          <p className="text-xs text-gray-400">{roleKey}</p>
                        </div>
                      </div>
                      
                      {/* Revoke Button (if user has permission) */}
                      {revokeRoleFunction && hasRole && (userRoles.MASTER_ADMIN_ROLE || userRoles.DEFAULT_ADMIN_ROLE) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole(roleKey);
                            handleRevokeRole();
                          }}
                          className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md text-xs hover:bg-red-500/30 transition-colors"
                          disabled={isRevokeProcessing}
                        >
                          {isRevokeProcessing && selectedRole === roleKey ? (
                            <div className="w-4 h-4 border-2 border-t-red-400 border-red-200/30 rounded-full animate-spin mx-auto"></div>
                          ) : (
                            'Revoke'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>
        ) : (
          <div className="bg-gray-700/20 p-4 rounded-md text-center">
            <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-gray-400 mb-1">No Roles Assigned</p>
            <p className="text-xs text-gray-500">This address doesn't have any administrative roles in the system.</p>
            
            {/* Grant Role Button (if user has permission) */}
            {grantRoleFunction && (userRoles.MASTER_ADMIN_ROLE || userRoles.DEFAULT_ADMIN_ROLE) && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">Want to grant a role to this address?</p>
                <div className="flex space-x-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a role</option>
                    {Object.entries(roleDescriptions).map(([roleKey, role]) => (
                      <option key={roleKey} value={roleKey}>{role.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleGrantRole}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                    disabled={isGrantProcessing || !selectedRole}
                  >
                    {isGrantProcessing ? (
                      <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin"></div>
                    ) : (
                      'Grant'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // Render grant role form
  const renderGrantRoleForm = () => {
    if (!grantRoleFunction || !(userRoles.MASTER_ADMIN_ROLE || userRoles.DEFAULT_ADMIN_ROLE)) {
      return (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-4 text-center">
          <svg className="w-10 h-10 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-yellow-400 mb-1">Access Restricted</p>
          <p className="text-sm text-gray-300">You need administrative privileges to grant roles.</p>
        </div>
      );
    }
    
    return (
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Grant Role to Address</h4>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="grant-address" className="block text-xs text-gray-400 mb-1">Address</label>
            <input
              id="grant-address"
              type="text"
              value={grantAddress}
              onChange={(e) => {
                setGrantAddress(e.target.value);
                setValidationError('');
              }}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={isGrantProcessing}
            />
            {validationError && (
              <p className="text-xs text-red-400 mt-1">{validationError}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="grant-role" className="block text-xs text-gray-400 mb-1">Role to Grant</label>
            <select
              id="grant-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGrantProcessing}
            >
              <option value="">Select a role</option>
              {Object.entries(roleDescriptions).map(([roleKey, role]) => (
                <option key={roleKey} value={roleKey}>{role.name}</option>
              ))}
            </select>
          </div>
          
          {selectedRole && (
            <div className={`p-2 rounded-md bg-${roleDescriptions[selectedRole].color}-500/10 border border-${roleDescriptions[selectedRole].color}-500/30`}>
              <p className="text-xs text-gray-300">
                <span className={`text-${roleDescriptions[selectedRole].color}-400 font-medium`}>{roleDescriptions[selectedRole].name}</span>: {roleDescriptions[selectedRole].description}
              </p>
            </div>
          )}
          
          {/* Grant button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGrantRole}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isGrantProcessing || !selectedRole || !grantAddress
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isGrantProcessing || !selectedRole || !grantAddress}
            >
              {isGrantProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Granting Role...
                </span>
              ) : (
                'Grant Role'
              )}
            </button>
          </div>
          
          {/* Success message */}
          {isGrantConfirmed && !isGrantConfirming && (
            <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3 mt-2">
              <p className="text-sm">Role successfully granted!</p>
              <div className="mt-1 flex items-center">
                <span className="text-xs text-gray-400 mr-2">Transaction Hash:</span>
                <a 
                  href={`https://etherscan.io/tx/${grantRoleHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono truncate hover:underline"
                >
                  {grantRoleHash}
                </a>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {grantError && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mt-2">
              <p className="text-sm">Error granting role: {(grantError as Error).message || 'Unknown error'}</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <h3 className="text-lg font-medium text-blue-400 mb-2 md:mb-0">
          Educational Role Management
        </h3>
        
        {/* User's Roles Badge */}
        {connectedAddress && hasRoleFunction && userRolesData && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(roleDescriptions)
              .filter(([roleKey]) => userRoles[roleKey])
              .map(([roleKey, role]) => (
                <div 
                  key={roleKey}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium bg-${role.color}-500/20 text-${role.color}-400 border border-${role.color}-500/30 flex items-center`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full bg-${role.color}-400 mr-1.5`}></div>
                  {role.name}
                </div>
              ))
            }
            {!Object.values(userRoles).some(Boolean) && (
              <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400 border border-gray-600">
                No Administrative Roles
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'overview' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Role Overview
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'lookup' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('lookup')}
        >
          Role Lookup
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'grant' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('grant')}
        >
          Grant Role
        </button>
      </div>
      
      {/* Loading State */}
      {isLoadingRoles && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-3"></div>
          <span className="text-sm text-gray-300">Loading role information...</span>
        </div>
      )}
      
      {/* Error State */}
      {isRolesError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <p className="text-sm">Error loading role information. Please try again later.</p>
        </div>
      )}
      
      {/* Tab Content */}
      {!isLoadingRoles && !isRolesError && (
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Role System Overview</h4>
                <p className="text-sm text-gray-300">
                  This educational system uses role-based access control to manage permissions and responsibilities. Different roles have different capabilities within the system, arranged in a hierarchical structure from highest authority (Master Administrator) to specialized roles (Teacher).
                </p>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/40 rounded-md p-3">
                    <div className="flex items-center text-purple-400 mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <h5 className="text-sm font-medium">Role-Based Access</h5>
                    </div>
                    <p className="text-xs text-gray-400">
                      Each role has specific permissions and capabilities within the system, determining what actions a user can perform.
                    </p>
                  </div>
                  
                  <div className="bg-gray-700/40 rounded-md p-3">
                    <div className="flex items-center text-blue-400 mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h5 className="text-sm font-medium">Hierarchical Structure</h5>
                    </div>
                    <p className="text-xs text-gray-400">
                      Roles follow a hierarchy where higher roles typically have all the capabilities of lower roles plus additional privileges.
                    </p>
                  </div>
                  
                  <div className="bg-gray-700/40 rounded-md p-3">
                    <div className="flex items-center text-green-400 mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <h5 className="text-sm font-medium">Administrative Control</h5>
                    </div>
                    <p className="text-xs text-gray-400">
                      Higher-level administrators can grant or revoke roles, providing governance and access control throughout the system.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Role Hierarchy */}
              {renderRoleHierarchy()}
              
              {/* Role Details */}
              {renderRoleDetails()}
            </div>
          )}
          
          {/* Lookup Tab */}
          {activeTab === 'lookup' && (
            <div className="space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Role Lookup</h4>
                <p className="text-sm text-gray-300 mb-4">
                  Check which roles are assigned to a specific address in the educational system.
                </p>
                
                <div className="flex space-x-2">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={lookupAddress}
                      onChange={(e) => {
                        setLookupAddress(e.target.value);
                        setValidationError('');
                        setLookupInitiated(false);
                      }}
                      placeholder="Address to check (0x...)"
                      className={`w-full px-3 py-2 bg-gray-700 border ${
                        validationError ? 'border-red-500' : 'border-gray-600'
                      } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      disabled={isLoadingLookupRoles}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLookup}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoadingLookupRoles || !lookupAddress}
                  >
                    {isLoadingLookupRoles ? (
                      <div className="w-5 h-5 border-2 border-t-white border-white/30 rounded-full animate-spin"></div>
                    ) : (
                      'Check Roles'
                    )}
                  </button>
                </div>
                {validationError && (
                  <p className="text-xs text-red-400 mt-1">{validationError}</p>
                )}
              </div>
              
              {/* Lookup Results */}
              {isLoadingLookupRoles && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
                  <span className="text-sm text-gray-300">Checking roles...</span>
                </div>
              )}
              
              {!isLoadingLookupRoles && lookupInitiated && renderRoleLookupResults()}
            </div>
          )}
          
          {/* Grant Role Tab */}
          {activeTab === 'grant' && (
            <div className="space-y-4">
              {renderGrantRoleForm()}
              
              <div className="bg-gray-700/20 rounded-md p-3">
                <h4 className="text-sm font-medium text-gray-300 mb-2">About Role Management</h4>
                <p className="text-sm text-gray-400 mb-2">
                  Granting roles is an administrative function that gives specific capabilities to addresses within the educational system. Different roles have different levels of access and responsibility.
                </p>
                <p className="text-sm text-gray-400">
                  Only addresses with appropriate administrative roles (Master Admin or Default Admin) can grant roles to others. Carefully consider which roles to grant to which addresses, as each role provides specific permissions within the system.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Educational Guide: Role-Based Access Control</h4>
        <p className="text-sm text-gray-400 mb-3">
          This system implements role-based access control (RBAC) using the OpenZeppelin AccessControl contract. RBAC is a method of restricting system access to authorized users based on their assigned roles within the organization.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-blue-400 mb-1">How Roles Work in Blockchain</h5>
            <p className="text-xs text-gray-400">
              In blockchain-based educational systems, roles are represented by unique identifiers (bytes32 values) that are associated with Ethereum addresses. When an address attempts to perform an action, the smart contract checks if that address has the required role before allowing the action to proceed.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-green-400 mb-1">Benefits of Role-Based Access</h5>
            <p className="text-xs text-gray-400">
              RBAC provides numerous benefits: it simplifies administration by grouping permissions, enhances security by limiting access based on responsibilities, and facilitates compliance by clearly defining who can perform which actions within the system.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RoleManagementDashboard;