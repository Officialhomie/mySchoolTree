import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';

// Component for deactivating an organization
const DeactivateOrganization = ({ contract }: { contract: any }) => {
    // State for the organization address
    const [organizationAddress, setOrganizationAddress] = useState<string>('');
    
    // State for validation and UI feedback
    const [isValidAddress, setIsValidAddress] = useState<boolean>(false);
    const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
    const [showStatus, setShowStatus] = useState<boolean>(false);
    
    // Transaction states using wagmi hooks
    const { data: hash, isPending, writeContract, error, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

    // Validate the organization address input
    useEffect(() => {
        // Basic Ethereum address validation
        const isValid = /^0x[a-fA-F0-9]{40}$/.test(organizationAddress);
        setIsValidAddress(isValid);
        
        // Reset confirmation state when the address changes
        if (confirmationState !== 'initial') {
            setConfirmationState('initial');
        }
    }, [organizationAddress]);

    // Handle transaction success
    useEffect(() => {
        if (isConfirmed) {
            setStatusMessage(`Organization successfully deactivated! Transaction hash: ${hash}`);
            setStatusType('success');
            setShowStatus(true);
            setConfirmationState('confirmed');
            
            // Reset the form after successful deactivation
            setTimeout(() => {
                setOrganizationAddress('');
                setConfirmationState('initial');
            }, 5000);
        }
    }, [isConfirmed, hash]);

    // Handle transaction errors
    useEffect(() => {
        if (error || confirmError) {
            const errorMessage = error?.message || confirmError?.message || 'An unknown error occurred';
            setStatusMessage(`Transaction failed: ${errorMessage}`);
            setStatusType('error');
            setShowStatus(true);
            setConfirmationState('initial');
        }
    }, [error, confirmError]);

    // Hide status message after a delay
    useEffect(() => {
        if (showStatus) {
            const timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showStatus]);

    // Handle the initial deactivation request
    const handleDeactivateRequest = () => {
        if (!isValidAddress) {
            setStatusMessage('Please enter a valid Ethereum address');
            setStatusType('error');
            setShowStatus(true);
            return;
        }
        
        // Set to confirmation state
        setConfirmationState('confirm');
        setStatusMessage('You are about to deactivate this organization. This action cannot be undone. Please confirm.');
        setStatusType('warning');
        setShowStatus(true);
    };

    // Handle the actual deactivation after confirmation
    const handleDeactivateConfirm = async () => {
        try {
            // Reset any previous errors
            resetWrite?.();
            
            // Call the contract function
            writeContract({
                ...contract,
                functionName: 'deactivateOrganization',
                args: [organizationAddress]
            });
            
            setStatusMessage('Deactivation transaction submitted. Waiting for confirmation...');
            setStatusType('info');
            setShowStatus(true);
        } catch (err) {
            console.error('Error deactivating organization:', err);
            setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
            setConfirmationState('initial');
        }
    };

    // Cancel the deactivation request
    const handleCancel = () => {
        setConfirmationState('initial');
        setStatusMessage('Deactivation cancelled');
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
                Deactivate Organization
            </h2>
            
            <p className="text-gray-300 text-sm mb-6">
                Deactivate an organization's subscription and services. This action requires admin privileges and cannot be undone.
            </p>

            <div className="space-y-6">
                {/* Organization Address Input */}
                <div>
                    <label htmlFor="orgAddress" className="block text-sm font-medium text-gray-300 mb-1">
                        Organization Address <span className="text-red-400">*</span>
                    </label>
                    <input
                        id="orgAddress"
                        type="text"
                        value={organizationAddress}
                        onChange={(e) => setOrganizationAddress(e.target.value)}
                        placeholder="0x..."
                        disabled={confirmationState === 'confirm' || isPending || isConfirming}
                        className={`bg-gray-800 border ${!isValidAddress && organizationAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                    />
                    {!isValidAddress && organizationAddress && (
                        <p className="mt-1 text-xs text-red-400">Please enter a valid Ethereum address</p>
                    )}
                </div>

                {/* Status Messages */}
                {showStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`p-3 rounded-md ${
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
                                        title="Copy to clipboard"
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

                {/* Action Buttons - Different states based on the confirmation flow */}
                {confirmationState === 'initial' && (
                    <motion.button
                        onClick={handleDeactivateRequest}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!isValidAddress || isPending || isConfirming}
                        className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                            isValidAddress 
                                ? 'bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700' 
                                : 'bg-gray-700 cursor-not-allowed'
                        } ${
                            isPending || isConfirming ? 'opacity-70' : 'opacity-100'
                        }`}
                    >
                        {isPending || isConfirming ? 'Processing...' : 'Deactivate Organization'}
                    </motion.button>
                )}

                {confirmationState === 'confirm' && (
                    <div className="flex flex-col space-y-3">
                        <div className="bg-red-900/30 border border-red-700/50 rounded-md p-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <h3 className="text-lg font-semibold text-red-400">Confirm Deactivation</h3>
                            <p className="text-sm text-gray-300 mt-2">
                                You are about to deactivate organization:<br/>
                                <span className="font-mono text-xs bg-red-900/40 px-2 py-1 rounded mt-1 inline-block">
                                    {organizationAddress}
                                </span>
                            </p>
                            <p className="text-sm text-gray-300 mt-2">
                                This action cannot be undone. The organization will lose access to all services.
                            </p>
                        </div>
                        
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
                                onClick={handleDeactivateConfirm}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isPending || isConfirming}
                                className={`flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-300 ${
                                    isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                                }`}
                            >
                                {isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'Confirm Deactivation'}
                            </motion.button>
                        </div>
                    </div>
                )}

                {confirmationState === 'confirmed' && (
                    <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-400">Deactivation Successful</h3>
                        <p className="text-sm text-gray-300 mt-2">
                            The organization has been successfully deactivated.
                        </p>
                    </div>
                )}
                
                {/* Transaction tracking info */}
                {(isPending || isConfirming) && (
                    <div className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-md bg-gray-800/50">
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
            </div>
        </motion.div>
    );
}

export default DeactivateOrganization;