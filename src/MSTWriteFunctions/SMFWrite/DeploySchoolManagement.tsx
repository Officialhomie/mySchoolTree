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
const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

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

const DeploySchoolManagement = ({ contract }: { contract: any }) => {
    // State for admin address
    const [adminAddress, setAdminAddress] = useState<string>('');
    
    // State for configuration selection
    const [useDefaultConfig, setUseDefaultConfig] = useState<boolean>(true);
    
    // State for custom config values
    const [customConfig, setCustomConfig] = useState<DeploymentConfig>({
        programFee: '',
        subscriptionFee: '',
        certificateFee: '',
        revenueShare: '',
        subscriptionDuration: ''
    });
    
    // State for the default config (read from contract)
    const [defaultConfig, setDefaultConfig] = useState<any>(null);
    const [defaultConfigLoaded, setDefaultConfigLoaded] = useState<boolean>(false);
    
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
    
    // Deployed contract address (returned by the function)
    const [deployedAddress, setDeployedAddress] = useState<string>('');
    
    // Transaction state
    const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

    // Read the default config from the contract
    const { refetch: refetchDefaultConfig } = useReadContract({
        ...contract,
        functionName: 'getDefaultConfig',
        enabled: false, // Don't fetch automatically on component mount
    });

    // Fetch the default config when component loads
    const handleFetchDefaultConfig = async () => {
        try {
            const result = await refetchDefaultConfig();
            
            if (result.data) {
                // Transform the data into our format
                const configData = result.data as any;
                setDefaultConfig({
                    programFee: configData.programFee,
                    subscriptionFee: configData.subscriptionFee,
                    certificateFee: configData.certificateFee,
                    revenueShare: configData.revenueShare,
                    subscriptionDuration: configData.subscriptionDuration
                });
                
                // Set the payment amount to the subscription fee by default
                setPaymentAmount(ethers.formatEther(configData.subscriptionFee));
                
                // Initialize custom config with default values (formatted for human readability)
                setCustomConfig({
                    programFee: ethers.formatEther(configData.programFee),
                    subscriptionFee: ethers.formatEther(configData.subscriptionFee),
                    certificateFee: ethers.formatEther(configData.certificateFee),
                    revenueShare: (Number(configData.revenueShare) / 100).toString(), // Convert from basis points
                    subscriptionDuration: (Number(configData.subscriptionDuration) / (24 * 60 * 60)).toString() // Convert from seconds to days
                });
                
                setDefaultConfigLoaded(true);
            } else {
                setStatusMessage('Failed to fetch default configuration');
                setStatusType('error');
                setShowStatus(true);
            }
        } catch (err) {
            console.error('Error fetching default config:', err);
            setStatusMessage(`Error fetching configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
        }
    };

    // Load default config on component mount
    useEffect(() => {
        handleFetchDefaultConfig();
    }, []);

    // Handle admin address change with validation
    const handleAdminAddressChange = (value: string) => {
        setAdminAddress(value);
        
        if (!isValidAddress(value) && value !== '') {
            setErrors(prev => ({ ...prev, adminAddress: 'Please enter a valid Ethereum address' }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.adminAddress;
                return newErrors;
            });
        }
    };

    // Handle custom config changes with validation
    const handleCustomConfigChange = (field: keyof DeploymentConfig, value: string) => {
        setCustomConfig(prev => ({ ...prev, [field]: value }));
        
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
        
        // Update payment amount when subscription fee changes
        if (field === 'subscriptionFee' && isValidAmount(value)) {
            setPaymentAmount(value);
        }
    };

    // Handle payment amount change with validation
    const handlePaymentAmountChange = (value: string) => {
        setPaymentAmount(value);
        
        if (!isValidAmount(value)) {
            setErrors(prev => ({ ...prev, paymentAmount: 'Please enter a valid amount (must be a positive number)' }));
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
        // Required fields for all cases
        let requiredFields = [adminAddress];
        
        // Add custom config fields if using custom config
        if (!useDefaultConfig) {
            requiredFields = [
                ...requiredFields,
                customConfig.programFee,
                customConfig.subscriptionFee,
                customConfig.certificateFee,
                customConfig.revenueShare,
                customConfig.subscriptionDuration
            ];
        }
        
        // Add payment amount
        requiredFields.push(paymentAmount);
        
        const allFieldsFilled = requiredFields.every(field => field.trim() !== '');
        const noErrors = Object.keys(errors).length === 0;
        
        setValidForm(allFieldsFilled && noErrors && defaultConfigLoaded);
    }, [adminAddress, useDefaultConfig, customConfig, paymentAmount, errors, defaultConfigLoaded]);

    // Handle transaction success
    useEffect(() => {
        if (isConfirmed && hash) {
            // Get the deployed contract address from the transaction receipt
            const receipt = hash; // This would need additional processing to extract the actual address
            
            setDeployedAddress(receipt); // Placeholder - in real implementation you'd extract the deployed address
            setStatusMessage('School management contract deployed successfully!');
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

    // Initial request to deploy
    const handleDeployRequest = () => {
        if (!validForm) {
            setStatusMessage('Please fix form errors before submitting');
            setStatusType('error');
            setShowStatus(true);
            return;
        }
        
        // Set to confirmation state
        setConfirmationState('confirm');
        setStatusMessage('You are about to deploy a new school management contract. Please review the details and confirm.');
        setStatusType('warning');
        setShowStatus(true);
    };

    // Handle the actual deployment after confirmation
    const handleDeployConfirm = async () => {
        try {
            // Reset any previous errors
            resetWrite?.();
            
            let configForBlockchain;
            
            if (useDefaultConfig) {
                // Use the default config from the contract
                configForBlockchain = [
                    defaultConfig.programFee,
                    defaultConfig.subscriptionFee,
                    defaultConfig.certificateFee,
                    defaultConfig.revenueShare,
                    defaultConfig.subscriptionDuration
                ];
            } else {
                // Convert custom values to appropriate format for blockchain
                configForBlockchain = [
                    ethers.parseEther(customConfig.programFee),
                    ethers.parseEther(customConfig.subscriptionFee),
                    ethers.parseEther(customConfig.certificateFee),
                    BigInt(Math.floor(parseFloat(customConfig.revenueShare) * 100)), // Convert to basis points
                    BigInt(parseInt(customConfig.subscriptionDuration) * 24 * 60 * 60) // Convert days to seconds
                ];
            }
            
            // Convert payment amount to wei
            const valueInWei = ethers.parseEther(paymentAmount);
            
            // Call the contract function
            writeContract({
                ...contract,
                functionName: 'deploySchoolManagement',
                args: [adminAddress, configForBlockchain],
                value: valueInWei
            });
            
            setStatusMessage('Deployment transaction submitted. Waiting for confirmation...');
            setStatusType('info');
            setShowStatus(true);
        } catch (err) {
            console.error('Error deploying school management:', err);
            setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setStatusType('error');
            setShowStatus(true);
            setConfirmationState('initial');
        }
    };

    // Cancel the deployment request
    const handleCancel = () => {
        setConfirmationState('initial');
        setStatusMessage('Deployment cancelled');
        setStatusType('info');
        setShowStatus(true);
    };

    // Format value display
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
                Deploy School Management
            </h2>
            
            <p className="text-gray-300 text-sm mb-6">
                Deploy a new school management contract for an organization.
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
                    {/* Organization Admin */}
                    <div>
                        <label htmlFor="adminAddress" className="block text-sm font-medium text-gray-300 mb-1">
                            Organization Admin Address <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="adminAddress"
                            type="text"
                            value={adminAddress}
                            onChange={(e) => handleAdminAddressChange(e.target.value)}
                            placeholder="0x..."
                            disabled={isPending || isConfirming}
                            className={`bg-gray-800 border ${errors.adminAddress ? 'border-red-500' : 'border-gray-600'} text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5 disabled:opacity-60`}
                        />
                        {errors.adminAddress && (
                            <p className="mt-1 text-xs text-red-400">{errors.adminAddress}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            This address will have admin privileges for the deployed contract
                        </p>
                    </div>
                    
                    {/* Configuration Type Selection */}
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Configuration Settings</h3>
                        
                        <div className="flex space-x-4 mb-4">
                            <div className="flex items-center">
                                <input
                                    id="default-config"
                                    type="radio"
                                    checked={useDefaultConfig}
                                    onChange={() => setUseDefaultConfig(true)}
                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800 focus:ring-2"
                                />
                                <label htmlFor="default-config" className="ml-2 text-sm font-medium text-gray-300">
                                    Use Default Configuration
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    id="custom-config"
                                    type="radio"
                                    checked={!useDefaultConfig}
                                    onChange={() => setUseDefaultConfig(false)}
                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800 focus:ring-2"
                                />
                                <label htmlFor="custom-config" className="ml-2 text-sm font-medium text-gray-300">
                                    Use Custom Configuration
                                </label>
                            </div>
                        </div>
                        
                        {defaultConfigLoaded && useDefaultConfig && (
                            <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Default Configuration</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-gray-400">Program Fee:</div>
                                    <div className="text-gray-200">{formatValue('programFee', defaultConfig.programFee)}</div>
                                    
                                    <div className="text-gray-400">Subscription Fee:</div>
                                    <div className="text-gray-200">{formatValue('subscriptionFee', defaultConfig.subscriptionFee)}</div>
                                    
                                    <div className="text-gray-400">Certificate Fee:</div>
                                    <div className="text-gray-200">{formatValue('certificateFee', defaultConfig.certificateFee)}</div>
                                    
                                    <div className="text-gray-400">Revenue Share:</div>
                                    <div className="text-gray-200">{formatValue('revenueShare', defaultConfig.revenueShare)}</div>
                                    
                                    <div className="text-gray-400">Subscription Duration:</div>
                                    <div className="text-gray-200">{formatValue('subscriptionDuration', defaultConfig.subscriptionDuration)}</div>
                                </div>
                            </div>
                        )}
                        
                        {/* Custom Config Form */}
                        {!useDefaultConfig && (
                            <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Program Fee */}
                                    <div>
                                        <label htmlFor="programFee" className="block text-sm font-medium text-gray-300 mb-1">
                                            Program Fee (ETH) <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="programFee"
                                                type="text"
                                                value={customConfig.programFee}
                                                onChange={(e) => handleCustomConfigChange('programFee', e.target.value)}
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
                                                value={customConfig.subscriptionFee}
                                                onChange={(e) => handleCustomConfigChange('subscriptionFee', e.target.value)}
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
                                                value={customConfig.certificateFee}
                                                onChange={(e) => handleCustomConfigChange('certificateFee', e.target.value)}
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
                                                value={customConfig.revenueShare}
                                                onChange={(e) => handleCustomConfigChange('revenueShare', e.target.value)}
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
                                                value={customConfig.subscriptionDuration}
                                                onChange={(e) => handleCustomConfigChange('subscriptionDuration', e.target.value)}
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
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
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
                                disabled={isPending || isConfirming}
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
                            Amount to send with this transaction (should cover subscription fee)
                        </p>
                    </div>
                    
                    {/* Deploy Button */}
                    <motion.button
                        onClick={handleDeployRequest}
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
                        Deploy School Management Contract
                    </motion.button>
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmationState === 'confirm' && (
                <div className="space-y-6">
                    <div className="bg-blue-900/30 border border-blue-700/50 rounded-md p-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">Deployment Details</h3>
                        
                        <div className="space-y-4">
                            {/* Admin Address */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Organization Admin</p>
                                <div className="font-mono text-sm bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                    {adminAddress}
                                </div>
                            </div>
                            
                            {/* Configuration */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Configuration</p>
                                <div className="bg-gray-800 p-2 rounded-md text-gray-300">
                                    <p className="text-xs mb-2">{useDefaultConfig ? 'Using Default Configuration' : 'Using Custom Configuration'}</p>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-gray-400">Program Fee:</div>
                                        <div className="text-gray-200">
                                            {useDefaultConfig 
                                                ? formatValue('programFee', defaultConfig.programFee)
                                                : `${customConfig.programFee} ETH`
                                            }
                                        </div>
                                        
                                        <div className="text-gray-400">Subscription Fee:</div>
                                        <div className="text-gray-200">
                                            {useDefaultConfig 
                                                ? formatValue('subscriptionFee', defaultConfig.subscriptionFee)
                                                : `${customConfig.subscriptionFee} ETH`
                                            }
                                        </div>
                                        
                                        <div className="text-gray-400">Certificate Fee:</div>
                                        <div className="text-gray-200">
                                            {useDefaultConfig 
                                                ? formatValue('certificateFee', defaultConfig.certificateFee)
                                                : `${customConfig.certificateFee} ETH`
                                            }
                                        </div>
                                        
                                        <div className="text-gray-400">Revenue Share:</div>
                                        <div className="text-gray-200">
                                            {useDefaultConfig 
                                                ? formatValue('revenueShare', defaultConfig.revenueShare)
                                                : `${customConfig.revenueShare}%`
                                            }
                                        </div>
                                        
                                        <div className="text-gray-400">Subscription Duration:</div>
                                        <div className="text-gray-200">
                                            {useDefaultConfig 
                                                ? formatValue('subscriptionDuration', defaultConfig.subscriptionDuration)
                                                : `${customConfig.subscriptionDuration} days`
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Payment Amount */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Payment Amount</p>
                                <div className="text-gray-200 text-sm bg-gray-800 p-2 rounded-md">
                                    {paymentAmount} ETH
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    This amount will be sent with the transaction and should cover at least the subscription fee.
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                            <p className="text-sm text-yellow-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 mb-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                This transaction will deploy a new contract and requires a payment to cover the subscription.
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
                            onClick={handleDeployConfirm}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isPending || isConfirming}
                            className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 ${
                                isPending || isConfirming ? 'opacity-70 cursor-not-allowed' : 'opacity-100'
                            }`}
                        >
                            {isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'Confirm Deployment'}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Deployment Success */}
            {confirmationState === 'confirmed' && (
                <div className="space-y-6">
                    <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-400">Deployment Successful</h3>
                        <p className="text-sm text-gray-300 mt-2">
                            The school management contract has been successfully deployed.
                        </p>
                    </div>
                    
                    {/* Deployed Contract Details */}
                    {deployedAddress && (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
                            <h3 className="text-md font-semibold text-blue-400 mb-2">Contract Details</h3>
                            
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Deployed Contract Address</p>
                                <div className="flex items-center">
                                    <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 overflow-x-auto max-w-full flex-1 break-all">
                                        {deployedAddress}
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(deployedAddress);
                                            setStatusMessage('Contract address copied to clipboard!');
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
                                <p className="text-sm text-gray-400 mb-1">Admin Address</p>
                                <div className="font-mono text-xs bg-gray-800 p-2 rounded-md text-gray-300 break-all">
                                    {adminAddress}
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-4">
                                Save this information for future reference. The admin address now has control over this contract.
                            </p>
                        </div>
                    )}
                    
                    {/* Reset Button */}
                    <motion.button
                        onClick={() => {
                            // Reset the form for a new deployment
                            setAdminAddress('');
                            setUseDefaultConfig(true);
                            setPaymentAmount(ethers.formatEther(defaultConfig.subscriptionFee));
                            setConfirmationState('initial');
                            setDeployedAddress('');
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-300"
                    >
                        Deploy Another Contract
                    </motion.button>
                </div>
            )}
        </motion.div>
    );
}

export default DeploySchoolManagement;