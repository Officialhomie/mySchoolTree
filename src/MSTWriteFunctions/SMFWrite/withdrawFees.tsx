import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

// Input validation functions
const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const isValidAmount = (amount: string): boolean => {
    // Allow only positive numbers with decimal places
    return /^\d*\.?\d*$/.test(amount) && parseFloat(amount) > 0;
};

const WithdrawFees = ({ contract }: { contract: any }) => {
    // State for recipient address
    const [recipientAddress, setRecipientAddress] = useState<string>('');
    
    // State for withdrawal amount
    const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
    
    // State for available balance
    const [availableBalance, setAvailableBalance] = useState<bigint>(BigInt(0));
    const [balanceLoaded, setBalanceLoaded] = useState<boolean>(false);
    
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

    // Read the available balance from the contract
    const { refetch: refetchBalance } = useReadContract({
        ...contract,
        functionName: 'getAvailableFees', // Assuming this function exists to get available fees
        enabled: false, // Don't fetch automatically on component mount
    });

    // Fetch the available balance
    const handleFetchBalance = async () => {
        try {
            const result = await refetchBalance();
            
            if (result.data) {
                const balance = result.data as bigint;
                setAvailableBalance(balance);
                setBalanceLoaded(true);
            } else {
                setStatusMessage('Failed to fetch available balance');
                setStatusType('error');
                setShowStatus(true);
            }
        } catch (err) {
            console.error('Error fetching balance:', err);
            setStatusMessage(`Error fetching balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
        }
    };

    // Load available balance on component mount
    useEffect(() => {
        handleFetchBalance();
    }, []);

    // Handle recipient address change with validation
    const handleRecipientAddressChange = (value: string) => {
        setRecipientAddress(value);
        
        if (!isValidAddress(value) && value !== '') {
            setErrors(prev => ({ ...prev, recipientAddress: 'Please enter a valid Ethereum address' }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.recipientAddress;
                return newErrors;
            });
        }
    };

    // Handle withdrawal amount change with validation
    const handleWithdrawalAmountChange = (value: string) => {
        setWithdrawalAmount(value);
        
        if (!isValidAmount(value)) {
            setErrors(prev => ({ ...prev, withdrawalAmount: 'Please enter a valid amount (must be a positive number)' }));
        } else if (balanceLoaded && ethers.parseEther(value) > availableBalance) {
            setErrors(prev => ({ ...prev, withdrawalAmount: 'Amount exceeds available balance' }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.withdrawalAmount;
                return newErrors;
            });
        }
    };

    // Maximum withdrawal button handler
    const handleMaxWithdrawal = () => {
        if (balanceLoaded && availableBalance > BigInt(0)) {
            setWithdrawalAmount(ethers.formatEther(availableBalance));
            
            // Clear any previous errors for withdrawal amount
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.withdrawalAmount;
                return newErrors;
            });
        }
    };

    // Validate the entire form
    useEffect(() => {
        const requiredFields = [recipientAddress, withdrawalAmount];
        const allFieldsFilled = requiredFields.every(field => field.trim() !== '');
        const noErrors = Object.keys(errors).length === 0;
        
        setValidForm(allFieldsFilled && noErrors && balanceLoaded);
    }, [recipientAddress, withdrawalAmount, errors, balanceLoaded]);

    // Handle transaction success
    useEffect(() => {
        if (isConfirmed && hash) {
            setStatusMessage('Fees withdrawn successfully!');
            setStatusType('success');
            setShowStatus(true);
            setConfirmationState('confirmed');
            
            // Refresh the available balance
            handleFetchBalance();
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

    // Initial request to withdraw
    const handleWithdrawRequest = () => {
        if (!validForm) {
            setStatusMessage('Please fix form errors before submitting');
            setStatusType('error');
            setShowStatus(true);
            return;
        }
        
        // Set to confirmation state
        setConfirmationState('confirm');
        setStatusMessage('You are about to withdraw fees. Please review the details and confirm.');
        setStatusType('warning');
        setShowStatus(true);
    };

    // Handle the actual withdrawal after confirmation
    const handleWithdrawConfirm = async () => {
        try {
            // Reset any previous errors
            resetWrite?.();
            
            // Convert amount to wei
            const amountInWei = ethers.parseEther(withdrawalAmount);
            
            // Call the contract function
            writeContract({
                ...contract,
                functionName: 'withdrawFees',
                args: [recipientAddress, amountInWei]
            });
            
            setStatusMessage('Withdrawal transaction submitted. Waiting for confirmation...');
            setStatusType('info');
            setShowStatus(true);
        } catch (err) {
            console.error('Error withdrawing fees:', err);
            setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
            setConfirmationState('initial');
        }
    };

    // Cancel the withdrawal request
    const handleCancel = () => {
        setConfirmationState('initial');
        setStatusMessage('Withdrawal cancelled');
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
                Withdraw Fees
            </h2>
            
            <p className="text-gray-300 text-sm mb-6">
                Withdraw accumulated fees from the platform to a specified recipient address.
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

            {/* Form Content - Initial State */}
            {confirmationState === 'initial' && (
                <div className="space-y-6">
                    {/* Available Balance */}
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Available Balance</h3>
                        
                        {balanceLoaded ? (
                            <div className="flex items-center">
                                <div className="text-2xl font-bold text-white">
                                    {ethers.formatEther(availableBalance)} ETH
                                </div>
                                <button
                                    onClick={handleFetchBalance}
                                    className="ml-3 p-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                    title="Refresh balance"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center text-gray-400">
                                <div className="w-4 h-4 border-2 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-2"></div>
                                <span>Loading balance...</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Recipient Address */}
                    <div>
                        <label htmlFor="recipientAddress" className="block text-sm font-medium text-gray-300 mb-1">
                            Recipient Address <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="recipientAddress"
                            type="text"
                            value={recipientAddress}
                            onChange={(e) => handleRecipientAddressChange(e.target.value)}
                            placeholder="0x..."
                            disabled={isPending || isConfirming}
                            className={`bg-gray-800 border ${errors.recipientAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                        />
                        {errors.recipientAddress && (
                            <p className="mt-1 text-xs text-red-400">{errors.recipientAddress}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            The address that will receive the withdrawn fees
                        </p>
                    </div>
                    
                    {/* Withdrawal Amount */}
                    <div>
                        <label htmlFor="withdrawalAmount" className="block text-sm font-medium text-gray-300 mb-1">
                            Withdrawal Amount (ETH) <span className="text-red-400">*</span>
                        </label>
                        <div className="relative flex">
                            <div className="relative flex-grow">
                                <input
                                    id="withdrawalAmount"
                                    type="text"
                                    value={withdrawalAmount}
                                    onChange={(e) => handleWithdrawalAmountChange(e.target.value)}
                                    placeholder="0.05"
                                    disabled={isPending || isConfirming || !balanceLoaded || availableBalance === BigInt(0)}
                                    className={`bg-gray-800 border ${errors.withdrawalAmount ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 pl-10 disabled:opacity-60`}
                                />
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="text-gray-400">Ξ</span>
                                </div>
                            </div>
                            <button
                                onClick={handleMaxWithdrawal}
                                disabled={isPending || isConfirming || !balanceLoaded || availableBalance === BigInt(0)}
                                className={`ml-2 px-3 py-2.5 rounded-lg text-sm ${
                                    !balanceLoaded || availableBalance === BigInt(0)
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                } disabled:opacity-60`}
                            >
                                MAX
                            </button>
                        </div>
                        {errors.withdrawalAmount && (
                            <p className="mt-1 text-xs text-red-400">{errors.withdrawalAmount}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Amount of fees to withdraw (cannot exceed available balance)
                        </p>
                    </div>
                    
                    {/* Withdraw Button */}
                    <motion.button
                        onClick={handleWithdrawRequest}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!validForm || isPending || isConfirming || availableBalance === BigInt(0)}
                        className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                            validForm && availableBalance > BigInt(0)
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                                : 'bg-gray-700 cursor-not-allowed'
                        } ${
                            isPending || isConfirming ? 'opacity-70' : 'opacity-100'
                        }`}
                    >
                        {availableBalance === BigInt(0) ? 'No Funds Available to Withdraw' : 'Withdraw Fees'}
                    </motion.button>
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmationState === 'confirm' && (
                <div className="space-y-6">
                    <div className="bg-blue-900/30 border border-blue-700/50 rounded-md p-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Withdrawal Details</h3>
                        
                        <div className="space-y-4">
                            {/* Recipient Address */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Recipient Address</p>
                                <div className="font-mono text-sm bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                    {recipientAddress}
                                </div>
                            </div>
                            
                            {/* Withdrawal Amount */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Withdrawal Amount</p>
                                <div className="text-gray-200 text-lg font-semibold bg-gray-800 p-2 rounded-md">
                                    {withdrawalAmount} ETH
                                </div>
                            </div>
                            
                            {/* Available Balance After Withdrawal */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Remaining Balance After Withdrawal</p>
                                <div className="text-gray-200 text-sm bg-gray-800 p-2 rounded-md">
                                    {ethers.formatEther(availableBalance - ethers.parseEther(withdrawalAmount))} ETH
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                            <p className="text-sm text-yellow-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                This transaction will withdraw fees from the platform to the specified recipient.
                                This action cannot be undone.
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
                            onClick={handleWithdrawConfirm}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isPending || isConfirming}
                            className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 ${
                                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                            }`}
                        >
                            {isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'Confirm Withdrawal'}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Withdrawal Success */}
            {confirmationState === 'confirmed' && (
                <div className="space-y-6">
                    <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-400">Withdrawal Successful</h3>
                        <p className="text-sm text-gray-300 mt-2">
                            The fees have been successfully withdrawn to the recipient's address.
                        </p>
                    </div>
                    
                    {/* Transaction Details */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
                        <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
                        
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Recipient</p>
                            <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                {recipientAddress}
                            </div>
                        </div>
                        
                        <div className="mt-3">
                            <p className="text-sm text-gray-400 mb-1">Amount Withdrawn</p>
                            <div className="text-gray-200 font-medium">
                                {withdrawalAmount} ETH
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
                        
                        <div className="mt-3">
                            <p className="text-sm text-gray-400 mb-1">Remaining Balance</p>
                            <div className="text-gray-200 font-medium">
                                {ethers.formatEther(availableBalance)} ETH
                            </div>
                        </div>
                    </div>
                    
                    {/* Reset Button */}
                    <motion.button
                        onClick={() => {
                            // Reset the form for a new withdrawal
                            setRecipientAddress('');
                            setWithdrawalAmount('');
                            setConfirmationState('initial');
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-300"
                    >
                        Make Another Withdrawal
                    </motion.button>
                </div>
            )}
        </motion.div>
    );
}

export default WithdrawFees;