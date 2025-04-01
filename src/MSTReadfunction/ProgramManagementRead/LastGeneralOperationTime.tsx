import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress } from 'viem';

/**
 * LastOperationTimeReader Component
 * 
 * This component reads the last general operation time for a given address
 * from the contract. It includes an input field for entering an address
 * and displays the timestamp in a human-readable format.
 */
interface LastOperationTimeReaderProps {
  contract: any;
  initialAddress?: string; // Optional initial address to query
  onTimeRead?: (timestamp: number, address: string) => void; // Callback when timestamp is read
}

const LastOperationTimeReader = ({ 
  contract, 
  initialAddress = '',
  onTimeRead 
}: LastOperationTimeReaderProps) => {
  // State for address input and validation
  const [addressInput, setAddressInput] = useState<string>(initialAddress);
  const [address, setAddress] = useState<string>(initialAddress);
  const [isValidAddress, setIsValidAddress] = useState<boolean>(initialAddress ? isAddress(initialAddress) : false);
  const [hasQueried, setHasQueried] = useState<boolean>(!!initialAddress);
  
  // State for formatting the timestamp
  const [formattedTime, setFormattedTime] = useState<string>('');
  const [timeAgo, setTimeAgo] = useState<string>('');
  
  // Get last operation time from the contract
  const { 
    data: lastOperationTimeData,
    error,
    isLoading,
    isSuccess,
    refetch
  } = useReadContract({
    ...contract,
    functionName: 'lastGeneralOperationTime',
    args: [address], // Pass the address as argument
    enabled: isValidAddress && hasQueried, // Only run the query if we have a valid address and have triggered a query
  });

  // Update address validation when input changes
  useEffect(() => {
    const valid = addressInput ? isAddress(addressInput) : false;
    setIsValidAddress(valid);
  }, [addressInput]);

  // Format timestamp when data is received
  useEffect(() => {
    if (lastOperationTimeData !== undefined && isSuccess) {
      const timestamp = Number(lastOperationTimeData);
      
      if (timestamp > 0) {
        // Format as date/time
        const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
        const formattedDate = date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        setFormattedTime(formattedDate);
        
        // Calculate time ago
        const now = Math.floor(Date.now() / 1000);
        const diffInSeconds = now - timestamp;
        
        if (diffInSeconds < 60) {
          setTimeAgo(`${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`);
        } else if (diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60);
          setTimeAgo(`${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
        } else if (diffInSeconds < 86400) {
          const hours = Math.floor(diffInSeconds / 3600);
          setTimeAgo(`${hours} hour${hours !== 1 ? 's' : ''} ago`);
        } else {
          const days = Math.floor(diffInSeconds / 86400);
          setTimeAgo(`${days} day${days !== 1 ? 's' : ''} ago`);
        }
      } else {
        setFormattedTime('No operation recorded');
        setTimeAgo('');
      }
      
      // Call the callback with the timestamp if provided
      if (onTimeRead) {
        onTimeRead(timestamp, address);
      }
    }
  }, [lastOperationTimeData, isSuccess, onTimeRead, address]);

  // Handle query submission
  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidAddress) {
      setAddress(addressInput);
      setHasQueried(true);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressInput(e.target.value);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <h3 className="text-lg font-medium text-blue-400 mb-3">
        Last Operation Time
      </h3>
      
      {/* Address Input Form */}
      <form onSubmit={handleQuerySubmit} className="mb-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="address-input" className="text-xs text-gray-400">
            Ethereum Address
          </label>
          <div className="flex space-x-2">
            <input
              id="address-input"
              type="text"
              value={addressInput}
              onChange={handleInputChange}
              placeholder="0x..."
              className={`flex-1 bg-gray-700/50 border ${
                addressInput && !isValidAddress
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-gray-600 focus:border-blue-500'
              } rounded px-3 py-2 text-sm text-gray-200 focus:outline-none`}
            />
            <button
              type="submit"
              disabled={!isValidAddress}
              className={`px-4 py-2 rounded text-sm font-medium ${
                isValidAddress
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Query
            </button>
          </div>
          {addressInput && !isValidAddress && (
            <p className="text-xs text-red-400">Please enter a valid Ethereum address</p>
          )}
        </div>
      </form>
      
      {/* Query Results */}
      {hasQueried && (
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Query Results</h4>
          
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-gray-300">Reading contract data...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3">
              <p className="text-sm">Error reading operation time: {(error as Error).message || 'Unknown error'}</p>
              <button 
                onClick={() => refetch()} 
                className="text-xs mt-2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1 px-2 rounded"
              >
                Try Again
              </button>
            </div>
          )}
          
          {isSuccess && lastOperationTimeData !== undefined && (
            <div className="space-y-3">
              <div className="bg-gray-700/50 rounded-md p-3">
                <p className="text-xs text-gray-400">Address:</p>
                <p className="text-sm font-mono text-gray-300 mt-1 break-all">{address}</p>
                
                <p className="text-xs text-gray-400 mt-3">Last Operation Time:</p>
                <div className="mt-1">
                  {Number(lastOperationTimeData) > 0 ? (
                    <>
                      <p className="text-sm text-gray-200">{formattedTime}</p>
                      <p className="text-xs text-blue-400 mt-1">{timeAgo}</p>
                    </>
                  ) : (
                    <p className="text-sm text-yellow-400">No operations recorded for this address</p>
                  )}
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <p className="text-xs text-gray-400">
                    Unix Timestamp: {Number(lastOperationTimeData) > 0 ? String(lastOperationTimeData) : 'N/A'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="text-xs bg-blue-600/30 hover:bg-blue-600/40 text-blue-400 py-1 px-2 rounded"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default LastOperationTimeReader;