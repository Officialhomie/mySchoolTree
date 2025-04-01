import React, { useState } from 'react';
import { 
  useAccount, 
  useReadContracts, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { motion } from 'framer-motion';

interface StudentReputationUpdaterProps {
  reputationContract: any;
  roleContract: any;
  schoolContract: any;
}

const StudentReputationUpdater: React.FC<StudentReputationUpdaterProps> = ({
  reputationContract,
  roleContract,
  schoolContract
}) => {
  // User account and state management
  const { address: connectedAddress } = useAccount();

  // Form state
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [attendancePoints, setAttendancePoints] = useState<string>('0');
  const [behaviorPoints, setBehaviorPoints] = useState<string>('0');
  const [academicPoints, setAcademicPoints] = useState<string>('0');
  const [validationError, setValidationError] = useState<string>('');

  // Comprehensive contract checks
  const { 
    data: contractData, 
    isLoading: isLoadingChecks,
  } = useReadContracts({
    contracts: [
      // Check if contract is paused
      { 
        ...reputationContract, 
        functionName: 'paused' 
      },
      // Check caller's teacher role
      { 
        ...roleContract, 
        functionName: 'hasRole', 
        args: [roleContract.teacherRole, connectedAddress] 
      },
      // Check school status for caller's address
      { 
        ...schoolContract, 
        functionName: 'isActiveSchool', 
        args: [connectedAddress] 
      },
      // Check if student belongs to school
      { 
        ...schoolContract, 
        functionName: 'isStudentOfSchool', 
        args: [studentAddress, connectedAddress] 
      }
    ],
    query: {
      enabled: !!connectedAddress && !!studentAddress
    }
  });

  // Write contract for reputation update
  const { 
    data: updateHash, 
    error: updateError, 
    isPending: isUpdatePending,
    writeContract 
  } = useWriteContract();

  // Transaction receipt
  const { 
    isLoading: isConfirming, 
    isSuccess: isUpdateSuccess 
  } = useWaitForTransactionReceipt({ 
    hash: updateHash 
  });

  // Validation helpers
  const validateAddress = (address: string): boolean => {
    if (!address) {
      setValidationError('Student address is required');
      return false;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setValidationError('Invalid Ethereum address format');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // Validate points input
  const validatePoints = (points: string): boolean => {
    const numPoints = parseInt(points, 10);
    if (isNaN(numPoints) || numPoints < 0 || numPoints > 100) {
      setValidationError('Points must be a number between 0 and 100');
      return false;
    }
    return true;
  };

  // Handle reputation update
  const handleUpdateReputation = () => {
    // Validate all inputs
    if (!validateAddress(studentAddress)) return;
    if (!validatePoints(attendancePoints)) return;
    if (!validatePoints(behaviorPoints)) return;
    if (!validatePoints(academicPoints)) return;

    // Perform all checks before updating
    if (!contractData || contractData.length !== 4) {
      setValidationError('Unable to perform all required checks');
      return;
    }

    const [
      isPaused, 
      hasTeacherRole, 
      isSchoolActive, 
      isStudentOfSchool
    ] = contractData.map(result => result.result);

    // Comprehensive validation
    if (isPaused) {
      setValidationError('System is currently paused');
      return;
    }

    if (!hasTeacherRole) {
      setValidationError('Caller must have teacher role');
      return;
    }

    if (!isSchoolActive) {
      setValidationError('School is not active');
      return;
    }

    if (!isStudentOfSchool) {
      setValidationError('Student is not enrolled in this school');
      return;
    }

    // Proceed with reputation update
    writeContract({
      ...reputationContract,
      functionName: 'updateReputation',
      args: [
        studentAddress as `0x${string}`, 
        BigInt(attendancePoints), 
        BigInt(behaviorPoints), 
        BigInt(academicPoints)
      ]
    });
  };

  // Point input component
  const PointInput = ({ 
    label, 
    value, 
    onChange, 
    description 
  }: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    description: string 
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        placeholder="Enter points (0-100)"
      />
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-4">
        Student Reputation Management
      </h3>

      {/* Student Address Input */}
      <div className="mb-4">
        <label 
          htmlFor="student-address" 
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Student Address
        </label>
        <input
          id="student-address"
          type="text"
          value={studentAddress}
          onChange={(e) => {
            setStudentAddress(e.target.value);
            setValidationError('');
          }}
          placeholder="0x..."
          className={`w-full px-3 py-2 bg-gray-700 border ${
            validationError ? 'border-red-500' : 'border-gray-600'
          } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      {/* Point Inputs */}
      <PointInput
        label="Attendance Points"
        value={attendancePoints}
        onChange={setAttendancePoints}
        description="Points reflecting student's class attendance (0-100)"
      />

      <PointInput
        label="Behavior Points"
        value={behaviorPoints}
        onChange={setBehaviorPoints}
        description="Points reflecting student's conduct and behavior (0-100)"
      />

      <PointInput
        label="Academic Points"
        value={academicPoints}
        onChange={setAcademicPoints}
        description="Points reflecting academic performance and achievements (0-100)"
      />

      {/* Validation Error Display */}
      {validationError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">{validationError}</p>
        </div>
      )}

      {/* Update Button */}
      <button
        type="button"
        onClick={handleUpdateReputation}
        disabled={isLoadingChecks || isUpdatePending || isConfirming}
        className={`w-full py-2 rounded-md ${
          isLoadingChecks || isUpdatePending || isConfirming
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoadingChecks ? 'Checking Permissions...' : 
         isUpdatePending ? 'Updating Reputation...' : 
         isConfirming ? 'Confirming Transaction...' : 
         'Update Reputation'}
      </button>

      {/* Success Message */}
      {isUpdateSuccess && (
        <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3 mt-4">
          <p className="text-sm">Student reputation successfully updated!</p>
        </div>
      )}

      {/* Error Message */}
      {updateError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mt-4">
          <p className="text-sm">Error updating reputation: {updateError.message}</p>
        </div>
      )}

      {/* Guidance Section */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Reputation Update Guidelines
        </h4>
        <ul className="text-xs text-gray-400 space-y-2">
          <li>
            • Only teachers can update student reputation
          </li>
          <li>
            • Points range from 0 to 100 for each category
          </li>
          <li>
            • The school must be an active institution
          </li>
          <li>
            • The student must be enrolled in the teacher's school
          </li>
          <li>
            • The system must not be paused
          </li>
        </ul>
      </div>
    </motion.div>
  );
};

export default StudentReputationUpdater;