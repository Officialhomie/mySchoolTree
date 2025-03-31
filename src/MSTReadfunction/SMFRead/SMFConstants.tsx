import { useState } from 'react';
import { useReadContracts } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';

// Define types for our constants
interface ContractConstants {
    // Role constants
    DEFAULT_ADMIN_ROLE: string;
    MASTER_ADMIN_ROLE: string;
    ADMIN_ROLE: string;
    SCHOOL_ROLE: string;
    
    // Time/duration constants
    GRACE_PERIOD: bigint;
    MAX_SUBSCRIPTION_DURATION: bigint;
    MIN_SUBSCRIPTION_DURATION: bigint;
    
    // Fee/financial constants
    MAX_REVENUE_SHARE: bigint;
    MAX_SUBSCRIPTION_FEE: bigint;
    MIN_SUBSCRIPTION_FEE: bigint;
}

// Format the grace period from seconds to days/hours
const formatGracePeriod = (seconds: bigint | undefined): string => {
    if (!seconds) return 'N/A';
    
    const totalSeconds = Number(seconds);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    
    if (days > 0) {
        return `${days} days, ${hours} hours`;
    } else if (hours > 0) {
        return `${hours} hours, ${minutes} minutes`;
    } else {
        return `${minutes} minutes`;
    }
};

// Format the revenue share from basis points to percentage
const formatRevenueShare = (basisPoints: bigint | undefined): string => {
    if (!basisPoints) return 'N/A';
    
    const percentage = Number(basisPoints) / 100;
    return `${percentage.toFixed(2)}%`;
};

// Shorten the bytes32 values for display
const shortenBytes32 = (bytes32: string | undefined): string => {
    if (!bytes32) return 'N/A';
    
    // Show the first 10 and last 8 characters
    return `${bytes32.substring(0, 10)}...${bytes32.substring(bytes32.length - 8)}`;
};

const ContractConstants = ({ contract }: { contract: any }) => {
    const [constants, setConstants] = useState<Partial<ContractConstants>>({});
    const [showConstants, setShowConstants] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Prepare contract reads for all constants
    const { refetch } = useReadContracts({
        contracts: [
            // Role constants
            {
                ...contract,
                functionName: 'DEFAULT_ADMIN_ROLE',
            },
            {
                ...contract,
                functionName: 'MASTER_ADMIN_ROLE',
            },
            {
                ...contract,
                functionName: 'ADMIN_ROLE',
            },
            {
                ...contract,
                functionName: 'SCHOOL_ROLE',
            },
            
            // Time/duration constants
            {
                ...contract,
                functionName: 'GRACE_PERIOD',
            },
            {
                ...contract,
                functionName: 'MAX_SUBSCRIPTION_DURATION',
            },
            {
                ...contract,
                functionName: 'MIN_SUBSCRIPTION_DURATION',
            },
            
            // Fee/financial constants
            {
                ...contract,
                functionName: 'MAX_REVENUE_SHARE',
            },
            {
                ...contract,
                functionName: 'MAX_SUBSCRIPTION_FEE',
            },
            {
                ...contract,
                functionName: 'MIN_SUBSCRIPTION_FEE',
            }
        ],
        query: {
            enabled: false, // Don't fetch automatically on component mount
        }
    });

    const handleFetchConstants = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await refetch();
            
            if (result.data) {
                // Create a constants object with the returned values
                const fetchedConstants: Partial<ContractConstants> = {
                    // Role constants
                    DEFAULT_ADMIN_ROLE: result.data[0].result as string,
                    MASTER_ADMIN_ROLE: result.data[1].result as string,
                    ADMIN_ROLE: result.data[2].result as string,
                    SCHOOL_ROLE: result.data[3].result as string,
                    
                    // Time/duration constants
                    GRACE_PERIOD: result.data[4].result as bigint,
                    MAX_SUBSCRIPTION_DURATION: result.data[5].result as bigint,
                    MIN_SUBSCRIPTION_DURATION: result.data[6].result as bigint,
                    
                    // Fee/financial constants
                    MAX_REVENUE_SHARE: result.data[7].result as bigint,
                    MAX_SUBSCRIPTION_FEE: result.data[8].result as bigint,
                    MIN_SUBSCRIPTION_FEE: result.data[9].result as bigint
                };
                
                setConstants(fetchedConstants);
                setShowConstants(true);
            } else {
                setError('Failed to fetch constants');
                setShowConstants(false);
            }
        } catch (err) {
            console.error('Error fetching constants:', err);
            setError('Error fetching contract constants');
            setShowConstants(false);
        } finally {
            setLoading(false);
        }
    };

    // Function to copy a value to clipboard
    const copyToClipboard = (value: string | bigint | undefined) => {
        if (!value) return;
        
        const stringValue = value.toString();
        navigator.clipboard.writeText(stringValue);
    };

    function formatEth(weiValue: bigint | undefined): string {
        if (!weiValue) return '0';
        return parseFloat(formatEther(weiValue)).toFixed(4);
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Contract Constants
            </h2>
            
            <p className="text-gray-300 text-sm mb-6">
                View important constant values defined in the contract.
            </p>

            <motion.button
                onClick={handleFetchConstants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
            >
                {loading ? (
                    <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        <span>Loading Constants...</span>
                    </div>
                ) : 'Fetch Contract Constants'}
            </motion.button>
            
            {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-md">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}
            
            {showConstants && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                        {/* Role Constants */}
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-blue-400 mb-3">Role Constants</h3>
                            <div className="space-y-4">
                                {/* DEFAULT_ADMIN_ROLE */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">DEFAULT_ADMIN_ROLE</p>
                                            <div className="font-mono text-gray-200 text-sm break-all">
                                                {showAll 
                                                    ? constants.DEFAULT_ADMIN_ROLE 
                                                    : shortenBytes32(constants.DEFAULT_ADMIN_ROLE)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">The default admin role with full control</p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.DEFAULT_ADMIN_ROLE)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* MASTER_ADMIN_ROLE */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">MASTER_ADMIN_ROLE</p>
                                            <div className="font-mono text-gray-200 text-sm break-all">
                                                {showAll 
                                                    ? constants.MASTER_ADMIN_ROLE 
                                                    : shortenBytes32(constants.MASTER_ADMIN_ROLE)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Role for platform-level administration</p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.MASTER_ADMIN_ROLE)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* ADMIN_ROLE */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">ADMIN_ROLE</p>
                                            <div className="font-mono text-gray-200 text-sm break-all">
                                                {showAll 
                                                    ? constants.ADMIN_ROLE 
                                                    : shortenBytes32(constants.ADMIN_ROLE)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Organization-level administration role</p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.ADMIN_ROLE)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                {/* SCHOOL_ROLE */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">SCHOOL_ROLE</p>
                                            <div className="font-mono text-gray-200 text-sm break-all">
                                                {showAll 
                                                    ? constants.SCHOOL_ROLE 
                                                    : shortenBytes32(constants.SCHOOL_ROLE)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Educational institution role</p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.SCHOOL_ROLE)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
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
                        </div>

                        {/* Time Constants */}
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-blue-400 mb-3">Time Constants</h3>
                            <div className="space-y-4">
                                {/* GRACE_PERIOD */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">GRACE_PERIOD</p>
                                            <div className="font-mono text-gray-200 text-sm">
                                                {formatGracePeriod(constants.GRACE_PERIOD)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Period after subscription expires before complete deactivation
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Raw value: {constants.GRACE_PERIOD?.toString() || 'N/A'} seconds
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.GRACE_PERIOD)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* MAX_SUBSCRIPTION_DURATION */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">MAX_SUBSCRIPTION_DURATION</p>
                                            <div className="font-mono text-gray-200 text-sm">
                                                {formatGracePeriod(constants.MAX_SUBSCRIPTION_DURATION)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Maximum allowed subscription period
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Raw value: {constants.MAX_SUBSCRIPTION_DURATION?.toString() || 'N/A'} seconds
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.MAX_SUBSCRIPTION_DURATION)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* MIN_SUBSCRIPTION_DURATION */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">MIN_SUBSCRIPTION_DURATION</p>
                                            <div className="font-mono text-gray-200 text-sm">
                                                {formatGracePeriod(constants.MIN_SUBSCRIPTION_DURATION)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Minimum required subscription period
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Raw value: {constants.MIN_SUBSCRIPTION_DURATION?.toString() || 'N/A'} seconds
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.MIN_SUBSCRIPTION_DURATION)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
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
                        </div>

                        {/* Financial Constants */}
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-blue-400 mb-3">Financial Constants</h3>
                            <div className="space-y-4">
                                {/* MAX_REVENUE_SHARE */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">MAX_REVENUE_SHARE</p>
                                            <div className="font-mono text-gray-200 text-sm">
                                                {formatRevenueShare(constants.MAX_REVENUE_SHARE)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Maximum platform revenue share percentage allowed
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Raw value: {constants.MAX_REVENUE_SHARE?.toString() || 'N/A'} basis points
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.MAX_REVENUE_SHARE)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* MAX_SUBSCRIPTION_FEE */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">MAX_SUBSCRIPTION_FEE</p>
                                            <div className="font-mono text-gray-200 text-sm">
                                                {formatEth(constants.MAX_SUBSCRIPTION_FEE)} ETH
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Maximum allowed subscription fee
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Raw value: {constants.MAX_SUBSCRIPTION_FEE?.toString() || 'N/A'} wei
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.MAX_SUBSCRIPTION_FEE)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* MIN_SUBSCRIPTION_FEE */}
                                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">MIN_SUBSCRIPTION_FEE</p>
                                            <div className="font-mono text-gray-200 text-sm">
                                                {formatEth(constants.MIN_SUBSCRIPTION_FEE)} ETH
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Minimum required subscription fee
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Raw value: {constants.MIN_SUBSCRIPTION_FEE?.toString() || 'N/A'} wei
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(constants.MIN_SUBSCRIPTION_FEE)}
                                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
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
                        </div>

                        {/* Show/Hide Full Values Button */}
                        <div className="p-4 border-t border-gray-700">
                            <button
                                onClick={() => setShowAll(!showAll)}
                                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md flex items-center justify-center"
                            >
                                <span>{showAll ? 'Show Shortened Values' : 'Show Full Values'}</span>
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className={`h-4 w-4 ml-2 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default ContractConstants;