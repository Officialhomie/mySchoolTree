import { useState, useEffect } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import StudentReputationViewer from '../../MSTReadfunction/StudentProfileRead/getStudentReputation';

/**
 * ReputationPenaltyForm Component
 * 
 * This component allows authorized users to apply reputation penalties to students.
 * It provides a form to input the student address, penalty points, and reason,
 * then submits this information to the blockchain via the applyReputationPenalty function.
 */
interface ReputationPenaltyFormProps {
  readContract: any; // Contract configuration for read operations
  writeContract: {
    abi: any; // Contract ABI
    address: `0x${string}`; // Contract address
  }; 
  studentAddress?: `0x${string}`; // Optional: specific student address to penalize
  onPenaltyApplied?: (success: boolean, address: string) => void; // Optional callback
}

interface ReputationData {
  attendancePoints: bigint;
  behaviorPoints: bigint;
  academicPoints: bigint;
  lastUpdateTime: bigint;
  totalPoints: bigint;
}

const ReputationPenaltyForm = ({
  readContract,
  writeContract,
  studentAddress,
  onPenaltyApplied
}: ReputationPenaltyFormProps) => {
  // Access the connected wallet address
  const { address: connectedAddress } = useAccount();
  
  // Component state
  const [address, setAddress] = useState<string>(studentAddress || '');
  const [points, setPoints] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [validationError, setValidationError] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [penaltyNote, setPenaltyNote] = useState<string>('');
  const [penaltySuccess, setPenaltySuccess] = useState<boolean | undefined>(undefined);
  const [reputationData, setReputationData] = useState<ReputationData | null>(null);
  
  // Flag to determine if user should provide their own address
  const useCustomAddress = !studentAddress;

  // Setup the contract write operation
  const { 
    writeContractAsync,
    isPending: isApplyingPenalty,
    isSuccess: isPenaltySuccess,
    isError: isPenaltyError,
    error: penaltyError,
    reset: resetPenalty
  } = useWriteContract();

  // Update address state when studentAddress prop changes
  useEffect(() => {
    if (studentAddress) {
      setAddress(studentAddress);
    }
  }, [studentAddress]);

  // Handle effects for successful penalty application
  useEffect(() => {
    if (isPenaltySuccess && penaltySuccess === undefined) {
      setPenaltySuccess(true);
      setPenaltyNote(`Reputation penalty of ${points} points has been successfully applied to the student.`);
      setShowConfirmation(false);
      
      if (onPenaltyApplied) {
        onPenaltyApplied(true, address);
      }
    }
  }, [isPenaltySuccess, penaltySuccess, address, points, onPenaltyApplied]);

  // Handle effects for failed penalty application
  useEffect(() => {
    if (isPenaltyError && penaltySuccess === undefined) {
      setPenaltySuccess(false);
      setPenaltyNote(`Error applying penalty: ${penaltyError?.message || 'Unknown error'}`);
    }
  }, [isPenaltyError, penaltyError, penaltySuccess]);

  // Handle address input change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    validateField('address', value);
  };

  // Handle points input change
  const handlePointsChange = (value: string) => {
    // Only allow numeric input
    if (/^\d*$/.test(value)) {
      setPoints(value);
      validateField('points', value);
    }
  };

  // Handle reason input change
  const handleReasonChange = (value: string) => {
    setReason(value);
    validateField('reason', value);
  };

  // Validate individual field
  const validateField = (field: string, value: string): boolean => {
    const errors = { ...validationError };
    
    switch (field) {
      case 'address':
        if (!value) {
          errors.address = 'Student address is required';
        } else if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          errors.address = 'Invalid Ethereum address format';
        } else {
          delete errors.address;
        }
        break;
        
      case 'points':
        if (!value) {
          errors.points = 'Penalty points are required';
        } else if (parseInt(value) <= 0) {
          errors.points = 'Penalty must be greater than 0';
        } else {
          delete errors.points;
        }
        break;
        
      case 'reason':
        if (!value.trim()) {
          errors.reason = 'Reason for penalty is required';
        } else if (value.trim().length < 10) {
          errors.reason = 'Please provide a more detailed reason (at least 10 characters)';
        } else {
          delete errors.reason;
        }
        break;
    }
    
    setValidationError(errors);
    return !errors[field];
  };

  // Validate all fields
  const validateAllFields = (): boolean => {
    const addressValid = validateField('address', address);
    const pointsValid = validateField('points', points);
    const reasonValid = validateField('reason', reason);
    
    return addressValid && pointsValid && reasonValid;
  };

  // Reset the form
  const resetForm = () => {
    if (!studentAddress) setAddress('');
    setPoints('');
    setReason('');
    setValidationError({});
    setPenaltySuccess(undefined);
    resetPenalty();
  };

  // Handle penalty submission
  const handleSubmitPenalty = async () => {
    if (!validateAllFields()) {
      return;
    }

    try {
      // Call the contract with the correctly structured parameters
      await writeContractAsync({
        abi: writeContract.abi, 
        address: writeContract.address,
        functionName: 'applyReputationPenalty',
        args: [
          address as `0x${string}`,
          BigInt(points),
          reason
        ]
      });
      
      setPenaltyNote('Reputation penalty transaction submitted. It may take a moment to process.');
    } catch (error) {
      console.error('Error applying penalty:', error);
      setPenaltySuccess(false);
      setPenaltyNote('Error submitting penalty transaction. Please try again.');
    }
  };

  // Handle reputation data fetched from the viewer component
  const handleReputationFetched = (data: ReputationData) => {
    setReputationData(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-red-400 mb-3">
        Apply Reputation Penalty
      </h3>
      
      {/* Connected Wallet Information */}
      {connectedAddress && (
        <div className="mb-4 bg-gray-700/30 p-3 rounded-md">
          <p className="text-xs text-gray-400">
            Authorized as: <span className="text-blue-400 font-mono">{connectedAddress}</span>
          </p>
        </div>
      )}
      
      {/* Reputation Viewer - Shows the student's current reputation before applying penalty */}
      {address && !validationError.address && (
        <div className="mb-6">
          <StudentReputationViewer
            contract={readContract}
            studentAddress={address as `0x${string}`}
            onDataFetched={handleReputationFetched}
          />
        </div>
      )}
      
      {/* Penalty Form */}
      <div className="space-y-4 mt-6 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-300 mb-3">
          Penalty Details
        </h4>
        
        {/* Student Address Field */}
        {useCustomAddress && (
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Student Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError.address ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {validationError.address && (
              <p className="text-xs text-red-400">{validationError.address}</p>
            )}
          </div>
        )}
        
        {/* Penalty Points Field */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Penalty Points</label>
          <input
            type="text"
            value={points}
            onChange={(e) => handlePointsChange(e.target.value)}
            placeholder="Enter points to deduct"
            className={`w-full px-3 py-2 bg-gray-700 border ${
              validationError.points ? 'border-red-500' : 'border-gray-600'
            } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {validationError.points && (
            <p className="text-xs text-red-400">{validationError.points}</p>
          )}
        </div>
        
        {/* Reason Field */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Reason for Penalty</label>
          <textarea
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            placeholder="Provide a detailed explanation for this penalty"
            rows={4}
            className={`w-full px-3 py-2 bg-gray-700 border ${
              validationError.reason ? 'border-red-500' : 'border-gray-600'
            } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
          />
          {validationError.reason && (
            <p className="text-xs text-red-400">{validationError.reason}</p>
          )}
        </div>
        
        {/* Impact Preview - Shows how the penalty will affect the student's total points */}
        {reputationData && points && !validationError.points && (
          <div className="mt-4 p-3 bg-gray-800/70 rounded-md">
            <h5 className="text-sm text-gray-300 mb-2">Penalty Impact Preview</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Current Total Points</p>
                <p className="text-lg font-bold text-white">{reputationData.totalPoints.toString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">After Penalty</p>
                <p className="text-lg font-bold text-white">
                  {Math.max(0, Number(reputationData.totalPoints) - Number(points))}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateAllFields()) {
                setShowConfirmation(true);
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            disabled={isApplyingPenalty}
          >
            Apply Penalty
          </button>
        </div>
      </div>
      
      {/* Confirmation Dialog - Prevents accidental submissions */}
      {showConfirmation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-medium text-red-400 mb-4">
              Confirm Reputation Penalty
            </h4>
            
            <div className="bg-gray-700/30 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-300 mb-3">
                You are about to apply a <span className="text-red-400 font-bold">{points} point penalty</span> to:
              </p>
              
              <div className="bg-gray-800/50 p-2 rounded font-mono text-xs text-gray-300 break-all mb-3">
                {address}
              </div>
              
              <div className="mb-3">
                <p className="text-sm text-gray-400 mb-1">Reason:</p>
                <p className="text-sm text-white bg-gray-800/50 p-2 rounded">
                  {reason}
                </p>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 text-sm text-yellow-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    This action will permanently reduce the student's reputation points. It cannot be undone.
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPenalty}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isApplyingPenalty}
              >
                {isApplyingPenalty ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying...
                  </span>
                ) : (
                  'Confirm Penalty'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Penalty Result - Shows after transaction is processed */}
      {penaltySuccess !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-6 ${
            penaltySuccess 
              ? 'bg-green-900/20 border border-green-700/30' 
              : 'bg-red-900/20 border border-red-700/30'
          } rounded-lg p-4`}
        >
          <div className="flex items-start">
            {penaltySuccess ? (
              <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <h4 className={`text-lg font-medium ${penaltySuccess ? 'text-green-400' : 'text-red-400'}`}>
                {penaltySuccess ? 'Penalty Applied Successfully' : 'Penalty Application Failed'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {penaltyNote}
              </p>
              
              {penaltySuccess && (
                <div className="mt-3 pt-3 border-t border-green-700/30">
                  <p className="text-sm text-gray-300">
                    The student's reputation has been updated. You can view their updated reputation profile or apply another penalty.
                  </p>
                  
                  <div className="mt-3 flex space-x-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Apply Another Penalty
                    </button>
                  </div>
                </div>
              )}
              
              {!penaltySuccess && (
                <div className="mt-3 pt-3 border-t border-red-700/30">
                  <button
                    type="button"
                    onClick={() => {
                      setPenaltySuccess(undefined);
                      setPenaltyNote('');
                    }}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-red-400 mb-2">About Reputation Penalties</h4>
        <p className="text-sm text-gray-300 mb-3">
          Reputation penalties are applied when a student fails to meet academic, behavioral, or attendance expectations. These should be used thoughtfully and fairly.
        </p>
        <p className="text-sm text-gray-300">
          When applying a penalty, consider:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mt-2 pl-2">
          <li>The severity of the infraction</li>
          <li>Previous warnings or penalties</li>
          <li>The student's overall reputation standing</li>
          <li>Potential for improvement and learning</li>
        </ul>
        <div className="mt-4 bg-gray-800/50 rounded-md p-3">
          <p className="text-sm text-gray-400">
            <span className="text-red-400 font-medium">Note:</span> All penalty actions are permanently recorded on the blockchain and cannot be reversed. Ensure accuracy and fairness before applying penalties.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ReputationPenaltyForm;