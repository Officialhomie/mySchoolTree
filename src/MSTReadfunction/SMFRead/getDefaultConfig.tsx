import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';

// Interface for the deployment config structure
interface DeploymentConfig {
    programFee: bigint;
    subscriptionFee: bigint;
    certificateFee: bigint;
    revenueShare: bigint;
    subscriptionDuration: bigint;
}

// Function to format wei values to readable ETH with specified decimals
const formatEth = (weiValue: bigint | undefined, decimals: number = 4): string => {
    if (!weiValue) return '0';
    return parseFloat(formatEther(weiValue)).toFixed(decimals);
};

// Function to format duration from seconds to days
const formatDuration = (seconds: bigint | undefined): string => {
    if (!seconds) return '0';
    const days = Number(seconds) / (60 * 60 * 24);
    return days.toFixed(1);
};

// Function to format percentage values (assuming basis points - 10000 = 100%)
const formatPercentage = (value: bigint | undefined): string => {
    if (!value) return '0';
    const percentage = Number(value) / 100; // Assuming basis points (10000 = 100%)
    return percentage.toFixed(2);
};

const GetDefaultConfig = ({ contract }: { contract: any }) => {
    const [config, setConfig] = useState<DeploymentConfig | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);

    const { isError, isLoading, refetch } = useReadContract({
        ...contract,
        functionName: 'getDefaultConfig',
        enabled: false, // Don't automatically fetch on component mount
    });

    const handleFetchConfig = async () => {
        try {
            const result = await refetch();
            
            if (result.data) {
                // Cast the data to the expected shape
                const configData = result.data as DeploymentConfig;
                setConfig(configData);
                setFetchStatus('Default configuration fetched successfully');
                setShowConfig(true);
            } else {
                setFetchStatus('No configuration data found');
                setConfig(null);
                setShowConfig(false);
            }
        } catch (error) {
            console.error('Error fetching default configuration:', error);
            setFetchStatus('Error fetching default configuration');
            setConfig(null);
            setShowConfig(false);
        }
        
        setShowStatus(true);
    };

    useEffect(() => {
        if (showStatus) {
            const timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showStatus]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Default Configuration
            </h2>

            <p className="text-gray-300 text-sm mb-4">
                View the default deployment configuration parameters for new organizations.
            </p>

            <motion.button
                onClick={handleFetchConfig}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
            >
                {isLoading ? 'Loading...' : 'Fetch Default Configuration'}
            </motion.button>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4"
                >
                    <p className={`p-2 rounded-md ${fetchStatus.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading configuration data...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 mt-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error fetching configuration data</p>
                    </div>
                </div>
            )}
            
            {showConfig && config && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Default Configuration Parameters</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Program Fee */}
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Program Fee</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-bold text-gray-200">{formatEth(config.programFee)}</span>
                                    <span className="text-gray-400">ETH</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Fee for creating a new educational program</p>
                            </div>
                            
                            {/* Subscription Fee */}
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Subscription Fee</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-bold text-gray-200">{formatEth(config.subscriptionFee)}</span>
                                    <span className="text-gray-400">ETH</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Recurring fee for organization subscription</p>
                            </div>
                            
                            {/* Certificate Fee */}
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Certificate Fee</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-bold text-gray-200">{formatEth(config.certificateFee)}</span>
                                    <span className="text-gray-400">ETH</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Fee for issuing certificates</p>
                            </div>
                            
                            {/* Revenue Share */}
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Revenue Share</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-bold text-gray-200">{formatPercentage(config.revenueShare)}</span>
                                    <span className="text-gray-400">%</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Platform revenue share percentage</p>
                            </div>
                            
                            {/* Subscription Duration */}
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Subscription Duration</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-bold text-gray-200">{formatDuration(config.subscriptionDuration)}</span>
                                    <span className="text-gray-400">days</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Default subscription period length</p>
                            </div>
                        </div>
                        
                        {/* Raw Values Section - Collapsible */}
                        <div className="mt-6">
                            <details className="group">
                                <summary className="flex items-center justify-between cursor-pointer list-none text-gray-400 hover:text-blue-400 transition-colors duration-300">
                                    <span className="text-sm font-medium">View Raw Values</span>
                                    <span className="transform group-open:rotate-180 transition-transform duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </summary>
                                <div className="mt-2 grid grid-cols-1 gap-2 pl-2 border-l-2 border-gray-700">
                                    <div className="text-xs text-gray-400">
                                        <span className="text-gray-500">Program Fee:</span> {config.programFee.toString()} wei
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        <span className="text-gray-500">Subscription Fee:</span> {config.subscriptionFee.toString()} wei
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        <span className="text-gray-500">Certificate Fee:</span> {config.certificateFee.toString()} wei
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        <span className="text-gray-500">Revenue Share:</span> {config.revenueShare.toString()} basis points
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        <span className="text-gray-500">Subscription Duration:</span> {config.subscriptionDuration.toString()} seconds
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default GetDefaultConfig;