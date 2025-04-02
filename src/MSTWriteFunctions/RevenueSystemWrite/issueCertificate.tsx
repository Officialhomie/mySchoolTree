import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';
import StudentSchoolVerifier from '../../MSTReadfunction/StudentProfileRead/isStudentOfSchool'; // Import the verification component

/**
 * CertificateIssuer Component
 * 
 * This component allows school administrators to issue certificates to students
 * after verifying they are enrolled in the school. It incorporates the StudentSchoolVerifier
 * component to ensure proper verification before certificate issuance.
 */
interface CertificateIssuerProps {
  certificateContract: any; // Contract for issuing certificates
  roleContract: any; // Contract for checking SCHOOL_ROLE
  pauseContract: any; // Contract for checking pause status
  feeContract?: any; // Optional contract for fetching certificate fee
  onCertificateIssued?: (student: string, batchId: number, txHash: string) => void; // Optional callback
}

const CertificateIssuer = ({
  certificateContract,
  roleContract,
  pauseContract,
  feeContract,
  onCertificateIssued
}: CertificateIssuerProps) => {
  // Current user's address
  const { address: connectedAddress } = useAccount();
  
  // Form state
  const [studentAddress, setStudentAddress] = useState<string>('');
  const [batchId, setBatchId] = useState<number>(1);
  const [validationError, setValidationError] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  // Student verification state
  const [isStudentVerified, setIsStudentVerified] = useState<boolean>(false);
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  
  // Status tracking
  const [canIssueCertificates, setCanIssueCertificates] = useState<boolean>(false);
  const [certificateFee, setCertificateFee] = useState<bigint | null>(null);
  
  // Fetch the SCHOOL_ROLE identifier
  const { 
    data: schoolRoleData,
    isLoading: isLoadingRoleId,
    isError: isRoleIdError
  } = useReadContract({
    ...roleContract,
    functionName: 'SCHOOL_ROLE'
  });
  
  // Check if the system is paused
  const {
    data: pausedStatus,
    isLoading: isLoadingPauseStatus,
    isError: isPauseStatusError,
    refetch: refetchPauseStatus
  } = useReadContract({
    ...pauseContract,
    functionName: 'paused'
  });
  
  // Check if the current user has the SCHOOL_ROLE
  const {
    data: hasRoleData,
    isLoading: isLoadingRoleCheck,
    isError: isRoleCheckError,
    refetch: refetchRoleCheck
  } = useReadContract({
    ...roleContract,
    functionName: 'hasRole',
    args: schoolRoleData && connectedAddress ? [
      schoolRoleData as `0x${string}`,
      connectedAddress
    ] : undefined,
    query: {
      enabled: !!schoolRoleData && !!connectedAddress
    }
  });
  
  // Fetch certificate fee if feeContract is provided
  const {
    data: feeData,
    isLoading: isLoadingFee,
    isError: isFeeError
  } = useReadContract({
    ...feeContract,
    functionName: 'schoolFeeStructures',
    args: connectedAddress ? [connectedAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!feeContract && !!connectedAddress
    }
  });
  
  // Get balance of connected account
  const {
    data: balanceData,
    refetch: refetchBalance
  } = useBalance({
    address: connectedAddress as `0x${string}`,
    query: {
      enabled: !!connectedAddress
    }
  });
  
  // Contract write state for issuing certificates
  const {
    data: issueTxHash,
    error: issueTxError,
    isPending: isIssuePending,
    writeContract: writeIssueCertificate
  } = useWriteContract();
  
  // Transaction receipt state
  const {
    isLoading: isIssueConfirming,
    isSuccess: isIssueConfirmed,
    error: issueConfirmError
  } = useWaitForTransactionReceipt({
    hash: issueTxHash,
  });
  
  // Combined loading state
  const isLoading = isLoadingRoleId || isLoadingPauseStatus || isLoadingRoleCheck || isLoadingFee;
  
  // Combined processing state
  const isProcessing = isIssuePending || isIssueConfirming;
  
  // Combined error state
  const issueError = issueTxError || issueConfirmError;
  
  // Update canIssueCertificates when role and pause data are loaded
  useEffect(() => {
    if (!isLoading) {
      const hasRole = Boolean(hasRoleData);
      const isPaused = Boolean(pausedStatus);
      
      setCanIssueCertificates(hasRole && !isPaused);
      setLastChecked(new Date());
    }
  }, [hasRoleData, pausedStatus, isLoading]);
  // Update certificate fee when fee data is loaded
  useEffect(() => {
    if (feeData && !isLoadingFee && !isFeeError) {
      // Access the certificate fee from the fee data structure
      // Make sure to check the actual structure of feeData from your contract
      if (typeof feeData === 'object' && feeData !== null) {
        // If feeData is a bigint directly
        if (typeof feeData === 'bigint') {
          setCertificateFee(feeData);
        } 
        // If feeData has a certificateFee property
        else if ('certificateFee' in feeData) {
          setCertificateFee(feeData.certificateFee as bigint);
        }
        // If feeData is returned as another structure, adjust accordingly
        else {
          console.warn('Certificate fee structure not as expected:', feeData);
        }
      }
    }
  }, [feeData, isLoadingFee, isFeeError]);
  // Helper to format time since last check
  const getTimeSinceLastCheck = () => {
    if (!lastChecked) return 'Never checked';
    return formatDistanceToNow(lastChecked, { addSuffix: true });
  };
  
  // Validate student address
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
  
  // Validate batch ID
  const validateBatchId = (id: number): boolean => {
    if (isNaN(id) || id <= 0) {
      setValidationError('Batch ID must be a positive number');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Check if user has enough balance for certificate fee
  const hasEnoughBalance = (): boolean => {
    if (!certificateFee || !balanceData) return true; // If fee is unknown, assume ok
    return balanceData.value >= certificateFee;
  };
  
  // Handle student verification result from StudentSchoolVerifier
  const handleVerificationResult = (isVerified: boolean, message: string) => {
    setIsStudentVerified(isVerified);
    setVerificationMessage(message);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!validateAddress(studentAddress) || !validateBatchId(batchId)) {
      return;
    }
    
    // Check if student is verified
    if (!isStudentVerified) {
      setValidationError('Student must be verified as enrolled in your school before issuing a certificate');
      return;
    }
    
    // Re-check permissions and system status
    if (!canIssueCertificates) {
      if (!Boolean(hasRoleData)) {
        setValidationError('You do not have the SCHOOL_ROLE required to issue certificates');
      } else if (Boolean(pausedStatus)) {
        setValidationError('System is paused. Cannot issue certificates at this time');
      } else {
        setValidationError('Unable to issue certificate due to system constraints');
      }
      return;
    }
    
    // Check if user has enough balance for the fee
    if (!hasEnoughBalance()) {
      setValidationError(`Insufficient balance to pay certificate fee of ${formatEther(certificateFee as bigint)} ETH`);
      return;
    }
    
    // All checks passed, issue the certificate
    try {
      writeIssueCertificate({
        ...certificateContract,
        functionName: 'issueCertificate',
        args: [
          studentAddress as `0x${string}`,
          BigInt(batchId)
        ],
        value: certificateFee || BigInt(0)
      });
    } catch (err) {
      console.error('Error issuing certificate:', err);
      setValidationError('Error initiating transaction');
    }
  };
  
  // Reset form after successful certificate issuance
  useEffect(() => {
    if (isIssueConfirmed && !isIssueConfirming && issueTxHash) {
      // Call the callback if provided
      if (onCertificateIssued) {
        onCertificateIssued(studentAddress, batchId, issueTxHash);
      }
      
      // Reset form
      setStudentAddress('');
      setBatchId(1);
      setIsStudentVerified(false);
      setVerificationMessage('');
      
      // Refresh state
      refetchRoleCheck();
      refetchPauseStatus();
      refetchBalance();
    }
  }, [isIssueConfirmed, isIssueConfirming, issueTxHash, studentAddress, batchId, onCertificateIssued, refetchRoleCheck, refetchPauseStatus, refetchBalance]);
  
  // Render validation errors with proper type declaration
  const renderValidationErrors = (): React.ReactNode => {
    if (!validationError) return null;
    
    return (
      <div className="text-xs text-red-400 mt-1">{validationError}</div>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-green-400 mb-3">
        Certificate Issuer
      </h3>
      
      {/* System Status Banner */}
      {!isLoading && (
        <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
          canIssueCertificates 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-red-900/20 border-red-700/30'
        }`}>
          <div className="flex items-center">
            {canIssueCertificates ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-green-400">System Ready</h4>
                  <p className="text-xs text-gray-300 mt-0.5">You can issue certificates</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </div>
                <div>
                  <h4 className="text-md font-medium text-red-400">System Unavailable</h4>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {!Boolean(hasRoleData) && 'You lack the required SCHOOL_ROLE permissions'}
                    {Boolean(hasRoleData) && Boolean(pausedStatus) && 'The system is currently paused'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={() => {
              refetchRoleCheck();
              refetchPauseStatus();
              setLastChecked(new Date());
            }}
            className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 bg-gray-700/20 rounded-lg mb-4">
          <div className="w-5 h-5 border-2 border-t-green-400 border-green-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Checking system status...</span>
        </div>
      )}
      
      {/* Error States */}
      {(isRoleIdError || isRoleCheckError) && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Permission Check Error</p>
              <p className="text-xs mt-1">Unable to verify your role permissions. Please try again later.</p>
            </div>
          </div>
        </div>
      )}
      
      {isPauseStatusError && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">System Status Error</p>
              <p className="text-xs mt-1">Unable to check if system is paused. Please try again later.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Certificate Fee Information */}
      {certificateFee !== null && (
        <div className="bg-green-900/10 border border-green-700/30 rounded-md p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-gray-300">Certificate Issuance Fee</span>
            </div>
            <span className="text-md font-semibold text-green-400">{formatEther(certificateFee)} ETH</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            This fee will be charged when you issue a certificate. 
            Your current balance: {balanceData ? formatEther(balanceData.value) : '0'} ETH
          </p>
        </div>
      )}
      
      {/* Student Verification Component */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Step 1: Verify Student Enrollment</h4>
        <div className="bg-gray-700/30 rounded-lg p-4">
          <StudentSchoolVerifier 
            studentAddress={studentAddress}
            schoolAddress={connectedAddress as `0x${string}`}
            contract={certificateContract} // Assuming the certificate contract has verification methods
            onVerificationResult={handleVerificationResult}
          />
        </div>
      </div>
      
      {/* Certificate Issuance Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Step 2: Issue Certificate</h4>
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Student Address Input */}
          <div className="space-y-2">
            <label htmlFor="student-address" className="block text-sm font-medium text-gray-300">
              Student Wallet Address
            </label>
            <input
              id="student-address"
              type="text"
              value={studentAddress}
              onChange={(e) => {
                setStudentAddress(e.target.value);
                setValidationError('');
                // Reset verification when address changes
                setIsStudentVerified(false);
                setVerificationMessage('');
              }}
              placeholder="0x..."
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && !studentAddress ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              disabled={isProcessing || !canIssueCertificates}
            />
            <p className="text-xs text-gray-400">Enter the student's Ethereum wallet address</p>
          </div>
          
          {/* Verification Status */}
          {studentAddress && (
            <div className={`rounded-md p-3 ${
              isStudentVerified 
                ? 'bg-green-900/20 border border-green-700/30' 
                : 'bg-yellow-900/20 border border-yellow-700/30'
            }`}>
              <div className="flex items-start">
                <div className={`min-w-3 w-3 h-3 rounded-full mt-1 ${
                  isStudentVerified ? 'bg-green-500' : 'bg-yellow-500'
                } mr-2`}></div>
                <div>
                  <p className={`text-sm font-medium ${
                    isStudentVerified ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {isStudentVerified ? 'Student Verified' : 'Student Not Verified'}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {verificationMessage || 'Verify the student is enrolled in your school before issuing a certificate'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Batch ID Input */}
          <div className="space-y-2">
            <label htmlFor="batch-id" className="block text-sm font-medium text-gray-300">
              Certificate Batch ID
            </label>
            <input
              id="batch-id"
              type="number"
              value={batchId || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setBatchId(isNaN(value) ? 0 : value);
                setValidationError('');
              }}
              placeholder="Enter batch ID"
              min="1"
              className={`w-full px-3 py-2 bg-gray-700 border ${
                validationError && (!batchId || batchId <= 0) ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              disabled={isProcessing || !canIssueCertificates}
            />
            <p className="text-xs text-gray-400">
              Enter the batch ID for this certificate. Batches allow grouping certificates by program, class, etc.
            </p>
          </div>
          
          {/* Validation Errors */}
          {renderValidationErrors()}
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isProcessing || !canIssueCertificates || !isStudentVerified
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
              }`}
              disabled={isProcessing || !canIssueCertificates || !isStudentVerified}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Issuing Certificate...
                </span>
              ) : (
                'Issue Certificate'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Transaction Success Message */}
      {isIssueConfirmed && !isIssueConfirming && (
        <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Certificate Successfully Issued</p>
              <p className="text-xs mt-1">The certificate has been successfully issued on the blockchain.</p>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-gray-300">Transaction Hash:</p>
                <a
                  href={`https://etherscan.io/tx/${issueTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 font-mono break-all hover:underline"
                >
                  {issueTxHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Error Message */}
      {issueError && (
        <div className="mt-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Error Issuing Certificate</p>
              <p className="text-xs mt-1">
                {(issueError as Error).message || 'An unknown error occurred while issuing the certificate.'}
              </p>
              <p className="text-xs mt-2 text-gray-300">
                This may happen if the student already has a certificate in this batch, the batch doesn't exist, or if there was an issue with the payment.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* System Status Information */}
      {!isLoading && (
        <div className="mt-4 bg-gray-700/20 rounded-md p-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">System Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-700/40 rounded-md p-2">
              <p className="text-xs text-gray-400">Permission Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${Boolean(hasRoleData) ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <p className={`text-sm ${Boolean(hasRoleData) ? 'text-green-400' : 'text-red-400'}`}>
                  {Boolean(hasRoleData) ? 'SCHOOL_ROLE Granted' : 'Missing SCHOOL_ROLE'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-700/40 rounded-md p-2">
              <p className="text-xs text-gray-400">Contract Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${Boolean(pausedStatus) ? 'bg-red-500' : 'bg-green-500'} mr-2`}></div>
                <p className={`text-sm ${Boolean(pausedStatus) ? 'text-red-400' : 'text-green-400'}`}>
                  {Boolean(pausedStatus) ? 'System Paused' : 'System Active'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 flex items-center justify-end">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last checked: {getTimeSinceLastCheck()}
            </div>
          </div>
        </div>
      )}
      
      {/* Educational Information */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">About Certificate Issuance</h4>
        <p className="text-sm text-gray-400 mb-3">
          This component allows authorized school administrators to issue verifiable blockchain certificates to students. Before issuing a certificate, you must verify that the student is enrolled in your school.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-green-400 mb-1">Verification Requirements</h5>
            <p className="text-xs text-gray-400">
              Only students enrolled in your school can receive certificates. The verification process ensures that certificates are issued to legitimate students only.
            </p>
          </div>
          
          <div className="bg-gray-700/20 rounded-md p-3">
            <h5 className="text-xs font-medium text-green-400 mb-1">Certificate Batches</h5>
            <p className="text-xs text-gray-400">
              Certificates are organized into batches, which can represent programs, courses, or graduation years. Each student can have one certificate per batch.
            </p>
          </div>
        </div>
        
        <p className="text-xs text-gray-400">
          Issuing a certificate requires a fee payment, which is deducted from your wallet when the transaction is processed. Make sure you have sufficient balance before attempting to issue a certificate.
        </p>
      </div>
    </motion.div>
  );
};

export default CertificateIssuer;