import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

// Utility function to truncate address
const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const GetDeployedContracts = ({ contract }: { contract: any }) => {
    const [deployedContracts, setDeployedContracts] = useState<any[]>([]);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [showList, setShowList] = useState(false);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);

    const { data, isError, isLoading } = useReadContract({
        ...contract,
        functionName: 'getDeployedContracts',
        args: [offset, limit],
    });    

    const handleToggleContracts = () => {
        if (!deployedContracts.length) {
            if (data) {
                setDeployedContracts(data as any);
                setFetchStatus('Contracts fetched successfully');
            } else {
                setFetchStatus('No contracts found or error fetching contracts');
            }
            setShowStatus(true);
        }
        setShowList(!showList);
    };

    const handleLoadMore = () => {
        setOffset(offset + limit);
    };

    useEffect(() => {
        if (data && (data as any).length > 0) {
            setDeployedContracts(prev => [...prev, ...data as any]);
        }
    }, [data]);

    useEffect(() => {
        if (showStatus) {
            const timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showStatus]);

    if (isLoading && offset === 0) {
        return (
            <div className="bg-gray-900/90 border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9">
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading contracts...</span>
                </div>
            </div>
        );
    }
    
    if (isError) {
        return (
            <div className="bg-gray-900/90 border border-red-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9">
                <div className="text-red-400 text-center p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xl">Error fetching deployed contracts</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Deployed Contracts
            </h2>

            <div className="flex gap-4 mb-4">
                <div>
                    <label htmlFor="limit" className="block text-sm font-medium text-gray-300 mb-1">
                        Limit per page
                    </label>
                    <select
                        id="limit"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-purple-500 block w-full p-2.5"
                    >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>
            
            <motion.button
                onClick={handleToggleContracts}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg"
            >
                {showList ? 'Hide Contracts' : 'Fetch Contracts'}
            </motion.button>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 text-center"
                >
                    <p className={`p-2 rounded-md ${fetchStatus.includes('error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            <div className="mt-6">
                {showList && deployedContracts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                    >
                        <h3 className="text-lg font-semibold mb-2 text-blue-400">Contracts List:</h3>
                        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {deployedContracts.map((contractAddress, index) => (
                                <motion.li 
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 rounded-md transition-colors duration-200"
                                >
                                    <span className="block md:hidden text-gray-300">{truncateAddress(contractAddress)}</span>
                                    <span className="hidden md:block text-gray-300 font-mono">{contractAddress}</span>
                                </motion.li>
                            ))}
                        </ul>
                        
                        {limit > 0 && (
                            <motion.button
                                onClick={handleLoadMore}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="mt-4 w-full bg-gray-800 text-gray-300 border border-gray-700 py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300 shadow-md"
                            >
                                <div className="flex items-center justify-center">
                                    <span>Load More</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(31, 41, 55, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #60a5fa, #a78bfa);
                    border-radius: 10px;
                }
            `}</style>
        </motion.div>
    );
}

export default GetDeployedContracts;