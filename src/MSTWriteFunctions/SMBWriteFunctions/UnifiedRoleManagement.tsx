import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

/**
 * UnifiedRoleManagement Component
 * 
 * This component provides a comprehensive interface for managing role-based access control
 * in smart contracts. It combines three key role management functions:
 * 1. Grant Role - Assign permissions to addresses
 * 2. Revoke Role - Remove permissions from addresses
 * 3. Renounce Role - Give up your own permissions voluntarily
 * 
 * The component provides appropriate safeguards, confirmation workflows, and educational
 * content to ensure administrators understand the implications of each action.
 */
const UnifiedRoleManagement = ({ contract }: { contract: any }) => {
  // Connected wallet account
  const { address: connectedAddress } = useAccount();

  // Common role definitions with descriptive names
  const ROLES = {
    ADMIN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE")),
    OPERATOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE")),
    MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE")),
    TEACHER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("TEACHER_ROLE")),
    STUDENT_ROLE: ethers.keccak256(ethers.toUtf8Bytes("STUDENT_ROLE")),
  };

  // Role options for dropdown
  const roleOptions = [
    { 
      name: "Admin", 
      value: ROLES.ADMIN_ROLE, 
      description: "Full access to all system functions and role management" 
    },
    { 
      name: "Manager", 
      value: ROLES.MANAGER_ROLE, 
      description: "Can manage organizations and administrative tasks" 
    },
    { 
      name: "Operator", 
      value: ROLES.OPERATOR_ROLE, 
      description: "Can perform day-to-day operations and maintenance" 
    },
    { 
      name: "Teacher", 
      value: ROLES.TEACHER_ROLE, 
      description: "Can create and manage educational content and assess students" 
    },
    { 
      name: "Student", 
      value: ROLES.STUDENT_ROLE, 
      description: "Can access learning materials and submit assignments" 
    },
  ];

  // Active operation type
  type OperationType = 'grant' | 'revoke' | 'renounce';
  const [activeOperation, setActiveOperation] = useState<OperationType>('grant');

  // Input states
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('');
  const [useCustomRole, setUseCustomRole] = useState<boolean>(false);
  const [targetAddress, setTargetAddress] = useState<string>('');

  // Role holders state
  const [roleHolders, setRoleHolders] = useState<{[key: string]: string[]}>({});
  const [loadingRoleHolders, setLoadingRoleHolders] = useState<boolean>(false);

  // Form validation state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [validForm, setValidForm] = useState(false);

  // UI state
  const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);

  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Current checked role and address for the has-role check
  const [checkRoleArgs, setCheckRoleArgs] = useState<[string, string] | undefined>();

  // Function to fetch role holders for a specific role
  const { refetch: refetchRoleHolders } = useReadContract({
    ...contract,
    functionName: 'getRoleMembers', // Assuming this function exists to get role members
    args: [selectedRole || (useCustomRole ? customRole : '')],
    enabled: false, // Don't fetch automatically
  });

  // Function to check if the connected address has a specific role
  const { data: hasRoleData } = useReadContract({
    ...contract,
    functionName: 'hasRole', // Standard function in AccessControl contracts
    args: checkRoleArgs,
    enabled: Boolean(checkRoleArgs), // Only enabled when we have valid args
  });

  // Fetch the role holders when role selection changes
  useEffect(() => {
    if ((selectedRole || (useCustomRole && customRole)) && ethers.isHexString(selectedRole || customRole)) {
      handleFetchRoleHolders();
    }
  }, [selectedRole, customRole, useCustomRole]);

  // Set target address to connected wallet when switching to RENOUNCE
  useEffect(() => {
    if (activeOperation === 'renounce' && connectedAddress) {
      setTargetAddress(connectedAddress);
    }
  }, [activeOperation, connectedAddress]);

  // Validate address when switching operations
  useEffect(() => {
    if (activeOperation === 'renounce' && targetAddress && targetAddress !== connectedAddress) {
      setErrors(prev => ({ ...prev, targetAddress: 'For renouncing a role, the address must be your connected wallet address' }));
    } else if (targetAddress) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.targetAddress;
        return newErrors;
      });
    }
  }, [activeOperation, targetAddress, connectedAddress]);

  // Input validation for ethereum addresses
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Handle fetching role holders
  const handleFetchRoleHolders = async () => {
    if (!selectedRole && (!useCustomRole || !customRole)) return;
    
    const roleToFetch = useCustomRole ? customRole : selectedRole;
    if (!ethers.isHexString(roleToFetch)) {
      setErrors(prev => ({ ...prev, customRole: 'Invalid role format. It should be a bytes32 hex string.' }));
      return;
    }
    
    try {
      setLoadingRoleHolders(true);
      const result = await refetchRoleHolders();
      
      if (result.data) {
        const holders = result.data as string[];
        setRoleHolders(prev => ({ ...prev, [roleToFetch]: holders }));
      } else {
        setStatusMessage('Failed to fetch role holders');
        setStatusType('error');
        setShowStatus(true);
      }
    } catch (err) {
      console.error('Error fetching role holders:', err);
      setStatusMessage(`Error fetching role holders: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
    } finally {
      setLoadingRoleHolders(false);
    }
  };

  // Handle role selection change
  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    setUseCustomRole(false);
    
    if (!value && !useCustomRole) {
      setErrors(prev => ({ ...prev, role: 'Please select a valid role' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.role;
        return newErrors;
      });
    }
  };

  // Handle custom role change
  const handleCustomRoleChange = (value: string) => {
    setCustomRole(value);
    
    if (!ethers.isHexString(value) && value !== '') {
      setErrors(prev => ({ ...prev, customRole: 'Invalid role format. It should be a bytes32 hex string.' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.customRole;
        return newErrors;
      });
    }
  };

  // Handle target address change
  const handleTargetAddressChange = (value: string) => {
    setTargetAddress(value);
    
    if (!isValidAddress(value) && value !== '') {
      setErrors(prev => ({ ...prev, targetAddress: 'Please enter a valid Ethereum address' }));
    } else if (activeOperation === 'renounce' && value !== connectedAddress) {
      setErrors(prev => ({ ...prev, targetAddress: 'For renouncing a role, the address must be your connected wallet address' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.targetAddress;
        return newErrors;
      });
    }
  };

  // Validate the entire form
  useEffect(() => {
    const role = useCustomRole ? customRole : selectedRole;
    const requiredFields = [role, targetAddress];
    const allFieldsFilled = requiredFields.every(field => field.trim() !== '');
    const noErrors = Object.keys(errors).length === 0;
    
    setValidForm(allFieldsFilled && noErrors);
  }, [selectedRole, customRole, useCustomRole, targetAddress, errors]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      // Set success message based on the operation
      let operationText = '';
      switch (activeOperation) {
        case 'grant':
          operationText = 'granted to';
          break;
        case 'revoke':
          operationText = 'revoked from';
          break;
        case 'renounce':
          operationText = 'renounced by';
          break;
      }

      const roleName = getRoleName(useCustomRole ? customRole : selectedRole);
      
      setStatusMessage(`Role ${roleName} successfully ${operationText} ${targetAddress}!`);
      setStatusType('success');
      setShowStatus(true);
      setConfirmationState('confirmed');
      
      // Refresh the role holders
      handleFetchRoleHolders();
    }
  }, [isConfirmed, hash]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
    }
  }, [writeError, confirmError]);

  // Hide status message after a delay
  useEffect(() => {
    if (showStatus) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showStatus]);

  // Get readable role name from bytes32 value
  const getRoleName = (roleValue: string): string => {
    const option = roleOptions.find(r => r.value === roleValue);
    if (option) return option.name;
    
    // If it's a custom role, show a shortened version
    if (roleValue) {
      const shortRole = `${roleValue.substring(0, 10)}...${roleValue.substring(roleValue.length - 8)}`;
      return `Custom (${shortRole})`;
    }
    
    return 'Unknown Role';
  };

  // Initial request to perform role operation
  const handleRoleOperationRequest = () => {
    if (!validForm) {
      setStatusMessage('Please fix form errors before submitting');
      setStatusType('error');
      setShowStatus(true);
      return;
    }

    // Check if the current user has the role they're trying to renounce
    if (activeOperation === 'renounce') {
      const role = useCustomRole ? customRole : selectedRole;
      
      // Set the arguments for the hasRole check
      setCheckRoleArgs(connectedAddress ? [role, connectedAddress] : undefined);
      
      // Watch for hasRoleData change in a useEffect
    } else {
      proceedToConfirmation();
    }
  };

  // Watch for hasRoleData changes when checking if user has role for renounce
  useEffect(() => {
    // Only proceed if we're in the initial state, to avoid re-triggering during confirmation
    if (activeOperation === 'renounce' && checkRoleArgs && confirmationState === 'initial') {
      if (hasRoleData === false) {
        setStatusMessage(`You cannot renounce a role that you don't have`);
        setStatusType('error');
        setShowStatus(true);
        setCheckRoleArgs(undefined); // Reset the check
      } else if (hasRoleData === true) {
        proceedToConfirmation();
        setCheckRoleArgs(undefined); // Reset the check
      }
    }
  }, [hasRoleData, checkRoleArgs, activeOperation, confirmationState]);

  // Helper function to proceed to confirmation state
  const proceedToConfirmation = () => {
    // Set to confirmation state
    setConfirmationState('confirm');
    
    // Prepare confirmation message based on operation
    let confirmMessage = '';
    switch (activeOperation) {
      case 'grant':
        confirmMessage = 'You are about to grant a role to the specified address.';
        break;
      case 'revoke':
        confirmMessage = 'You are about to revoke a role from the specified address.';
        break;
      case 'renounce':
        confirmMessage = 'You are about to renounce a role from your own address. This action cannot be undone.';
        break;
    }
    
    setStatusMessage(`${confirmMessage} Please review the details and confirm.`);
    setStatusType('warning');
    setShowStatus(true);
  };

  // Handle the actual role operation after confirmation
  const handleRoleOperationConfirm = async () => {
    try {
      // Reset any previous errors
      resetWrite?.();
      
      const role = useCustomRole ? customRole : selectedRole;
      
      // Call the appropriate contract function based on the operation
      let functionName: string;
      let args: any[];
      
      switch (activeOperation) {
        case 'grant':
          functionName = 'grantRole';
          args = [role, targetAddress];
          break;
        case 'revoke':
          functionName = 'revokeRole';
          args = [role, targetAddress];
          break;
        case 'renounce':
          functionName = 'renounceRole';
          args = [role, targetAddress]; // For renounce, targetAddress should be the caller's address
          break;
        default:
          throw new Error('Invalid operation');
      }
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName,
        args
      });
      
      setStatusMessage('Transaction submitted. Waiting for confirmation...');
      setStatusType('info');
      setShowStatus(true);
    } catch (err) {
      console.error('Error performing role operation:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setConfirmationState('initial');
    }
  };

  // Cancel the operation request
  const handleCancel = () => {
    setConfirmationState('initial');
    setStatusMessage('Operation cancelled');
    setStatusType('info');
    setShowStatus(true);
  };

  // Get appropriate tab style based on active operation
  const getTabStyle = (operation: OperationType) => {
    return `px-4 py-2 text-sm font-medium rounded-t-lg ${
      activeOperation === operation 
        ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' 
        : 'bg-gray-900 text-gray-400 hover:text-gray-300 hover:bg-gray-800'
    }`;
  };

  // Get color scheme based on operation type
  const getOperationColor = () => {
    switch (activeOperation) {
      case 'grant':
        return 'blue';
      case 'revoke':
        return 'amber';
      case 'renounce':
        return 'red';
      default:
        return 'blue';
    }
  };

  // Get button gradient based on operation type
  const getButtonGradient = () => {
    switch (activeOperation) {
      case 'grant':
        return 'from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700';
      case 'revoke':
        return 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700';
      case 'renounce':
        return 'from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700';
      default:
        return 'from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Role Management
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Manage access control by granting, revoking, or renouncing roles in the system.
      </p>

      {/* Status Messages */}
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-3 rounded-md mb-6 ${
            statusType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            statusType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
            statusType === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          <p className="text-sm">{statusMessage}</p>
          {hash && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs">Transaction Hash:</p>
              <div className="flex items-center mt-1">
                <p className="text-xs font-mono truncate">{hash}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash);
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                  }}
                  className="ml-2 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Transaction Progress */}
      {(isPending || isConfirming) && (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isPending 
              ? 'Please confirm this transaction in your wallet' 
              : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
          </p>
        </div>
      )}

      {/* Operation Tabs */}
      <div className="mb-6 border-b border-gray-700">
        <div className="flex flex-wrap">
          <button
            onClick={() => setActiveOperation('grant')}
            className={getTabStyle('grant')}
          >
            Grant Role
          </button>
          <button
            onClick={() => setActiveOperation('revoke')}
            className={getTabStyle('revoke')}
          >
            Revoke Role
          </button>
          <button
            onClick={() => setActiveOperation('renounce')}
            className={getTabStyle('renounce')}
          >
            Renounce Role
          </button>
        </div>
      </div>

      {/* Form Content - Initial State */}
      {confirmationState === 'initial' && (
        <div className="space-y-6">
          {/* Operation Description */}
          <div className={`bg-${getOperationColor()}-900/20 rounded-lg p-4 border border-${getOperationColor()}-700/30`}>
            {activeOperation === 'grant' && (
              <p className="text-sm text-gray-300">
                Granting a role gives an address specific permissions within the system. 
                The target address will be able to call functions restricted by this role.
                Only addresses with admin permissions can grant roles.
              </p>
            )}
            {activeOperation === 'revoke' && (
              <p className="text-sm text-gray-300">
                Revoking a role removes permissions from an address. 
                This will prevent the address from calling functions restricted by this role.
                Only addresses with admin permissions can revoke roles.
              </p>
            )}
            {activeOperation === 'renounce' && (
              <div>
                <p className="text-sm text-gray-300">
                  Renouncing a role is a safety mechanism that lets you give up permissions you no longer need or want.
                  This action removes the specified role from your own address.
                </p>
                <p className="block mt-2 text-sm text-red-400">
                  Warning: This action cannot be undone without another admin granting the role back to you.
                </p>
              </div>
            )}
          </div>
          
          {/* Role Selection */}
          <div>
            <div className="flex items-center mb-3">
              <input
                id="usePresetRole"
                type="radio"
                checked={!useCustomRole}
                onChange={() => setUseCustomRole(false)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800 focus:ring-2"
              />
              <label htmlFor="usePresetRole" className="ml-2 text-sm font-medium text-gray-300">
                Select from common roles
              </label>
            </div>
            
            {!useCustomRole && (
              <div>
                <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-300 mb-1">
                  Role <span className="text-red-400">*</span>
                </label>
                <select
                  id="roleSelect"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.role ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-60`}
                >
                  <option value="">Select a role</option>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="mt-1 text-xs text-red-400">{errors.role}</p>
                )}
                {selectedRole && (
                  <p className="mt-1 text-xs text-gray-500">
                    {roleOptions.find(r => r.value === selectedRole)?.description}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex items-center mt-3">
              <input
                id="useCustomRole"
                type="radio"
                checked={useCustomRole}
                onChange={() => setUseCustomRole(true)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800 focus:ring-2"
              />
              <label htmlFor="useCustomRole" className="ml-2 text-sm font-medium text-gray-300">
                Enter custom role (bytes32)
              </label>
            </div>
            
            {useCustomRole && (
              <div className="mt-3">
                <label htmlFor="customRole" className="block text-sm font-medium text-gray-300 mb-1">
                  Custom Role Identifier <span className="text-red-400">*</span>
                </label>
                <input
                  id="customRole"
                  type="text"
                  value={customRole}
                  onChange={(e) => handleCustomRoleChange(e.target.value)}
                  placeholder="0x..."
                  disabled={isPending || isConfirming}
                  className={`bg-gray-800 border ${errors.customRole ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-60`}
                />
                {errors.customRole && (
                  <p className="mt-1 text-xs text-red-400">{errors.customRole}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter the bytes32 hash of the role (e.g. 0x0000...0000)
                </p>
              </div>
            )}
          </div>
          
          {/* Target Address */}
          <div>
            <label htmlFor="targetAddress" className="block text-sm font-medium text-gray-300 mb-1">
              {activeOperation === 'renounce' ? 'Your Address' : 'Target Address'} <span className="text-red-400">*</span>
            </label>
            <input
              id="targetAddress"
              type="text"
              value={targetAddress}
              onChange={(e) => handleTargetAddressChange(e.target.value)}
              placeholder="0x..."
              disabled={isPending || isConfirming || (activeOperation === 'renounce' && !!connectedAddress)}
              className={`bg-gray-800 border ${errors.targetAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-60`}
            />
            {errors.targetAddress && (
              <p className="mt-1 text-xs text-red-400">{errors.targetAddress}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {activeOperation === 'grant' && 'The address that will receive the role'}
              {activeOperation === 'revoke' && 'The address that will lose the role'}
              {activeOperation === 'renounce' && 'Your connected wallet address (auto-filled)'}
            </p>
          </div>
          
          {/* Role Holders Display */}
          {((selectedRole || (useCustomRole && customRole)) && ethers.isHexString(selectedRole || customRole)) && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold text-blue-400">Current Role Holders</h3>
                <button
                  onClick={handleFetchRoleHolders}
                  disabled={loadingRoleHolders}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 disabled:opacity-50"
                  title="Refresh role holders"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {loadingRoleHolders ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-100/30 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div>
                  {roleHolders[(useCustomRole ? customRole : selectedRole)] && roleHolders[(useCustomRole ? customRole : selectedRole)].length > 0 ? (
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {roleHolders[(useCustomRole ? customRole : selectedRole)].map((holder, index) => (
                        <li key={index} className="text-sm text-gray-300 font-mono flex items-center">
                          <span className="truncate">{holder}</span>
                          {holder.toLowerCase() === connectedAddress?.toLowerCase() && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md text-xs">You</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No addresses currently hold this role.</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRoleOperationRequest}
              disabled={!validForm || isPending || isConfirming}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getButtonGradient()} text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {activeOperation === 'grant' ? 'Grant Role' : 
               activeOperation === 'revoke' ? 'Revoke Role' : 
               'Renounce Role'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation State */}
      {confirmationState === 'confirm' && (
        <div className="space-y-6">
          <div className={`bg-${getOperationColor()}-900/20 rounded-lg p-4 border border-${getOperationColor()}-700/30`}>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Confirm Role Operation</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Operation</p>
                <p className="text-md text-gray-200 font-medium">
                  {activeOperation === 'grant' ? 'Grant Role' : 
                   activeOperation === 'revoke' ? 'Revoke Role' : 
                   'Renounce Role'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="text-md text-gray-200 font-medium">
                  {getRoleName(useCustomRole ? customRole : selectedRole)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">
                  {activeOperation === 'renounce' ? 'Your Address' : 'Target Address'}
                </p>
                <p className="text-md text-gray-200 font-mono truncate">
                  {targetAddress}
                </p>
              </div>
            </div>
            
            {activeOperation === 'renounce' && (
              <div className="mt-4 p-3 bg-red-900/20 rounded border border-red-800/30">
                <p className="text-sm text-red-400 font-medium">
                  Warning: This is a permanent action. You will no longer have this role after confirmation.
                  Another admin would need to grant this role back to you in the future if needed.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleCancel}
              disabled={isPending || isConfirming}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleRoleOperationConfirm}
              disabled={isPending || isConfirming}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getButtonGradient()} text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isPending || isConfirming ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmed State */}
      {confirmationState === 'confirmed' && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-green-400 mb-2">Operation Successful</h3>
          <p className="text-center text-gray-300 mb-6">
            {activeOperation === 'grant' && `Role has been successfully granted to the address.`}
            {activeOperation === 'revoke' && `Role has been successfully revoked from the address.`}
            {activeOperation === 'renounce' && `You have successfully renounced this role.`}
          </p>
          
          <button
            onClick={() => {
              setConfirmationState('initial');
              if (activeOperation === 'renounce') {
                setSelectedRole('');
                setCustomRole('');
                setTargetAddress(connectedAddress || '');
              }
            }}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium text-sm"
          >
            Perform Another Operation
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default UnifiedRoleManagement;