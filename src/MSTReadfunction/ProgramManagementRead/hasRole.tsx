import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';

/**
 * RoleChecker Component
 * 
 * This component checks if a specific address has a certain role in the contract.
 * It allows inputting both the role ID and the address to check.
 */
interface RoleCheckerProps {
  contract: any;
  initialRoleId?: string; // Optional initial role ID to check
  initialAddress?: string; // Optional initial address to check
  predefinedRoles?: Record<string, string>; // Optional mapping of role names to role IDs
  onRoleCheckResult?: (hasRole: boolean, roleId: string, account: string) => void; // Callback for results
}

const RoleChecker = ({ 
  contract, 
  initialRoleId = '',
  initialAddress = '',
  predefinedRoles = {},
  onRoleCheckResult
}: RoleCheckerProps) => {
  // State for inputs and validation
  const [roleId, setRoleId] = useState<string>(initialRoleId);
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');
  const [address, setAddress] = useState<string>(initialAddress);
  const [isAddressValid, setIsAddressValid] = useState<boolean>(initialAddress ? isAddress(initialAddress) : false);
  const [hasQueried, setHasQueried] = useState<boolean>(false);
  
  // Get predefined role names as options
  const roleOptions = Object.keys(predefinedRoles);
  
  // Check if a specific address has a role
  const { 
    data: hasRoleData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'hasRole',
    args: [roleId, address],
    enabled: hasQueried && isAddressValid && roleId !== '', // Only run when all inputs are valid and user has triggered a query
  });

  // Update address validation when input changes
  useEffect(() => {
    const valid = address ? isAddress(address) : false;
    setIsAddressValid(valid);
  }, [address]);

  // Handle role selection
  const handleRoleSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleName = e.target.value;
    setSelectedRoleName(roleName);
    
    if (roleName && predefinedRoles[roleName]) {
      setRoleId(predefinedRoles[roleName]);
    } else {
      setRoleId('');
    }
  };

  // Handle custom role ID input
  const handleRoleIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoleId(e.target.value);
    setSelectedRoleName('');
  };

  // Handle address input
  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  // Handle query submission
  const handleCheckRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddressValid && roleId) {
      setHasQueried(true);
    }
  };

  // Call the callback when result is received
  useEffect(() => {
    if (isSuccess && hasRoleData !== undefined && onRoleCheckResult) {
      onRoleCheckResult(!!hasRoleData, roleId, address);
    }
  }, [hasRoleData, isSuccess, roleId, address, onRoleCheckResult]);

  // Render the component UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Role Permission Checker
      </h3>
      
      <form onSubmit={handleCheckRole} className="space-y-4">
        {/* Role Selection */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">
            Role to Check:
          </label>
          
          {roleOptions.length > 0 && (
            <div className="mb-2">
              <select
                value={selectedRoleName}
                onChange={handleRoleSelection}
                className="w-full bg-gray-700/50 border border-gray-600 focus:border-blue-500 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="">Select a predefined role</option>
                {roleOptions.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleName}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex space-x-2 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={roleId}
                onChange={handleRoleIdInput}
                placeholder="Enter role ID (bytes32)"
                className="w-full bg-gray-700/50 border border-gray-600 focus:border-blue-500 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </div>
            {selectedRoleName && (
              <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs">
                {selectedRoleName}
              </div>
            )}
          </div>
          
          {roleId && !roleId.startsWith('0x') && (
            <p className="text-xs text-yellow-400">Note: Role IDs should typically start with '0x'</p>
          )}
        </div>
        
        {/* Address Input */}
        <div className="space-y-2">
          <label htmlFor="address-input" className="block text-sm text-gray-400">
            Address to Check:
          </label>
          <input
            id="address-input"
            type="text"
            value={address}
            onChange={handleAddressInput}
            placeholder="0x..."
            className={`w-full bg-gray-700/50 border ${
              address && !isAddressValid
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-gray-600 focus:border-blue-500'
            } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
          />
          {address && !isAddressValid && (
            <p className="text-xs text-red-400">Please enter a valid Ethereum address</p>
          )}
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isAddressValid || !roleId || isLoading}
          className={`w-full py-2 px-4 rounded text-sm font-medium ${
            !isAddressValid || !roleId || isLoading
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
              <span>Checking...</span>
            </div>
          ) : (
            'Check Role'
          )}
        </button>
      </form>
      
      {/* Results Display */}
      {hasQueried && (
        <div className="mt-5 border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Results</h4>
          
          {error && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
              <p className="text-sm">Error checking role: {(error as Error).message || 'Unknown error'}</p>
              <button 
                onClick={() => refetch()} 
                className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
              >
                Try Again
              </button>
            </div>
          )}
          
          {isSuccess && hasRoleData !== undefined && (
            <div className="space-y-3">
              <div className={`p-3 rounded-md ${
                hasRoleData
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-red-500/20 border border-red-500/30'
              }`}>
                <div className="flex items-center">
                  {hasRoleData ? (
                    <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <p className={`text-sm font-medium ${hasRoleData ? 'text-green-400' : 'text-red-400'}`}>
                    {hasRoleData 
                      ? 'Address has this role' 
                      : 'Address does not have this role'}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-700/50 rounded-md p-3">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-xs text-gray-400">Role ID:</p>
                    <p className="text-sm font-mono text-gray-300 break-all">
                      {roleId}
                      {selectedRoleName && (
                        <span className="ml-1 text-blue-400">({selectedRoleName})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Address:</p>
                    <p className="text-sm font-mono text-gray-300 break-all">{address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Result:</p>
                    <p className="text-sm text-gray-200">
                      {hasRoleData ? 'True (Has Role)' : 'False (No Role)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default RoleChecker;