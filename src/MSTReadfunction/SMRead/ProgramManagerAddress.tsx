import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';

/**
 * ProgramManagementAddressViewer Component
 * 
 * This component fetches and displays the address of the Program Management contract
 * from another contract. It provides options to copy the address and potentially
 * explore it on a blockchain explorer.
 */
interface ProgramManagementAddressViewerProps {
  contract: any; // The contract containing the programManagement function
  onAddressFetched?: (address: string) => void; // Callback when address is fetched
  explorerId?: string; // Optional blockchain explorer ID (e.g., 'etherscan', 'bscscan')
}

const ProgramManagementAddressViewer = ({ 
  contract,
  onAddressFetched,
  explorerId = 'etherscan'
}: ProgramManagementAddressViewerProps) => {
  // State for display
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [explorerUrl, setExplorerUrl] = useState<string>('');
  
  // Fetch program management address from contract
  const { 
    data: managementAddressRaw,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'programManagement',
    args: [],
  });
  
  // Convert raw data to proper type and validate
  const managementAddress = managementAddressRaw ? 
    (typeof managementAddressRaw === 'string' ? managementAddressRaw : String(managementAddressRaw)) : 
    undefined;
  
  const isValidAddress = managementAddress ? isAddress(managementAddress) : false;
  
  // Safely extract error message
  const errorMessage = error instanceof Error ? error.message : 
                      error ? String(error) : 'Unknown error';
  
  // Generate explorer URL when address is available
  useEffect(() => {
    if (isValidAddress && managementAddress) {
      // Generate explorer URL based on the explorerId
      let baseUrl = '';
      switch (explorerId.toLowerCase()) {
        case 'bscscan':
          baseUrl = 'https://bscscan.com';
          break;
        case 'polygonscan':
          baseUrl = 'https://polygonscan.com';
          break;
        case 'optimism':
          baseUrl = 'https://optimistic.etherscan.io';
          break;
        case 'arbitrum':
          baseUrl = 'https://arbiscan.io';
          break;
        default:
          baseUrl = 'https://etherscan.io';
      }
      
      setExplorerUrl(`${baseUrl}/address/${managementAddress}`);
    }
  }, [managementAddress, explorerId, isValidAddress]);
  
  // Call the callback when address is fetched successfully
  useEffect(() => {
    if (isSuccess && isValidAddress && managementAddress && onAddressFetched) {
      onAddressFetched(managementAddress);
    }
  }, [managementAddress, isSuccess, isValidAddress, onAddressFetched]);

  // Handle copy to clipboard
  const handleCopyAddress = () => {
    if (managementAddress) {
      navigator.clipboard.writeText(managementAddress)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        })
        .catch(err => {
          console.error('Failed to copy address: ', err);
        });
    }
  };
  

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3"
    >
      <h3 className="text-lg font-medium text-blue-400">
        Program Management Contract
      </h3>
      
      <p className="text-sm text-gray-300">
        This shows the address of the Program Management contract which handles program registration, 
        enrollment, and other educational program functions.
      </p>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-300">Fetching contract address...</span>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
          <p className="text-sm">Error fetching address: {errorMessage}</p>
          <button 
            onClick={() => refetch()} 
            className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Success State with Address */}
      {isSuccess && isValidAddress && managementAddress && (
        <div className="space-y-3">
          <div className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Contract Address:</p>
            <div className="flex items-center">
              <div className="bg-gray-700/50 rounded p-2 mr-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 truncate">
                <p className="text-gray-200 font-mono text-sm truncate">{managementAddress}</p>
                <p className="text-xs text-gray-400 mt-1">Program Management Implementation</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleCopyAddress} 
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-3 rounded-md flex items-center text-sm"
            >
              {isCopied ? (
                <>
                  <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Address
                </>
              )}
            </button>
            
            {explorerUrl && (
              <a 
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on {explorerId.charAt(0).toUpperCase() + explorerId.slice(1)}
              </a>
            )}
          </div>
          
          {/* Contract Information */}
          <div className="bg-gray-700/10 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Contract Information</h4>
            
            <div className="grid grid-cols-1 gap-y-2 text-xs">
              <div>
                <span className="text-gray-400">Interface: </span>
                <span className="text-gray-200">IProgramManagement</span>
              </div>
              <div>
                <span className="text-gray-400">Address: </span>
                <span className="text-gray-200 font-mono">{managementAddress}</span>
              </div>
              <div>
                <span className="text-gray-400">Type: </span>
                <span className="text-gray-200">External Contract Reference</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Invalid Address Warning */}
      {isSuccess && managementAddress && !isValidAddress && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Invalid Contract Address</p>
              <p className="text-xs mt-1">
                The address returned by the contract does not appear to be a valid Ethereum address.
                This may indicate an issue with the contract configuration.
              </p>
              <p className="text-xs font-mono mt-2 break-all">
                Returned value: {String(managementAddressRaw)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Zero Address Warning */}
      {isSuccess && managementAddress === '0x0000000000000000000000000000000000000000' && (
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md p-3 mt-2">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Zero Address Detected</p>
              <p className="text-xs mt-1">
                The Program Management contract is set to the zero address (0x0...0000). 
                This likely means the contract has not been properly initialized or the Program Management
                implementation has not been linked yet.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProgramManagementAddressViewer;