import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';

/**
 * TuitionPaymentStatusChecker Component
 * 
 * This component checks whether a student has paid their tuition for a specific term.
 * It allows searching by student address and term number, then displays the payment status
 * with appropriate visual indicators and explanatory text.
 */
interface TuitionPaymentStatusCheckerProps {
  contract: any;
  initialAddress?: string; // Optional initial address to check
  initialTerm?: number; // Optional initial term to check
  onStatusFetched?: (isPaid: boolean, studentAddress: string, term: number) => void; // Callback for when status is fetched
}

const TuitionPaymentStatusChecker = ({ 
  contract,
  initialAddress = '',
  initialTerm = 1,
  onStatusFetched
}: TuitionPaymentStatusCheckerProps) => {
  // Get current connected wallet address if no initial address provided
  const { address: connectedAddress } = useAccount();
  
  // State for inputs
  const [studentAddress, setStudentAddress] = useState<string>(initialAddress || connectedAddress || '');
  const [termNumber, setTermNumber] = useState<string>(initialTerm.toString());
  const [isAddressValid, setIsAddressValid] = useState<boolean>(
    initialAddress ? isAddress(initialAddress) : connectedAddress ? isAddress(connectedAddress as string) : false
  );
  const [isTermValid, setIsTermValid] = useState<boolean>(true);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Fetch payment status from contract
  const { 
    data: paymentStatusRaw,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'getTuitionPaymentStatus',
    args: [studentAddress, termNumber ? BigInt(termNumber) : 1n],
    enabled: hasSearched && isAddressValid && isTermValid, // Only run when inputs are valid and search is triggered
  });
  
  // Convert raw data to proper type
  const isPaid = paymentStatusRaw !== undefined ? Boolean(paymentStatusRaw) : undefined;
  
  // Safely extract error message
  const errorMessage = error instanceof Error ? error.message : 
                       error ? String(error) : 'Unknown error';
  
  // Update address validation when input changes
  useEffect(() => {
    setIsAddressValid(studentAddress ? isAddress(studentAddress) : false);
  }, [studentAddress]);
  
  // Update term validation when input changes
  useEffect(() => {
    try {
      const term = parseInt(termNumber);
      setIsTermValid(term > 0 && !isNaN(term));
    } catch (e) {
      setIsTermValid(false);
    }
  }, [termNumber]);
  
  // Call the callback when status is fetched successfully
  useEffect(() => {
    if (isSuccess && isPaid !== undefined && onStatusFetched) {
      onStatusFetched(isPaid, studentAddress, parseInt(termNumber));
    }
  }, [isPaid, isSuccess, studentAddress, termNumber, onStatusFetched]);

  // Handler for address input
  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentAddress(e.target.value);
  };

  // Handler for term input
  const handleTermInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermNumber(e.target.value);
  };

  // Handler for search button
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddressValid && isTermValid) {
      setHasSearched(true);
    }
  };
  
  // Get the payment status details for display
  const getPaymentStatus = () => {
    if (!isSuccess || isPaid === undefined) {
      return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    
    if (isPaid) {
      return { 
        text: 'Paid', 
        color: 'text-green-400', 
        bg: 'bg-green-500/20',
        icon: (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      };
    } else {
      return { 
        text: 'Unpaid', 
        color: 'text-red-400', 
        bg: 'bg-red-500/20',
        icon: (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
    }
  };
  
  const status = getPaymentStatus();

  // Generate a description based on payment status
  const getStatusDescription = () => {
    if (!isSuccess || isPaid === undefined) {
      return "Payment status is unknown. Please check the student's address and term number.";
    }
    
    if (isPaid) {
      return `The student has successfully paid their tuition for Term ${termNumber}. They are in good financial standing and can participate in all program activities.`;
    } else {
      return `The student has not yet paid their tuition for Term ${termNumber}. Payment is required to maintain enrollment status and participate in program activities.`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-2">
        Tuition Payment Status Checker
      </h3>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="student-address" className="block text-sm text-gray-400">
            Student Address:
          </label>
          <input
            id="student-address"
            type="text"
            value={studentAddress}
            onChange={handleAddressInput}
            placeholder="0x..."
            className={`w-full bg-gray-700/50 border ${
              studentAddress && !isAddressValid
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-gray-600 focus:border-blue-500'
            } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
          />
          {studentAddress && !isAddressValid && (
            <p className="text-xs text-red-400">Please enter a valid Ethereum address</p>
          )}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="term-number" className="block text-sm text-gray-400">
            Term Number:
          </label>
          <input
            id="term-number"
            type="number"
            value={termNumber}
            onChange={handleTermInput}
            min="1"
            placeholder="1"
            className={`w-full bg-gray-700/50 border ${
              termNumber && !isTermValid
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-gray-600 focus:border-blue-500'
            } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
          />
          {termNumber && !isTermValid && (
            <p className="text-xs text-red-400">Please enter a valid term number (1 or greater)</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!isAddressValid || !isTermValid || isLoading}
          className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
            !isAddressValid || !isTermValid || isLoading
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2"></div>
              <span>Checking Status...</span>
            </div>
          ) : (
            'Check Payment Status'
          )}
        </button>
      </form>
      
      {/* Error Display */}
      {hasSearched && error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error checking payment status: {errorMessage}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Payment Status Display */}
      {hasSearched && isSuccess && isPaid !== undefined && (
        <div className="space-y-4">
          {/* Status Card */}
          <div className={`${status.bg} border border-${status.color.replace('text-', '')}/30 rounded-lg p-4`}>
            <div className="flex items-center mb-3">
              {status.icon}
              <h4 className={`text-lg font-medium ${status.color}`}>
                {status.text}
              </h4>
            </div>
            
            <p className="text-sm text-gray-300">
              {getStatusDescription()}
            </p>
            
            <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Term:</p>
                  <p className="text-white font-medium">{termNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status:</p>
                  <p className={`font-medium ${status.color}`}>{status.text}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Student Info */}
          <div className="bg-gray-700/30 rounded-md p-3">
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h5 className="text-sm font-medium text-gray-300">Student Details</h5>
            </div>
            
            <p className="text-xs text-gray-400 mt-1">Address:</p>
            <p className="text-sm text-gray-200 font-mono break-all">{studentAddress}</p>
          </div>
          
          {/* Payment Actions */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => refetch()} 
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-4 rounded flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Status
            </button>
            
            {!isPaid && (
              <button 
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center text-sm"
                onClick={() => {
                  // This would link to a payment page or initiate a payment flow
                  console.log(`Initiate payment for Term ${termNumber}`);
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Make Payment
              </button>
            )}
            
            {isPaid && (
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center text-sm"
                onClick={() => {
                  // This would link to a payment receipt or payment history
                  console.log(`View payment receipt for Term ${termNumber}`);
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Receipt
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Initial State */}
      {!hasSearched && (
        <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md p-3">
          <p className="text-sm">
            Enter a student address and term number above to check their tuition payment status.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default TuitionPaymentStatusChecker;