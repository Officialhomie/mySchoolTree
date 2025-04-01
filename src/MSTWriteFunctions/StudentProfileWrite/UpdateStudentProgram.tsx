import React, { useState, useEffect } from 'react';
import { 
  useAccount, 
  useReadContracts, 
  useReadContract 
} from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';

/**
 * UpdateStudentProgram Component
 * 
 * A component that allows teachers to update a student's program:
 * 1. Checks if the caller has a teacher role
 * 2. Verifies the student's active status
 * 3. Allows updating the student's program ID
 */
interface UpdateStudentProgramProps {
  roleContract: any;     // Contract for role-based access control
  studentContract: any;  // Contract for student details
  studentStatusContract: any; // Contract for checking student status
  writeContract: any;    // Contract for writing updates
}

// Type for validation error
type ValidationError = {
  type: 'role' | 'status' | 'input';
  message: string;
};

const UpdateStudentProgram: React.FC<UpdateStudentProgramProps> = ({
  roleContract,
  studentContract,
  studentStatusContract,
  writeContract
}) => {
  // User account
  const { address: connectedAddress } = useAccount();

  // State management
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  const [isAddressValid, setIsAddressValid] = useState<boolean>(false);
  const [isProgramIdValid, setIsProgramIdValid] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string>('');

  // Comprehensive contract checks
  const { 
    data: accessCheckData, 
    isLoading: isLoadingAccessChecks,
  } = useReadContracts({
    contracts: [
      // Check if connected address has teacher role
      { 
        ...roleContract, 
        functionName: 'hasRole', 
        args: [roleContract.teacherRole, connectedAddress] 
      },
      // Check student status if an address is entered
      ...(studentAddress && isAddressValid ? [
        {
          ...studentStatusContract,
          functionName: 'isActiveStudent',
          args: [studentAddress as `0x${string}`]
        }
      ] : [])
    ],
    query: {
      enabled: !!connectedAddress && isAddressValid
    }
  });

  // Fetch current student program
  const { 
    data: currentProgram,
    refetch: refetchProgram
  } = useReadContract({
    ...studentContract,
    functionName: 'getStudentProgram',
    args: [studentAddress as `0x${string}`],
    query: {
      enabled: hasSearched && 
               isAddressValid && 
               accessCheckData?.[0]?.result === true && // Teacher role check
               accessCheckData?.[1]?.result === true    // Student active check
    }
  });

  // Address validation effect
  useEffect(() => {
    const valid = studentAddress ? isAddress(studentAddress) : false;
    setIsAddressValid(valid);
  }, [studentAddress]);

  // Program ID validation effect
  useEffect(() => {
    const valid = /^\d+$/.test(programId) && parseInt(programId) >= 0;
    setIsProgramIdValid(valid);
  }, [programId]);

  // Validation check effect
  useEffect(() => {
    const errors: ValidationError[] = [];

    // Check role
    if (accessCheckData && accessCheckData[0]?.result === false) {
      errors.push({
        type: 'role',
        message: 'Only teachers can update student programs'
      });
    }

    // Check student status if applicable
    if (studentAddress && isAddressValid && 
        accessCheckData && 
        accessCheckData.length > 1 && 
        accessCheckData[1]?.result === false) {
      errors.push({
        type: 'status',
        message: 'Student is not active in the system'
      });
    }

    setValidationErrors(errors);
  }, [accessCheckData, studentAddress, isAddressValid]);

  // Handler for address input
  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentAddress(e.target.value);
    setHasSearched(false);
    setValidationErrors([]);
    setUpdateSuccess(null);
    setUpdateMessage('');
  };

  // Handler for program ID input
  const handleProgramIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgramId(e.target.value);
    setUpdateSuccess(null);
    setUpdateMessage('');
  };

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddressValid) {
      setHasSearched(true);
      refetchProgram();
    }
  };

  // Update program handler
  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAddressValid || !isProgramIdValid) {
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Call contract to update student program
      // This is a placeholder - implement actual contract call
      await writeContract.writeContract({
        address: writeContract.address,
        abi: writeContract.abi,
        functionName: 'updateStudentProgram',
        args: [studentAddress as `0x${string}`, BigInt(programId)]
      });
      
      setUpdateSuccess(true);
      setUpdateMessage('Student program updated successfully!');
      refetchProgram();
    } catch (error) {
      setUpdateSuccess(false);
      setUpdateMessage(`Error updating program: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Render validation error messages
  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
        {validationErrors.map((error, index) => (
          <p key={index} className="text-sm mb-1">
            {error.message}
          </p>
        ))}
      </div>
    );
  };

  // Render current program
  const renderCurrentProgram = () => {
    if (currentProgram === undefined) return null;

    return (
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-lg font-medium text-gray-200">
          Current Program
        </h4>
        <p className="text-gray-300 mt-2">
          Program ID: <span className="font-mono">{currentProgram?.toString()}</span>
        </p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Update Student Program
      </h3>

      {/* Address Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="student-address" className="block text-sm text-gray-400">
            Student Address:
          </label>
          <div className="flex space-x-2">
            <input
              id="student-address"
              type="text"
              value={studentAddress}
              onChange={handleAddressInput}
              placeholder="0x..."
              className={`flex-1 bg-gray-700/50 border ${
                studentAddress && !isAddressValid
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-gray-600 focus:border-blue-500'
              } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
            />
            <button
              type="submit"
              disabled={!isAddressValid || isLoadingAccessChecks}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                !isAddressValid || isLoadingAccessChecks
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoadingAccessChecks ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
                  <span>Checking...</span>
                </div>
              ) : (
                'Find Student'
              )}
            </button>
          </div>
          {studentAddress && !isAddressValid && (
            <p className="text-xs text-red-400">Please enter a valid Ethereum address</p>
          )}
        </div>
      </form>

      {/* Validation Errors */}
      {hasSearched && renderValidationErrors()}

      {/* Current Program */}
      {hasSearched && 
       validationErrors.length === 0 && 
       currentProgram !== undefined && 
       renderCurrentProgram()}

      {/* Update Program Form */}
      {hasSearched && 
       validationErrors.length === 0 && 
       currentProgram !== undefined && (
        <form onSubmit={handleUpdateProgram} className="space-y-3 mt-4">
          <div className="space-y-2">
            <label htmlFor="program-id" className="block text-sm text-gray-400">
              New Program ID:
            </label>
            <input
              id="program-id"
              type="text"
              value={programId}
              onChange={handleProgramIdInput}
              placeholder="Enter program ID number"
              className={`w-full bg-gray-700/50 border ${
                programId && !isProgramIdValid
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-gray-600 focus:border-blue-500'
              } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
            />
            {programId && !isProgramIdValid && (
              <p className="text-xs text-red-400">Please enter a valid program ID (non-negative integer)</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!isProgramIdValid || isUpdating}
            className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
              !isProgramIdValid || isUpdating
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
                <span>Updating...</span>
              </div>
            ) : (
              'Update Program'
            )}
          </button>
        </form>
      )}
      
      {/* Update Status Message */}
      {updateSuccess !== null && (
        <div className={`mt-4 ${updateSuccess ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} border rounded-md p-3`}>
          <p className="text-sm">{updateMessage}</p>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3 text-sm">
        <h4 className="font-medium text-blue-400 mb-2">Information</h4>
        <ul className="list-disc list-inside text-blue-300 space-y-1">
          <li>Only teachers can update student programs</li>
          <li>Students must be active in the system</li>
          <li>Program IDs must be non-negative integers</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default UpdateStudentProgram;