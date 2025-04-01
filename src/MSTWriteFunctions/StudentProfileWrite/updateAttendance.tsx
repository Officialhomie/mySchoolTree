import React, { useState } from 'react';
import { 
  useAccount, 
  useReadContracts, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { motion } from 'framer-motion';

interface AttendanceUpdaterProps {
  attendanceContract: any;
  roleContract: any;
  schoolContract: any;
}

const AttendanceUpdater: React.FC<AttendanceUpdaterProps> = ({
  attendanceContract,
  roleContract,
  schoolContract
}) => {
  // User account
  const { address: connectedAddress } = useAccount();

  // State management
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [attendanceStatus, setAttendanceStatus] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>('');

  // Fetch multiple contract checks in one call
  const { 
    data: contractData, 
    isLoading: isLoadingChecks,
  } = useReadContracts({
    contracts: [
      // Check if contract is paused
      { 
        ...attendanceContract, 
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

  // Write contract for attendance update
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

  // Handle attendance update
  const handleUpdateAttendance = () => {
    // Validate address first
    if (!validateAddress(studentAddress)) return;

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

    // Proceed with attendance update
    writeContract({
      ...attendanceContract,
      functionName: 'updateAttendance',
      args: [studentAddress as `0x${string}`, attendanceStatus]
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-4">
        Student Attendance Updater
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

      {/* Attendance Status Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Attendance Status
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setAttendanceStatus(true)}
            className={`px-4 py-2 rounded-md transition-colors ${
              attendanceStatus 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Present
          </button>
          <button
            type="button"
            onClick={() => setAttendanceStatus(false)}
            className={`px-4 py-2 rounded-md transition-colors ${
              !attendanceStatus 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Absent
          </button>
        </div>
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4">
          <p className="text-sm">{validationError}</p>
        </div>
      )}

      {/* Update Button */}
      <button
        type="button"
        onClick={handleUpdateAttendance}
        disabled={isLoadingChecks || isUpdatePending || isConfirming}
        className={`w-full py-2 rounded-md ${
          isLoadingChecks || isUpdatePending || isConfirming
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoadingChecks ? 'Checking Permissions...' : 
         isUpdatePending ? 'Updating Attendance...' : 
         isConfirming ? 'Confirming Transaction...' : 
         'Update Attendance'}
      </button>

      {/* Success Message */}
      {isUpdateSuccess && (
        <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3 mt-4">
          <p className="text-sm">Attendance successfully updated!</p>
        </div>
      )}

      {/* Error Message */}
      {updateError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mt-4">
          <p className="text-sm">Error updating attendance: {updateError.message}</p>
        </div>
      )}

      {/* Guidance Section */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Attendance Update Guidelines
        </h4>
        <ul className="text-xs text-gray-400 space-y-2">
          <li>
            • Only teachers can update student attendance
          </li>
          <li>
            • The school must be an active institution in the system
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

export default AttendanceUpdater;