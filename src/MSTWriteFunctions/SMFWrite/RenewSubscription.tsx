import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

// Input validation functions
const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const isValidAmount = (amount: string): boolean => {
    return /^\d*\.?\d*$/.test(amount) && parseFloat(amount) >= 0;
};

const RenewSubscription = ({ contract }: { contract: any }) => {
    // State for organization address
    const [organizationAddress, setOrganizationAddress] = useState<string>('');
    
    // State for subscription information
    const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
    const [subscriptionInfoLoaded, setSubscriptionInfoLoaded] = useState<boolean>(false);
    
    // Form validation state
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [validForm, setValidForm] = useState(false);
    
    // Payment amount state
    const [paymentAmount, setPaymentAmount] = useState<string>('0');
    
    // UI state
    const [confirmationState, setConfirmationState] = useState<'initial' | 'confirm' | 'confirmed'>('initial');
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
    const [showStatus, setShowStatus] = useState(false);
    
    // Transaction state
    const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

    // Read the subscription information from the contract
    const { refetch: refetchSubscriptionInfo } = useReadContract({
        ...contract,
        functionName: 'getSubscriptionInfo',
        args: [organizationAddress],
        enabled: false, // Don't fetch automatically on component mount
    });

    // Function to fetch subscription information
    const handleFetchSubscriptionInfo = async () => {
        if (!isValidAddress(organizationAddress)) {
            setStatusMessage('Please enter a valid organization address');
            setStatusType('error');
            setShowStatus(true);
            return;
        }
        
        try {
            const result = await refetchSubscriptionInfo();
            
            if (result.data) {
                // Transform the data into our format
                const infoData = result.data as any;
                setSubscriptionInfo({
                    active: infoData.active,
                    expiryDate: new Date(Number(infoData.expiryTimestamp) * 1000),
                    subscriptionFee: infoData.subscriptionFee,
                });
                
                // Set the payment amount to the subscription fee
                setPaymentAmount(ethers.formatEther(infoData.subscriptionFee));
                
                setSubscriptionInfoLoaded(true);
            } else {
                setStatusMessage('Failed to fetch subscription information');
                setStatusType('error');
                setShowStatus(true);
            }
        } catch (err) {
            console.error('Error fetching subscription info:', err);
            setStatusMessage(`Error fetching information: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
        }
    };

    // Handle organization address change with validation
    const handleOrganizationAddressChange = (value: string) => {
        setOrganizationAddress(value);
        setSubscriptionInfoLoaded(false);
        
        if (!isValidAddress(value) && value !== '') {
            setErrors(prev => ({ ...prev, organizationAddress: 'Please enter a valid Ethereum address' }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.organizationAddress;
                return newErrors;
            });
        }
    };

    // Handle payment amount change with validation
    const handlePaymentAmountChange = (value: string) => {
        setPaymentAmount(value);
        
        if (!isValidAmount(value)) {
            setErrors(prev => ({ ...prev, paymentAmount: 'Please enter a valid amount (must be a positive number)' }));
        } else if (subscriptionInfo && ethers.parseEther(value) < subscriptionInfo.subscriptionFee) {
            setErrors(prev => ({ ...prev, paymentAmount: 'Amount must be at least the subscription fee' }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.paymentAmount;
                return newErrors;
            });
        }
    };

    // Validate the entire form
    useEffect(() => {
        const requiredFields = [organizationAddress, paymentAmount];
        const allFieldsFilled = requiredFields.every(field => field.trim() !== '');
        const noErrors = Object.keys(errors).length === 0;
        
        setValidForm(allFieldsFilled && noErrors && (subscriptionInfoLoaded || organizationAddress === ''));
    }, [organizationAddress, paymentAmount, errors, subscriptionInfoLoaded]);

    // Handle transaction success
    useEffect(() => {
        if (isConfirmed && hash) {
            setStatusMessage('Subscription renewed successfully!');
            setStatusType('success');
            setShowStatus(true);
            setConfirmationState('confirmed');
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

    // Initial request to renew
    const handleRenewRequest = () => {
        if (!validForm) {
            setStatusMessage('Please fix form errors before submitting');
            setStatusType('error');
            setShowStatus(true);
            return;
        }
        
        // Set to confirmation state
        setConfirmationState('confirm');
        setStatusMessage('You are about to renew a subscription. Please review the details and confirm.');
        setStatusType('warning');
        setShowStatus(true);
    };

    // Handle the actual renewal after confirmation
    const handleRenewConfirm = async () => {
        try {
            // Reset any previous errors
            resetWrite?.();
            
            // Convert payment amount to wei
            const valueInWei = ethers.parseEther(paymentAmount);
            
            // Call the contract function
            writeContract({
                ...contract,
                functionName: 'renewSubscription',
                args: [organizationAddress],
                value: valueInWei
            });
            
            setStatusMessage('Renewal transaction submitted. Waiting for confirmation...');
            setStatusType('info');
            setShowStatus(true);
        } catch (err) {
            console.error('Error renewing subscription:', err);
            setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
            setConfirmationState('initial');
        }
    };

    // Cancel the renewal request
    const handleCancel = () => {
        setConfirmationState('initial');
        setStatusMessage('Renewal cancelled');
        setStatusType('info');
        setShowStatus(true);
    };

    // Format date for display
    const formatDate = (date: Date): string => {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Renew Organization Subscription
            </h2>
            
            <p className="text-gray-300 text-sm mb-6">
                Renew a subscription for an organization to maintain access to platform services.
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
                    {/* Organization Address with Look Up Button */}
                    <div>
                        <label htmlFor="organizationAddress" className="block text-sm font-medium text-gray-300 mb-1">
                            Organization Address <span className="text-red-400">*</span>
                        </label>
                        <div className="flex space-x-2">
                            <div className="flex-grow">
                                <input
                                    id="organizationAddress"
                                    type="text"
                                    value={organizationAddress}
                                    onChange={(e) => handleOrganizationAddressChange(e.target.value)}
                                    placeholder="0x..."
                                    disabled={isPending || isConfirming}
                                    className={`bg-gray-800 border ${errors.organizationAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                                />
                            </div>
                            <motion.button
                                onClick={handleFetchSubscriptionInfo}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={Boolean(!organizationAddress || errors.organizationAddress || isPending || isConfirming)}
                                className={`px-4 py-2.5 rounded-lg text-white ${
                                    !organizationAddress || errors.organizationAddress 
                                        ? 'bg-gray-700 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                } disabled:opacity-60`}
                            >
                                Look Up
                            </motion.button>
                        </div>
                        {errors.organizationAddress && (
                            <p className="mt-1 text-xs text-red-400">{errors.organizationAddress}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Enter the address of the organization to renew subscription for
                        </p>
                    </div>
                    
                    {/* Subscription Information */}
                    {subscriptionInfoLoaded && (
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                            <h3 className="text-lg font-semibold text-blue-400 mb-3">Subscription Information</h3>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-gray-400">Status:</div>
                                <div className="text-gray-200">
                                    {subscriptionInfo.active 
                                        ? <span className="text-green-400">Active</span> 
                                        : <span className="text-red-400">Inactive</span>
                                    }
                                </div>
                                
                                <div className="text-gray-400">Expiry Date:</div>
                                <div className="text-gray-200">
                                    {formatDate(subscriptionInfo.expiryDate)}
                                </div>
                                
                                <div className="text-gray-400">Subscription Fee:</div>
                                <div className="text-gray-200">
                                    {ethers.formatEther(subscriptionInfo.subscriptionFee)} ETH
                                </div>
                            </div>
                            
                            {/* Expiry Status */}
                            <div className="mt-4 p-3 rounded-md border">
                                {new Date() > subscriptionInfo.expiryDate ? (
                                    <div className="bg-red-500/10 border-red-500/30 text-red-400">
                                        <p className="text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            This subscription has expired. Renew now to restore access.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-green-500/10 border-green-500/30 text-green-400">
                                        <p className="text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            This subscription is currently active. You can renew to extend the expiry date.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Payment Amount */}
                    <div>
                        <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-300 mb-1">
                            Payment Amount (ETH) <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="paymentAmount"
                                type="text"
                                value={paymentAmount}
                                onChange={(e) => handlePaymentAmountChange(e.target.value)}
                                placeholder="0.05"
                                disabled={isPending || isConfirming || !subscriptionInfoLoaded}
                                className={`bg-gray-800 border ${errors.paymentAmount ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 pl-10 disabled:opacity-60`}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <span className="text-gray-400">Ξ</span>
                            </div>
                        </div>
                        {errors.paymentAmount && (
                            <p className="mt-1 text-xs text-red-400">{errors.paymentAmount}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Amount to send with this transaction (must be at least the subscription fee)
                        </p>
                    </div>
                    
                    {/* Renew Button */}
                    <motion.button
                        onClick={handleRenewRequest}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!validForm || isPending || isConfirming || !subscriptionInfoLoaded}
                        className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-lg transition-all duration-300 ${
                            validForm && subscriptionInfoLoaded
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                                : 'bg-gray-700 cursor-not-allowed'
                        } ${
                            isPending || isConfirming ? 'opacity-70' : 'opacity-100'
                        }`}
                    >
                        Renew Subscription
                    </motion.button>
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmationState === 'confirm' && (
                <div className="space-y-6">
                    <div className="bg-blue-900/30 border border-blue-700/50 rounded-md p-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Renewal Details</h3>
                        
                        <div className="space-y-4">
                            {/* Organization Address */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Organization Address</p>
                                <div className="font-mono text-sm bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                    {organizationAddress}
                                </div>
                            </div>
                            
                            {/* Current Subscription */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Current Subscription</p>
                                <div className="bg-gray-800 p-2 rounded-md text-gray-300">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-gray-400">Status:</div>
                                        <div className="text-gray-200">
                                            {subscriptionInfo.active 
                                                ? <span className="text-green-400">Active</span> 
                                                : <span className="text-red-400">Inactive</span>
                                            }
                                        </div>
                                        
                                        <div className="text-gray-400">Current Expiry:</div>
                                        <div className="text-gray-200">
                                            {formatDate(subscriptionInfo.expiryDate)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Payment Details */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Payment Details</p>
                                <div className="bg-gray-800 p-2 rounded-md text-gray-300">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-gray-400">Required Fee:</div>
                                        <div className="text-gray-200">
                                            {ethers.formatEther(subscriptionInfo.subscriptionFee)} ETH
                                        </div>
                                        
                                        <div className="text-gray-400">Your Payment:</div>
                                        <div className="text-gray-200">
                                            {paymentAmount} ETH
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                            <p className="text-sm text-yellow-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                This transaction will renew the subscription for the organization.
                                Make sure you have sufficient funds in your wallet.
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
                            onClick={handleRenewConfirm}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isPending || isConfirming}
                            className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 ${
                                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                            }`}
                        >
                            {isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'Confirm Renewal'}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Renewal Success */}
            {confirmationState === 'confirmed' && (
                <div className="space-y-6">
                    <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-400">Subscription Renewed Successfully</h3>
                        <p className="text-sm text-gray-300 mt-2">
                            The organization's subscription has been renewed.
                        </p>
                    </div>
                    
                    {/* Transaction Details */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
                        <h3 className="text-md font-semibold text-blue-400 mb-2">Transaction Details</h3>
                        
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Organization Address</p>
                            <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                {organizationAddress}
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
                            <p className="text-sm text-gray-400 mb-1">Amount Paid</p>
                            <div className="text-gray-200 font-medium">
                                {paymentAmount} ETH
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <motion.button
                            onClick={() => {
                                // Reset the form for a new renewal
                                setOrganizationAddress('');
                                setSubscriptionInfo(null);
                                setSubscriptionInfoLoaded(false);
                                setPaymentAmount('0');
                                setConfirmationState('initial');
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-300"
                        >
                            Renew Another Subscription
                        </motion.button>
                        
                        <motion.button
                            onClick={() => {
                                // Refetch the subscription info to see the updated expiry date
                                handleFetchSubscriptionInfo();
                                setConfirmationState('initial');
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300"
                        >
                            View Updated Subscription
                        </motion.button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default RenewSubscription;