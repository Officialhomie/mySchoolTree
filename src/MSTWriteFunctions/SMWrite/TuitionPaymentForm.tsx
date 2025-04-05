import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { parseEther } from 'viem';

/**
 * Types and interfaces for the TuitionPaymentForm component
 */
export interface TuitionPaymentData {
  term: string;
  amount: string;
  paymentNote: string;
  isProcessing: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  transactionHash: string | null;
  error: Error | null;
}

export interface TuitionPaymentMethods {
  getPaymentData: () => TuitionPaymentData;
  resetPaymentForm: () => void;
  submitPayment: (term: string, amount: string, note?: string) => Promise<boolean>;
}

/**
 * TuitionPaymentForm Component Props
 */
interface TuitionPaymentFormProps {
  contract: any;
  currentTerm?: number; // Optional current term to pre-populate
  onPaymentSuccess?: (term: number, amount: string, txHash: string) => void; // Optional callback for successful payment
  onPaymentError?: (error: Error) => void; // Optional callback for payment errors
  onStateChange?: (data: TuitionPaymentData) => void; // New callback for state changes
}

/**
 * TuitionPaymentForm Component
 * 
 * This component provides a form to pay tuition for a specific term.
 * It uses the payTuition contract function and exposes methods via ref
 * for parent components to access payment data and control the form.
 */
const TuitionPaymentForm = forwardRef<TuitionPaymentMethods, TuitionPaymentFormProps>(({
  contract,
  currentTerm,
  onPaymentSuccess,
  onPaymentError,
  onStateChange
}, ref) => {
  // Form state
  const [term, setTerm] = useState<string>(currentTerm?.toString() || '');
  const [amount, setAmount] = useState<string>('0.05');
  const [paymentNote, setPaymentNote] = useState<string>('');
  
  // Contract write state
  const { 
    data: hash,
    error: writeError,
    isPending: isWritePending,
    writeContract,
    reset: resetContractWrite
  } = useWriteContract();
  
  // Transaction receipt state
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ 
    hash,
  });
  
  // Combined error state
  const error = writeError || confirmError;

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    // Get current payment data
    getPaymentData: () => ({
      term,
      amount,
      paymentNote,
      isProcessing: isWritePending,
      isConfirming,
      isConfirmed,
      transactionHash: hash || null,
      error: error as Error | null
    }),
    
    // Reset the payment form to initial state
    resetPaymentForm: () => {
      setTerm(currentTerm?.toString() || '');
      setAmount('0.05');
      setPaymentNote('');
      resetContractWrite();
    },
    
    // Programmatically submit a payment
    submitPayment: async (termValue: string, amountValue: string, note?: string): Promise<boolean> => {
      try {
        // Validate inputs
        if (!termValue || isNaN(Number(termValue)) || Number(termValue) <= 0) {
          throw new Error('Please enter a valid term number');
        }
        
        if (!amountValue || isNaN(Number(amountValue)) || Number(amountValue) <= 0) {
          throw new Error('Please enter a valid payment amount');
        }
        
        // Update form state
        setTerm(termValue);
        setAmount(amountValue);
        if (note !== undefined) {
          setPaymentNote(note);
        }
        
        // Execute contract call
        writeContract({
          ...contract,
          functionName: 'payTuition',
          args: [BigInt(termValue)],
          value: parseEther(amountValue)
        });
        
        return true;
      } catch (err) {
        if (onPaymentError && err instanceof Error) {
          onPaymentError(err);
        }
        return false;
      }
    }
  }));

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        term,
        amount,
        paymentNote,
        isProcessing: isWritePending,
        isConfirming,
        isConfirmed,
        transactionHash: hash || null,
        error: error as Error | null
      });
    }
  }, [term, amount, paymentNote, isWritePending, isConfirming, isConfirmed, hash, error, onStateChange]);
  
  // Handle payment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      if (!term || isNaN(Number(term)) || Number(term) <= 0) {
        throw new Error('Please enter a valid term number');
      }
      
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error('Please enter a valid payment amount');
      }
      
      // Execute contract call
      writeContract({
        ...contract,
        functionName: 'payTuition',
        args: [BigInt(term)],
        value: parseEther(amount)
      });
    } catch (err) {
      if (onPaymentError && err instanceof Error) {
        onPaymentError(err);
      }
    }
  };
  
  // Call success callback when confirmed
  useEffect(() => {
    if (isConfirmed && hash && !isConfirming && term && amount) {
      if (onPaymentSuccess) {
        onPaymentSuccess(Number(term), amount, hash);
      }
      
      // Reset form on success if no callback provided
      if (!onPaymentSuccess) {
        setTerm(currentTerm?.toString() || '');
        setAmount('0.05');
        setPaymentNote('');
      }
    }
  }, [isConfirmed, hash, isConfirming, term, amount, onPaymentSuccess, currentTerm]);
  
  // Get payment status and styling
  const getPaymentStatus = () => {
    if (isWritePending) {
      return { text: 'Initiating Payment', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    }
    
    if (isConfirming) {
      return { text: 'Confirming Payment', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    }
    
    if (isConfirmed) {
      return { text: 'Payment Successful', color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    
    if (error) {
      return { text: 'Payment Failed', color: 'text-red-400', bg: 'bg-red-500/20' };
    }
    
    return { text: 'Ready for Payment', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };
  
  const status = getPaymentStatus();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
      data-testid="tuition-payment-form"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Tuition Payment
      </h3>
      
      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg} border border-${status.color.replace('text-', '')}/30 mb-4`}>
        <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')} mr-2`}></div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>
      
      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
          {/* Term Input */}
          <div className="space-y-2">
            <label htmlFor="term" className="block text-sm font-medium text-gray-300">
              Term Number
            </label>
            <input
              id="term"
              type="number"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter term number"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              required
              disabled={isWritePending || isConfirming}
              data-testid="term-input"
            />
            <p className="text-xs text-gray-400">Enter the term you're paying tuition for</p>
          </div>
          
          {/* Payment Amount Input */}
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
              Payment Amount (ETH)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0.01"
                required
                disabled={isWritePending || isConfirming}
                data-testid="amount-input"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-400">ETH</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">Enter the amount of ETH to pay for tuition</p>
          </div>
          
          {/* Payment Note Input (Optional) */}
          <div className="space-y-2">
            <label htmlFor="note" className="block text-sm font-medium text-gray-300">
              Payment Note (Optional)
            </label>
            <textarea
              id="note"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="Add a note for this payment"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isWritePending || isConfirming}
              data-testid="note-input"
            />
            <p className="text-xs text-gray-400">Add a personal note for reference (not stored on-chain)</p>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3" data-testid="error-display">
            <p className="text-sm">Error processing payment: {(error as Error).message || 'Unknown error'}</p>
          </div>
        )}
        
        {/* Success Display */}
        {isConfirmed && hash && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-3" data-testid="success-display">
            <p className="text-sm">Payment successful!</p>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-400">Transaction Hash: </span>
              <a 
                href={`https://etherscan.io/tx/${hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 ml-1 font-mono truncate hover:underline"
              >
                {hash}
              </a>
            </div>
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              setTerm(currentTerm?.toString() || '');
              setAmount('0.05');
              setPaymentNote('');
              resetContractWrite();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isWritePending || isConfirming}
            data-testid="reset-button"
          >
            Reset
          </button>
          
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isWritePending || isConfirming
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isWritePending || isConfirming}
            data-testid="submit-button"
          >
            {isWritePending || isConfirming ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isWritePending ? 'Initiating Payment...' : 'Confirming Payment...'}
              </span>
            ) : isConfirmed ? (
              'Payment Complete'
            ) : (
              'Pay Tuition'
            )}
          </button>
        </div>
      </form>
      
      {/* Payment Info */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Payment Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <span className="text-gray-400">Function: </span>
            <span className="text-gray-200 font-mono">payTuition(uint256 term)</span>
          </div>
          <div>
            <span className="text-gray-400">Transaction Type: </span>
            <span className="text-gray-200">Payable</span>
          </div>
          <div>
            <span className="text-gray-400">Gas Estimate: </span>
            <span className="text-gray-200">~50,000 gas</span>
          </div>
          <div>
            <span className="text-gray-400">Confirmation Time: </span>
            <span className="text-gray-200">~15-30 seconds</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p className="mb-1">Note: Please ensure you have sufficient ETH balance for tuition payment and gas fees.</p>
          <p>All payments are non-refundable once confirmed on the blockchain.</p>
        </div>
      </div>
    </motion.div>
  );
});

export default TuitionPaymentForm;