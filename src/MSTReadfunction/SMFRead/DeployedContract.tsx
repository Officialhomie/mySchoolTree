import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Utility function to truncate address
const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const GetSingleDeployedContract = ({ contract }: { contract: any }) => {
    const [contractIndex, setContractIndex] = useState<number>(0);
    const [contractAddress, setContractAddress] = useState<string>('');
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [isQuerySuccess, setIsQuerySuccess] = useState(false);

    const { isError, isLoading, refetch } = useReadContract({
        ...contract,
        functionName: 'deployedContracts',
        args: [BigInt(contractIndex)],
        enabled: false, // Don't automatically fetch on mount
    });

    const handleFetchContract = async () => {
        if (contractIndex < 0) {
            setFetchStatus('Please enter a valid contract index (must be a positive number)');
            setShowStatus(true);
            setIsQuerySuccess(false);
            return;
        }

        try {
            const result = await refetch();
            
            if (result.data) {
                setContractAddress(result.data as string);
                setFetchStatus('Contract address fetched successfully');
                setIsQuerySuccess(true);
            } else {
                setFetchStatus('No contract found at this index');
                setContractAddress('');
                setIsQuerySuccess(false);
            }
        } catch (error) {
            console.error('Error fetching contract address:', error);
            setFetchStatus('Error fetching contract address');
            setContractAddress('');
            setIsQuerySuccess(false);
        }
        
        setShowStatus(true);
    };

    // Handle input change with validation
    const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Only allow positive integers or empty string
        if (value === '' || /^[0-9]+$/.test(value)) {
            setContractIndex(value === '' ? 0 : parseInt(value));
        }
    };

    // Navigate through contracts
    const handlePrevious = () => {
        if (contractIndex > 0) {
            setContractIndex(contractIndex - 1);
        }
    };

    const handleNext = () => {
        setContractIndex(contractIndex + 1);
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
                Single Deployed Contract
            </h2>

            <div className="mb-4">
                <label htmlFor="contractIndex" className="block text-sm font-medium text-gray-300 mb-1">
                    Contract Index
                </label>
                <div className="flex space-x-3">
                    <input
                        id="contractIndex"
                        type="text"
                        value={contractIndex.toString()}
                        onChange={handleIndexChange}
                        placeholder="Enter contract index (0, 1, 2, ...)"
                        className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5"
                    />
                    <motion.button
                        onClick={handleFetchContract}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'Fetch'}
                    </motion.button>
                </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex space-x-3 mb-4">
                <motion.button
                    onClick={handlePrevious}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={contractIndex <= 0 || isLoading}
                    className="bg-gray-800 text-gray-300 border border-gray-700 py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                >
                    <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Previous</span>
                    </div>
                </motion.button>
                <motion.button
                    onClick={handleNext}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="bg-gray-800 text-gray-300 border border-gray-700 py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md disabled:opacity-50 flex-1"
                >
                    <div className="flex items-center justify-center">
                        <span>Next</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </motion.button>
            </div>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                >
                    <p className={`p-2 rounded-md ${isQuerySuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading contract address...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error fetching contract address</p>
                    </div>
                </div>
            )}
            
            {contractAddress && isQuerySuccess && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Contract Details</h3>
                        
                        <div className="space-y-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-400">Contract Index</p>
                                    <p className="text-gray-200 font-semibold">{contractIndex}</p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                                <div className="font-mono text-gray-200 break-all">
                                    <span className="block md:hidden">{truncateAddress(contractAddress)}</span>
                                    <span className="hidden md:block">{contractAddress}</span>
                                </div>
                            </div>
                            
                            <motion.div
                                className="flex space-x-3 mt-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(contractAddress);
                                        setFetchStatus('Address copied to clipboard!');
                                        setShowStatus(true);
                                    }}
                                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md flex-1 flex items-center justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                    </svg>
                                    Copy Address
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default GetSingleDeployedContract;