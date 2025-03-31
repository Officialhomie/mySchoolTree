import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Input validation functions
const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const UpdateImplementation = ({ contract }: { contract: any }) => {
    // State for new implementation address
    const [implementationAddress, setImplementationAddress] = useState<string>('');
    
    // State for current implementation address
    const [currentImplementationAddress, setCurrentImplementationAddress] = useState<string>('');
    const [currentImplementationLoaded, setCurrentImplementationLoaded] = useState<boolean>(false);
    
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
    
    // Read the current implementation address from the contract
    const { refetch: refetchCurrentImplementation } = useReadContract({
        ...contract,
        functionName: 'getImplementation', // Assuming this function exists to get the current implementation
        enabled: false, // Don't fetch automatically on component mount
    });

    // Fetch the current implementation address
    const handleFetchCurrentImplementation = async () => {
        try {
            const result = await refetchCurrentImplementation();
            
            if (result.data) {
                const address = result.data as string;
                setCurrentImplementationAddress(address);
                setCurrentImplementationLoaded(true);
            } else {
                setStatusMessage('Failed to fetch current implementation address');
                setStatusType('error');
                setShowStatus(true);
            }
        } catch (err) {
            console.error('Error fetching current implementation:', err);
            setStatusMessage(`Error fetching implementation: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
        }
    };

    // Load current implementation on component mount
    useEffect(() => {
        handleFetchCurrentImplementation();
    }, []);

    // Handle implementation address change with validation
    const handleImplementationAddressChange = (value: string) => {
        setImplementationAddress(value);
        
        if (!isValidAddress(value) && value !== '') {
            setErrors(prev => ({ ...prev, implementationAddress: 'Please enter a valid Ethereum address' }));
        } else if (value === currentImplementationAddress) {
            setErrors(prev => ({ ...prev, implementationAddress: 'New implementation cannot be the same as the current one' }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.implementationAddress;
                return newErrors;
            });
        }
    };

    // Validate the entire form
    useEffect(() => {
        const allFieldsFilled = implementationAddress.trim() !== '';
        const noErrors = Object.keys(errors).length === 0;
        
        setValidForm(allFieldsFilled && noErrors && currentImplementationLoaded);
    }, [implementationAddress, errors, currentImplementationLoaded]);

    // Handle transaction success
    useEffect(() => {
        if (isConfirmed && hash) {
            setStatusMessage('Implementation updated successfully!');
            setStatusType('success');
            setShowStatus(true);
            setConfirmationState('confirmed');
            
            // Refresh the current implementation address
            handleFetchCurrentImplementation();
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
    
    // Initial request to update implementation
    const handleUpdateRequest = () => {
        if (!validForm) {
            setStatusMessage('Please fix form errors before submitting');
            setStatusType('error');
            setShowStatus(true);
            return;
        }
        
        // Set to confirmation state
        setConfirmationState('confirm');
        setStatusMessage('You are about to update the contract implementation. Please review the details and confirm.');
        setStatusType('warning');
        setShowStatus(true);
    };

    // Handle the actual update after confirmation
    const handleUpdateConfirm = async () => {
        try {
            // Reset any previous errors
            resetWrite?.();
            
            // Call the contract function
            writeContract({
                ...contract,
                functionName: 'updateImplementation',
                args: [implementationAddress]
            });
            
            setStatusMessage('Update transaction submitted. Waiting for confirmation...');
            setStatusType('info');
            setShowStatus(true);
        } catch (err) {
            console.error('Error updating implementation:', err);
            setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
            setConfirmationState('initial');
        }
    };

    // Cancel the update request
    const handleCancel = () => {
        setConfirmationState('initial');
        setStatusMessage('Update cancelled');
        setStatusType('info');
        setShowStatus(true);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Update Contract Implementation
            </h2>
            
            <p className="text-gray-300 text-sm mb-6">
                Update the contract implementation to a new address to deploy code changes or improvements.
            </p>

            {/* Form Content - Initial State */}
            {confirmationState === 'initial' && (
                <div className="space-y-6">
                    {/* Current Implementation */}
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Current Implementation</h3>
                        
                        {currentImplementationLoaded ? (
                            <div>
                                <div className="flex items-center mb-1">
                                    <div className="font-mono text-sm text-gray-300 break-all">
                                        {currentImplementationAddress}
                                    </div>
                                    <button
                                        onClick={handleFetchCurrentImplementation}
                                        className="ml-3 p-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                        title="Refresh implementation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    This is the current implementation contract that defines the system's behavior
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center text-gray-400">
                                <div className="w-4 h-4 border-2 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-2"></div>
                                <span>Loading current implementation...</span>
                            </div>
                        )}
                    </div>
                    
                    {/* New Implementation Address */}
                    <div>
                        <label htmlFor="implementationAddress" className="block text-sm font-medium text-gray-300 mb-1">
                            New Implementation Address <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="implementationAddress"
                            type="text"
                            value={implementationAddress}
                            onChange={(e) => handleImplementationAddressChange(e.target.value)}
                            placeholder="0x..."
                            disabled={isPending || isConfirming}
                            className={`bg-gray-800 border ${errors.implementationAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                        />
                        {errors.implementationAddress && (
                            <p className="mt-1 text-xs text-red-400">{errors.implementationAddress}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            The address of the new implementation contract that will replace the current one
                        </p>
                    </div>
                    
                    {/* Update Button */}
                    <motion.button
                        onClick={handleUpdateRequest}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!validForm || isPending || isConfirming}
                        className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                            validForm 
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                                : 'bg-gray-700 cursor-not-allowed'
                        } ${
                            isPending || isConfirming ? 'opacity-70' : 'opacity-100'
                        }`}
                    >
                        Update Implementation
                    </motion.button>
                    
                    {/* Warning Message */}
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                        <p className="text-sm text-yellow-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <strong>Warning:</strong> Updating the implementation is a critical operation that changes the contract's behavior.
                            Ensure the new implementation is compatible with the current state and storage layout.
                        </p>
                    </div>
                </div>
            )}

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

            {/* Confirmation Dialog */}
            {confirmationState === 'confirm' && (
                <div className="space-y-6">
                    <div className="bg-blue-900/30 border border-blue-700/50 rounded-md p-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Implementation Update Details</h3>
                        
                        <div className="space-y-4">
                            {/* Current Implementation */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Current Implementation</p>
                                <div className="font-mono text-sm bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                    {currentImplementationAddress}
                                </div>
                            </div>
                            
                            {/* New Implementation */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">New Implementation</p>
                                <div className="font-mono text-sm bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                    {implementationAddress}
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                            <p className="text-sm text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <strong>CRITICAL ACTION:</strong> This will change the contract's implementation, potentially altering its behavior.
                                This action cannot be undone. Ensure the new implementation is thoroughly tested and compatible.
                            </p>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <motion.button
                            onClick={handleCancel}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors duration-300"
                        >
                            Cancel
                        </motion.button>
                        
                        <motion.button
                            onClick={handleUpdateConfirm}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isPending || isConfirming}
                            className={`flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-300 ${
                                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                            }`}
                        >
                            {isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'I Understand, Update Implementation'}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Update Success */}
            {confirmationState === 'confirmed' && (
                <div className="space-y-6">
                    <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-400">Implementation Updated Successfully</h3>
                        <p className="text-sm text-gray-300 mt-2">
                            The contract implementation has been updated to the new address.
                        </p>
                    </div>
                    
                    {/* Transaction Details */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
                        <h3 className="text-md font-semibold text-blue-400 mb-2">Update Details</h3>
                        
                        <div>
                            <p className="text-sm text-gray-400 mb-1">New Implementation</p>
                            <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                {implementationAddress}
                            </div>
                        </div>
                        
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
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-md p-4">
                        <h3 className="text-md font-semibold text-blue-400 mb-2">Next Steps</h3>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Verify that the new implementation is functioning as expected by testing core functionality</span>
                            </li>
                            <li className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Document the changes that were introduced in this implementation update</span>
                            </li>
                            <li className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Communicate the update to stakeholders who interact with this contract</span>
                            </li>
                        </ul>
                    </div>
                    
                    {/* Reset Button */}
                    <motion.button
                        onClick={() => {
                            // Reset the form for a new update
                            setImplementationAddress('');
                            setConfirmationState('initial');
                            
                            // Refresh current implementation address
                            handleFetchCurrentImplementation();
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-300"
                    >
                        Prepare Another Update
                    </motion.button>
                </div>
            )}
        </motion.div>
    );
}

export default UpdateImplementation;