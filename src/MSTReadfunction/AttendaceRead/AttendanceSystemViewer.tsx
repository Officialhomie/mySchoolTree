import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { contractAttendanceTrackingConfig } from '../../contracts';

export type SystemContract = {
  name: string;
  functionName: string;
  description: string;
  address: `0x${string}` | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<any>;
};

export type SystemContractsData = {
  contracts: SystemContract[];
  isAllLoading: boolean;
  fetchAllContracts: () => Promise<void>;
  fetchStatus: string;
};

type SystemContractsViewerProps = {
  onDataChange?: (data: SystemContractsData) => void;
};

const SystemContractsViewer = ({ 
  onDataChange 
}: SystemContractsViewerProps) => {
    const [systemContracts, setSystemContracts] = useState<SystemContract[]>([
        {
            name: 'Revenue System',
            functionName: 'revenueSystem',
            description: 'Manages revenue collection, distribution, and reporting',
            address: null,
            isLoading: false,
            isError: false,
            refetch: async () => {},
        },
        {
            name: 'Student Management',
            functionName: 'studentManagement',
            description: 'Handles student registration, tracking, and administrative functions',
            address: null,
            isLoading: false,
            isError: false,
            refetch: async () => {},
        },
        {
            name: 'Student Profile',
            functionName: 'studentProfile',
            description: 'Stores and manages student personal information and academic profiles',
            address: null,
            isLoading: false,
            isError: false,
            refetch: async () => {},
        },
        {
            name: 'Tuition System',
            functionName: 'tuitionSystem',
            description: 'Handles tuition payments, fee calculations, and scholarship management',
            address: null,
            isLoading: false,
            isError: false,
            refetch: async () => {},
        },
    ]);

    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [isAllLoading, setIsAllLoading] = useState(false);

    // Create individual contract read hooks for each contract
    const revenueSystemResult = useReadContract({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi,
        functionName: 'revenueSystem',
        args: [],
    });

    const studentManagementResult = useReadContract({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi,
        functionName: 'studentManagement',
        args: [],
    });

    const studentProfileResult = useReadContract({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi,
        functionName: 'studentProfile',
        args: [],
    });

    const tuitionSystemResult = useReadContract({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi,
        functionName: 'tuitionSystem',
        args: [],
    });

    // Initialize contract reads
    useEffect(() => {
        const contractResults = [
            revenueSystemResult,
            studentManagementResult,
            studentProfileResult,
            tuitionSystemResult
        ];
        
        const updatedContracts = [...systemContracts];
        
        // Update each contract with the corresponding hook result
        contractResults.forEach((result, index) => {
            updatedContracts[index].isError = result.isError;
            updatedContracts[index].isLoading = result.isLoading;
            updatedContracts[index].refetch = result.refetch;
        });
        
        setSystemContracts(updatedContracts);
    }, [
        revenueSystemResult.isError, 
        revenueSystemResult.isLoading,
        studentManagementResult.isError,
        studentManagementResult.isLoading,
        studentProfileResult.isError,
        studentProfileResult.isLoading,
        tuitionSystemResult.isError,
        tuitionSystemResult.isLoading
    ]);

    // Format address for display
    const formatAddress = (address: string | null) => {
        if (!address) return 'Not Available';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    // Handle fetch all button
    const handleFetchAll = useCallback(async () => {
        setIsAllLoading(true);
        setFetchStatus('Fetching all system contract addresses...');
        setShowStatus(true);
        
        try {
            const updatedContracts = systemContracts.map(contract => ({...contract}));
            
            for (let i = 0; i < updatedContracts.length; i++) {
                updatedContracts[i].isLoading = true;
                setSystemContracts([...updatedContracts]);
                
                try {
                    const result = await updatedContracts[i].refetch();
                    updatedContracts[i].address = result.data as `0x${string}`;
                    updatedContracts[i].isError = false;
                } catch (error) {
                    console.error(`Error fetching ${updatedContracts[i].name}:`, error);
                    updatedContracts[i].isError = true;
                } finally {
                    updatedContracts[i].isLoading = false;
                    setSystemContracts([...updatedContracts]);
                }
            }
            
            setFetchStatus('All system contract addresses fetched successfully');
        } catch (error) {
            console.error('Error fetching system contracts:', error);
            setFetchStatus('Error fetching system contract addresses');
        } finally {
            setIsAllLoading(false);
        }
    }, []);

    // Export data when it changes
    useEffect(() => {
        if (onDataChange) {
            onDataChange({
                contracts: systemContracts,
                isAllLoading,
                fetchAllContracts: handleFetchAll,
                fetchStatus
            });
        }
    }, [systemContracts, isAllLoading, handleFetchAll, fetchStatus, onDataChange]);

    // Copy address to clipboard
    const CopyButton = ({ address }: { address: string | null }) => {
        const [copied, setCopied] = useState(false);
        
        if (!address) return null;
        
        const copyToClipboard = () => {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };
        
        return (
            <button 
                onClick={copyToClipboard}
                className="text-blue-400 hover:text-blue-300 transition-colors ml-2 focus:outline-none"
                title="Copy address"
            >
                {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                )}
            </button>
        );
    };

    // Handle status message timer
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
                System Contracts
            </h2>
            
            <div className="mb-6 flex justify-center">
                <motion.button
                    onClick={handleFetchAll}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isAllLoading}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                >
                    {isAllLoading ? 'Loading...' : 'Fetch All Contracts'}
                </motion.button>
            </div>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                >
                    <p className={`p-2 rounded-md text-center ${fetchStatus.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 bg-gray-800 p-4 border-b border-gray-700">
                    <div className="col-span-3 md:col-span-2 font-semibold text-gray-300">System</div>
                    <div className="col-span-9 md:col-span-6 font-semibold text-gray-300">Contract Address</div>
                    <div className="hidden md:block md:col-span-4 font-semibold text-gray-300">Description</div>
                </div>
                
                {/* Table Body */}
                {systemContracts.map((contract, index) => (
                    <div 
                        key={contract.functionName}
                        className={`grid grid-cols-12 p-4 ${index !== systemContracts.length - 1 ? 'border-b border-gray-700' : ''} hover:bg-gray-800/30 transition-colors`}
                    >
                        {/* System Name */}
                        <div className="col-span-3 md:col-span-2 flex items-center">
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-medium">
                                {contract.name}
                            </span>
                        </div>
                        
                        {/* Contract Address */}
                        <div className="col-span-9 md:col-span-6 flex items-center">
                            {contract.isLoading ? (
                                <div className="flex items-center">
                                    <div className="w-4 h-4 border-2 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin mr-2"></div>
                                    <span className="text-gray-400">Loading...</span>
                                </div>
                            ) : contract.isError ? (
                                <span className="text-red-400 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Error retrieving address
                                </span>
                            ) : contract.address ? (
                                <div className="flex items-center text-gray-200">
                                    <span>{formatAddress(contract.address)}</span>
                                    <CopyButton address={contract.address} />
                                </div>
                            ) : (
                                <span className="text-gray-500">Not fetched</span>
                            )}
                        </div>
                        
                        {/* Description - Hidden on mobile */}
                        <div className="hidden md:block md:col-span-4 text-gray-400 text-sm">
                            {contract.description}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* System relationship diagram */}
            <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-blue-400">System Architecture</h3>
                
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                    <div className="flex flex-col items-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                            {/* Revenue System */}
                            <div className={`p-3 rounded-lg border ${systemContracts[0].address ? 'border-blue-500/30 bg-blue-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
                                <div className="font-medium text-blue-400">{systemContracts[0].name}</div>
                                <div className="text-xs text-gray-400 mt-1">{systemContracts[0].description}</div>
                            </div>
                            
                            {/* Student Management */}
                            <div className={`p-3 rounded-lg border ${systemContracts[1].address ? 'border-purple-500/30 bg-purple-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
                                <div className="font-medium text-purple-400">{systemContracts[1].name}</div>
                                <div className="text-xs text-gray-400 mt-1">{systemContracts[1].description}</div>
                            </div>
                            
                            {/* Student Profile */}
                            <div className={`p-3 rounded-lg border ${systemContracts[2].address ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
                                <div className="font-medium text-green-400">{systemContracts[2].name}</div>
                                <div className="text-xs text-gray-400 mt-1">{systemContracts[2].description}</div>
                            </div>
                            
                            {/* Tuition System */}
                            <div className={`p-3 rounded-lg border ${systemContracts[3].address ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
                                <div className="font-medium text-yellow-400">{systemContracts[3].name}</div>
                                <div className="text-xs text-gray-400 mt-1">{systemContracts[3].description}</div>
                            </div>
                        </div>
                        
                        <div className="mt-5 text-center text-gray-400 text-sm">
                            {systemContracts.every(c => c.address) ? (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 inline-block">
                                    <span className="text-green-400">All system contracts are connected and operational</span>
                                </div>
                            ) : systemContracts.some(c => c.address) ? (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 inline-block">
                                    <span className="text-yellow-400">Some system contracts are connected</span>
                                </div>
                            ) : (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 inline-block">
                                    <span className="text-blue-400">Click "Fetch All Contracts" to view system connections</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Additional hooks and utilities for consuming components

// Custom hook to use the system contracts data
export const useSystemContracts = (initialData?: SystemContractsData) => {
    const [data, setData] = useState<SystemContractsData>(initialData || {
        contracts: [],
        isAllLoading: false,
        fetchAllContracts: async () => {},
        fetchStatus: ''
    });

    return {
        data,
        setData,
        getContractByName: (name: string) => {
            return data.contracts.find(contract => contract.name === name);
        },
        getContractByFunction: (functionName: string) => {
            return data.contracts.find(contract => contract.functionName === functionName);
        },
        areAllContractsLoaded: () => {
            return data.contracts.length > 0 && data.contracts.every(c => c.address !== null);
        },
        isAnyContractLoaded: () => {
            return data.contracts.some(c => c.address !== null);
        }
    };
};

export default SystemContractsViewer;