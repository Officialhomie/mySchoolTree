import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

const EmergencyWithdraw = ({ contract }: { contract: any }) => {
  // UI state
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [processingState, setProcessingState] = useState<'initial' | 'confirmation' | 'processing' | 'completed'>('initial');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [userInput, setUserInput] = useState('');

  // Transaction state
  const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Generate a random confirmation code when component mounts
  useEffect(() => {
    const generateCode = () => {
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };
    
    setConfirmationCode(generateCode());
  }, []);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setStatusMessage('Emergency withdrawal completed successfully!');
      setStatusType('success');
      setShowStatus(true);
      setProcessingState('completed');
    }
  }, [isConfirmed, hash]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError || confirmError) {
      const errorMessage = writeError?.message || confirmError?.message || 'An unknown error occurred';
      setStatusMessage(`Transaction failed: ${errorMessage}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
      setShowConfirmation(false);
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

  // Handle the confirmation step
  const handleShowConfirmation = () => {
    setProcessingState('confirmation');
    setShowConfirmation(true);
  };

  // Handle the emergency withdrawal process
  const handleEmergencyWithdraw = async () => {
    try {
      // Check confirmation code
      if (userInput !== confirmationCode) {
        setStatusMessage('Incorrect confirmation code. Please try again.');
        setStatusType('error');
        setShowStatus(true);
        return;
      }
      
      // Reset any previous errors
      resetWrite?.();
      
      // Update UI state
      setProcessingState('processing');
      setStatusMessage('Submitting emergency withdrawal transaction...');
      setStatusType('info');
      setShowStatus(true);
      
      // Execute the contract write
      writeContract({
        ...contract,
        functionName: 'emergencyWithdraw',
        args: []
      });
    } catch (err) {
      console.error('Error in emergency withdrawal:', err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatusType('error');
      setShowStatus(true);
      setProcessingState('initial');
      setShowConfirmation(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
    >
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
        Emergency Withdraw
      </h2>
      
      <p className="text-gray-300 text-sm mb-6">
        Withdraw all funds from the contract in case of emergency.
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
            <div className="w-8 h-8 border-4 border-t-red-400 border-r-orange-500 border-b-red-400 border-l-orange-500 rounded-full animate-spin mr-3"></div>
            <span className="text-gray-300">{isPending ? 'Waiting for wallet approval...' : 'Confirming transaction...'}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {isPending 
              ? 'Please confirm this transaction in your wallet' 
              : 'Transaction has been submitted. Waiting for blockchain confirmation...'}
          </p>
        </div>
      )}

      {/* Initial State */}
      {processingState === 'initial' && (
        <div className="space-y-6">
          <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 text-sm text-gray-300">
                <h3 className="font-medium text-red-400">Warning: Emergency Function</h3>
                <p className="mt-2">
                  The Emergency Withdraw function is designed to be used only in critical situations where funds need to be immediately rescued from the contract.
                </p>
                <p className="mt-2">
                  This action will:
                </p>
                <ul className="list-disc list-inside pl-2 mt-2 space-y-1 text-gray-400">
                  <li>Withdraw <span className="text-red-400 font-medium">ALL funds</span> from the contract</li>
                  <li>Send them to the contract owner or designated recovery address</li>
                  <li>Potentially disrupt normal contract operations</li>
                </ul>
                <p className="mt-2 text-red-400 font-medium">
                  This action cannot be undone. Use only in genuine emergency situations.
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <motion.button
            onClick={handleShowConfirmation}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
          >
            Initiate Emergency Withdrawal
          </motion.button>
        </div>
      )}

      {/* Confirmation Step */}
      {processingState === 'confirmation' && showConfirmation && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-center text-red-400 mb-4">Confirm Emergency Withdrawal</h3>
            
            <p className="text-gray-300 text-sm mb-4 text-center">
              To confirm this critical action, please enter the code below:
            </p>
            
            <div className="bg-gray-900 rounded-md p-3 text-center mb-6">
              <span className="font-mono text-xl tracking-widest text-orange-400 font-bold">
                {confirmationCode}
              </span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Enter confirmation code
              </label>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.toUpperCase())}
                className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-300 text-sm font-mono tracking-wider text-center uppercase"
                placeholder="Enter code"
                maxLength={6}
              />
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => {
                  setProcessingState('initial');
                  setShowConfirmation(false);
                  setUserInput('');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="py-2 px-4 rounded-md text-gray-300 font-medium shadow-lg transition-all duration-300 bg-gray-700 hover:bg-gray-600"
              >
                Cancel
              </motion.button>
              
              <motion.button
                onClick={handleEmergencyWithdraw}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={userInput !== confirmationCode || isPending || isConfirming}
                className={`py-2 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                  userInput === confirmationCode
                    ? 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700'
                    : 'bg-gray-600'
                } ${
                  userInput !== confirmationCode || isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                }`}
              >
                Confirm Withdrawal
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {processingState === 'completed' && (
        <div className="space-y-6">
          <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Emergency Withdrawal Complete</h3>
            <p className="text-sm text-gray-300 mt-2">
              All funds have been successfully withdrawn from the contract.
            </p>
          </div>
          
          {/* Transaction Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
            
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
              <div className="flex items-center">
                <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 overflow-x-auto max-w-full flex-1 break-all">
                  {hash}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hash || '');
                    setStatusMessage('Transaction hash copied to clipboard!');
                    setStatusType('success');
                    setShowStatus(true);
                  }}
                  className="ml-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Next Steps */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-400">Important Next Steps</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Now that funds have been withdrawn, you should:
                </p>
                <ul className="list-disc list-inside pl-2 mt-2 space-y-1 text-sm text-gray-400">
                  <li>Secure the withdrawn funds</li>
                  <li>Investigate and resolve the emergency situation</li>
                  <li>Contact relevant stakeholders</li>
                  <li>Consider deploying a new contract with improved security if necessary</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Reset Button */}
          <motion.button
            onClick={() => {
              setProcessingState('initial');
              setUserInput('');
              const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
              setConfirmationCode(newCode);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md shadow-lg transition-all duration-300"
          >
            Return to Dashboard
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default EmergencyWithdraw;