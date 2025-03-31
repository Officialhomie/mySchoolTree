import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

// Define the DeploymentConfig structure
interface DeploymentConfig {
    programFee: string;
    subscriptionFee: string;
    certificateFee: string;
    revenueShare: string;
    subscriptionDuration: string;
}

// Input validation functions
const isValidAmount = (amount: string): boolean => {
    return /^\d*\.?\d*$/.test(amount) && parseFloat(amount) >= 0;
};

const isValidDuration = (duration: string): boolean => {
    return /^\d+$/.test(duration) && parseInt(duration) > 0;
};

const isValidPercentage = (percent: string): boolean => {
    const value = parseFloat(percent);
    return !isNaN(value) && value >= 0 && value <= 100;
};

const UpdateDefaultConfig = ({ contract }: { contract: any }) => {
    // State for form values
    const [config, setConfig] = useState<DeploymentConfig>({
        programFee: '',
        subscriptionFee: '',
        certificateFee: '',
        revenueShare: '',
        subscriptionDuration: ''
    });
    
    // State for the current config (read from contract)
    const [currentConfig, setCurrentConfig] = useState<any>(null);
    
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

    // Read the current default config from the contract
    const { refetch: refetchDefaultConfig } = useReadContract({
        ...contract,
        functionName: 'getDefaultConfig',
        enabled: false, // Don't fetch automatically on component mount
    });

    // Fetch the current config when component loads
    const handleFetchCurrentConfig = async () => {
        try {
            setStatusMessage('Fetching current configuration...');
            setStatusType('info');
            setShowStatus(true);
            
            const result = await refetchDefaultConfig();
            
            if (result.data) {
                // Transform the data into our format
                const currentData = result.data as any;
                setCurrentConfig({
                    programFee: currentData.programFee,
                    subscriptionFee: currentData.subscriptionFee,
                    certificateFee: currentData.certificateFee,
                    revenueShare: currentData.revenueShare,
                    subscriptionDuration: currentData.subscriptionDuration
                });
                
                // Initialize form with current values (formatted for human readability)
                setConfig({
                    programFee: ethers.formatEther(currentData.programFee),
                    subscriptionFee: ethers.formatEther(currentData.subscriptionFee),
                    certificateFee: ethers.formatEther(currentData.certificateFee),
                    revenueShare: (Number(currentData.revenueShare) / 100).toString(), // Convert from basis points
                    subscriptionDuration: (Number(currentData.subscriptionDuration) / (24 * 60 * 60)).toString() // Convert from seconds to days
                });
                
                setStatusMessage('Current configuration loaded');
                setStatusType('success');
            } else {
                setStatusMessage('Failed to fetch current configuration');
                setStatusType('error');
            }
        } catch (err) {
            console.error('Error fetching default config:', err);
            setStatusMessage(`Error fetching configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
        }
    };

    // Handle input changes with validation
    const handleConfigChange = (field: keyof DeploymentConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        
        // Validate the field
        let errorMessage = '';
        switch (field) {
            case 'programFee':
            case 'subscriptionFee':
            case 'certificateFee':
                if (!isValidAmount(value)) {
                    errorMessage = 'Please enter a valid amount (must be a positive number)';
                }
                break;
            case 'revenueShare':
                if (!isValidPercentage(value)) {
                    errorMessage = 'Please enter a valid percentage (0-100)';
                }
                break;
            case 'subscriptionDuration':
                if (!isValidDuration(value)) {
                    errorMessage = 'Please enter a valid duration in days (must be a positive integer)';
                }
                break;
        }
        
        setErrors(prev => ({ ...prev, [field]: errorMessage }));
    };

    // Validate the entire form
    useEffect(() => {
        // Check if all required fields are filled and valid
        const requiredFields = [
            config.programFee,
            config.subscriptionFee,
            config.certificateFee,
            config.revenueShare,
            config.subscriptionDuration
        ];
        
        const allFieldsFilled = requiredFields.every(field => field.trim() !== '');
        const noErrors = Object.keys(errors).length === 0;
        
        setValidForm(allFieldsFilled && noErrors);
    }, [config, errors]);

    // Handle transaction success
    useEffect(() => {
        if (isConfirmed) {
            setStatusMessage('Configuration updated successfully!');
            setStatusType('success');
            setShowStatus(true);
            setConfirmationState('confirmed');
            
            // Re-fetch the current config to show the updated values
            handleFetchCurrentConfig();
            
            // Reset form state after a delay
            setTimeout(() => {
                setConfirmationState('initial');
            }, 5000);
        }
    }, [isConfirmed]);

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

    // Initial request to update config
    const handleUpdateRequest = () => {
        if (!validForm) {
            setStatusMessage('Please fix form errors before submitting');
            setStatusType('error');
            setShowStatus(true);
            return;
        }
        
        // Set to confirmation state
        setConfirmationState('confirm');
        setStatusMessage('You are about to update the default configuration. Please review and confirm the changes.');
        setStatusType('warning');
        setShowStatus(true);
    };

    // Handle the actual update after confirmation
    const handleUpdateConfirm = async () => {
        try {
            // Reset any previous errors
            resetWrite?.();
            
            // Convert values to appropriate format for blockchain
            const configForBlockchain = {
                programFee: ethers.parseEther(config.programFee),
                subscriptionFee: ethers.parseEther(config.subscriptionFee),
                certificateFee: ethers.parseEther(config.certificateFee),
                revenueShare: BigInt(Math.floor(parseFloat(config.revenueShare) * 100)), // Convert to basis points
                subscriptionDuration: BigInt(parseInt(config.subscriptionDuration) * 24 * 60 * 60) // Convert days to seconds
            };
            
            // Call the contract function
            writeContract({
                ...contract,
                functionName: 'updateDefaultConfig',
                args: [[
                    configForBlockchain.programFee,
                    configForBlockchain.subscriptionFee,
                    configForBlockchain.certificateFee,
                    configForBlockchain.revenueShare,
                    configForBlockchain.subscriptionDuration
                ]]
            });
            
            setStatusMessage('Update transaction submitted. Waiting for confirmation...');
            setStatusType('info');
            setShowStatus(true);
        } catch (err) {
            console.error('Error updating configuration:', err);
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

    // Format value display for comparison
    const formatValue = (field: keyof DeploymentConfig, value: any): string => {
        switch (field) {
            case 'programFee':
            case 'subscriptionFee':
            case 'certificateFee':
                return `${ethers.formatEther(value)} ETH`;
            case 'revenueShare':
                return `${(Number(value) / 100).toFixed(2)}%`;
            case 'subscriptionDuration':
                const days = Math.floor(Number(value) / (24 * 60 * 60));
                return `${days} days`;
            default:
                return value.toString();
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Update Default Configuration
            </h2>
            
            <p className="text-gray-300 text-sm mb-6">
                Update the default configuration parameters for new organization deployments. This action requires admin privileges.
            </p>

            {/* Fetch Current Config Button */}
            {confirmationState === 'initial' && !currentConfig && (
                <motion.button
                    onClick={handleFetchCurrentConfig}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg"
                >
                    Fetch Current Configuration
                </motion.button>
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

            {/* Form Content */}
            {currentConfig && confirmationState === 'initial' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Program Fee */}
                        <div>
                            <label htmlFor="programFee" className="block text-sm font-medium text-gray-300 mb-1">
                                Program Fee (ETH) <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="programFee"
                                    type="text"
                                    value={config.programFee}
                                    onChange={(e) => handleConfigChange('programFee', e.target.value)}
                                    placeholder="0.01"
                                    disabled={isPending || isConfirming}
                                    className={`bg-gray-800 border ${errors.programFee ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 pl-10 disabled:opacity-60`}
                                />
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="text-gray-400">Ξ</span>
                                </div>
                            </div>
                            {errors.programFee && (
                                <p className="mt-1 text-xs text-red-400">{errors.programFee}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Current: {formatValue('programFee', currentConfig.programFee)}
                            </p>
                        </div>
                        
                        {/* Subscription Fee */}
                        <div>
                            <label htmlFor="subscriptionFee" className="block text-sm font-medium text-gray-300 mb-1">
                                Subscription Fee (ETH) <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="subscriptionFee"
                                    type="text"
                                    value={config.subscriptionFee}
                                    onChange={(e) => handleConfigChange('subscriptionFee', e.target.value)}
                                    placeholder="0.05"
                                    disabled={isPending || isConfirming}
                                    className={`bg-gray-800 border ${errors.subscriptionFee ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 pl-10 disabled:opacity-60`}
                                />
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="text-gray-400">Ξ</span>
                                </div>
                            </div>
                            {errors.subscriptionFee && (
                                <p className="mt-1 text-xs text-red-400">{errors.subscriptionFee}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Current: {formatValue('subscriptionFee', currentConfig.subscriptionFee)}
                            </p>
                        </div>
                        
                        {/* Certificate Fee */}
                        <div>
                            <label htmlFor="certificateFee" className="block text-sm font-medium text-gray-300 mb-1">
                                Certificate Fee (ETH) <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="certificateFee"
                                    type="text"
                                    value={config.certificateFee}
                                    onChange={(e) => handleConfigChange('certificateFee', e.target.value)}
                                    placeholder="0.001"
                                    disabled={isPending || isConfirming}
                                    className={`bg-gray-800 border ${errors.certificateFee ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 pl-10 disabled:opacity-60`}
                                />
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="text-gray-400">Ξ</span>
                                </div>
                            </div>
                            {errors.certificateFee && (
                                <p className="mt-1 text-xs text-red-400">{errors.certificateFee}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Current: {formatValue('certificateFee', currentConfig.certificateFee)}
                            </p>
                        </div>
                        
                        {/* Revenue Share */}
                        <div>
                            <label htmlFor="revenueShare" className="block text-sm font-medium text-gray-300 mb-1">
                                Revenue Share (%) <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="revenueShare"
                                    type="text"
                                    value={config.revenueShare}
                                    onChange={(e) => handleConfigChange('revenueShare', e.target.value)}
                                    placeholder="5"
                                    disabled={isPending || isConfirming}
                                    className={`bg-gray-800 border ${errors.revenueShare ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 pr-8 disabled:opacity-60`}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="text-gray-400">%</span>
                                </div>
                            </div>
                            {errors.revenueShare && (
                                <p className="mt-1 text-xs text-red-400">{errors.revenueShare}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Current: {formatValue('revenueShare', currentConfig.revenueShare)}
                            </p>
                        </div>
                        
                        {/* Subscription Duration */}
                        <div className="md:col-span-2">
                            <label htmlFor="subscriptionDuration" className="block text-sm font-medium text-gray-300 mb-1">
                                Subscription Duration (days) <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="subscriptionDuration"
                                    type="text"
                                    value={config.subscriptionDuration}
                                    onChange={(e) => handleConfigChange('subscriptionDuration', e.target.value)}
                                    placeholder="30"
                                    disabled={isPending || isConfirming}
                                    className={`bg-gray-800 border ${errors.subscriptionDuration ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 pr-12 disabled:opacity-60`}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="text-gray-400">days</span>
                                </div>
                            </div>
                            {errors.subscriptionDuration && (
                                <p className="mt-1 text-xs text-red-400">{errors.subscriptionDuration}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Current: {formatValue('subscriptionDuration', currentConfig.subscriptionDuration)}
                            </p>
                        </div>
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
                        Update Configuration
                    </motion.button>
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmationState === 'confirm' && (
                <div className="space-y-6">
                    <div className="bg-blue-900/30 border border-blue-700/50 rounded-md p-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Configuration Changes</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-gray-400">Parameter</div>
                                <div className="text-gray-400">Current Value</div>
                                <div className="text-gray-400">New Value</div>
                            </div>
                            
                            {/* Program Fee */}
                            <div className="grid grid-cols-3 gap-2 text-sm border-t border-gray-700 pt-2">
                                <div className="text-gray-300">Program Fee</div>
                                <div className="text-gray-300">{formatValue('programFee', currentConfig.programFee)}</div>
                                <div className="text-blue-300 font-semibold">{config.programFee} ETH</div>
                            </div>
                            
                            {/* Subscription Fee */}
                            <div className="grid grid-cols-3 gap-2 text-sm border-t border-gray-700 pt-2">
                                <div className="text-gray-300">Subscription Fee</div>
                                <div className="text-gray-300">{formatValue('subscriptionFee', currentConfig.subscriptionFee)}</div>
                                <div className="text-blue-300 font-semibold">{config.subscriptionFee} ETH</div>
                            </div>
                            
                            {/* Certificate Fee */}
                            <div className="grid grid-cols-3 gap-2 text-sm border-t border-gray-700 pt-2">
                                <div className="text-gray-300">Certificate Fee</div>
                                <div className="text-gray-300">{formatValue('certificateFee', currentConfig.certificateFee)}</div>
                                <div className="text-blue-300 font-semibold">{config.certificateFee} ETH</div>
                            </div>
                            
                            {/* Revenue Share */}
                            <div className="grid grid-cols-3 gap-2 text-sm border-t border-gray-700 pt-2">
                                <div className="text-gray-300">Revenue Share</div>
                                <div className="text-gray-300">{formatValue('revenueShare', currentConfig.revenueShare)}</div>
                                <div className="text-blue-300 font-semibold">{config.revenueShare}%</div>
                            </div>
                            
                            {/* Subscription Duration */}
                            <div className="grid grid-cols-3 gap-2 text-sm border-t border-gray-700 pt-2">
                                <div className="text-gray-300">Subscription Duration</div>
                                <div className="text-gray-300">{formatValue('subscriptionDuration', currentConfig.subscriptionDuration)}</div>
                                <div className="text-blue-300 font-semibold">{config.subscriptionDuration} days</div>
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-300 mt-4">
                            These changes will affect all new organizations created after the update. Existing organizations will not be affected.
                        </p>
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
                            className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 ${
                                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                            }`}
                        >
                            {isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'Confirm Update'}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Confirmation Success */}
            {confirmationState === 'confirmed' && (
                <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-green-400">Update Successful</h3>
                    <p className="text-sm text-gray-300 mt-2">
                        The default configuration has been successfully updated.
                    </p>
                </div>
            )}
        </motion.div>
    );
}

export default UpdateDefaultConfig;