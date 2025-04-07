import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contractRevenueSystemConfig } from '../contracts';

// Import custom hooks from both components
import { useDefaultFeeStructure } from '../MSTWriteFunctions/RevenueSystemWrite/UpdateDefaultFeeStructure';
import { useSchoolRevenueWithdrawal } from '../MSTWriteFunctions/RevenueSystemWrite/WithdrawSchoolRevenue';

/**
 * SchoolFinanceManager Component
 * 
 * This component provides a unified interface for school financial management combining:
 * 1. Fee Structure Management - For administrators to update the default fee structure
 * 2. Revenue Withdrawal - For school admins to withdraw their accumulated revenue
 * 
 * It implements critical security checks:
 * - Verifies the caller has the appropriate roles (ADMIN_ROLE or SCHOOL_ADMIN_ROLE)
 * - Confirms the contract is not paused before processing transactions
 * 
 * Callback functions:
 * - onFeeUpdateComplete: Called when fee structure update is complete with transaction hash
 * - onWithdrawComplete: Called when withdrawal is complete with transaction hash and amount
 */
interface SchoolFinanceManagerProps {
  contracts?: {
    fee?: any;
    role?: any;
    pause?: any;
  };
  onFeeUpdateComplete?: (txHash: string) => void;
  onWithdrawComplete?: (txHash: string, amount: string) => void;
  defaultTab?: 'fees' | 'revenue';
  customRoleId?: string;
  hideEducationalInfo?: boolean;
}

const SchoolFinanceManager = ({
  contracts = {},
  onFeeUpdateComplete,
  onWithdrawComplete,
  defaultTab = 'fees',
  customRoleId,
  hideEducationalInfo = false
}: SchoolFinanceManagerProps) => {
  // Default contract config
  const defaultContracts = {
    fee: contractRevenueSystemConfig,
    role: contractRevenueSystemConfig,
    pause: contractRevenueSystemConfig
  };
  
  // Merge provided contracts with defaults
  const mergedContracts = {
    fee: contracts.fee || defaultContracts.fee,
    role: contracts.role || defaultContracts.role,
    pause: contracts.pause || defaultContracts.pause
  };
  
  // Use hooks from both components
  const feeStructureHook = useDefaultFeeStructure(
    mergedContracts.fee,
    mergedContracts.role,
    mergedContracts.pause,
    onFeeUpdateComplete
  );
  
  const {
    SchoolRevenueWithdrawalComponent,
    state: withdrawalState,
    refresh: refreshWithdrawal,
  } = useSchoolRevenueWithdrawal(
    false, // Don't auto-refresh
    customRoleId,
    hideEducationalInfo
  );
  
  /**
   * Custom wrapper for the SchoolRevenueWithdrawalComponent
   * 
   * This wrapper monitors the withdrawal state and triggers the onWithdrawComplete callback
   * provided through props whenever a withdrawal transaction is successfully completed.
   * 
   * It tracks processed transactions to avoid duplicate callbacks for the same transaction.
   */
  const CustomSchoolRevenueWithdrawalComponent = () => {
    // Track transactions we've already handled to prevent duplicate callbacks
    const [processedTransactions, setProcessedTransactions] = useState<Set<string>>(new Set());
    
    // Create a handler that will use both our hook's internal handler and the props callback
    const handleWithdrawComplete = (txHash: string, amount: string) => {
      // If a callback was provided through props, call it
      if (onWithdrawComplete && !processedTransactions.has(txHash)) {
        console.log(`Withdrawal complete - TX Hash: ${txHash}, Amount: ${amount}`);
        onWithdrawComplete(txHash, amount);
        
        // Add to processed transactions
        setProcessedTransactions(prev => {
          const newSet = new Set(prev);
          newSet.add(txHash);
          return newSet;
        });
      }
    };

    // Now we use a useEffect to watch the withdrawalState and call our handler when a transaction completes
    useEffect(() => {
      if (withdrawalState && 
          withdrawalState.isSuccess && 
          withdrawalState.transactionHash) {
        handleWithdrawComplete(
          withdrawalState.transactionHash,
          withdrawalState.availableBalance
        );
      }
    }, [withdrawalState]);

    return <SchoolRevenueWithdrawalComponent />;
  };
  
  // Tab state
  const [selectedTabIndex, setSelectedTabIndex] = useState(defaultTab === 'revenue' ? 1 : 0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    hasAdminRole: false,
    hasSchoolAdminRole: false,
    isPaused: false,
    isLoading: true
  });
  
  // Combined refresh function with sequential refreshes to avoid race conditions
  const refreshAll = () => {
    // Set loading indicator
    setLastRefreshed(new Date());
    
    // First refresh fee structure data
    feeStructureHook.refreshData();
    
    // Wait a short time before refreshing withdrawal data to avoid potential race conditions
    setTimeout(() => {
      refreshWithdrawal();
    }, 500);
  };
  
  // Update system status
  useEffect(() => {
    if (!feeStructureHook.isLoading && withdrawalState) {
      setSystemStatus({
        hasAdminRole: feeStructureHook.hasRole,
        hasSchoolAdminRole: withdrawalState.hasRole,
        isPaused: feeStructureHook.isPaused || (withdrawalState ? withdrawalState.isPaused : false),
        isLoading: feeStructureHook.isLoading || (withdrawalState ? withdrawalState.isLoading : true)
      });
    }
  }, [feeStructureHook.isLoading, feeStructureHook.hasRole, feeStructureHook.isPaused, withdrawalState]);
  
  // Format time since last refresh
  const getTimeSinceLastRefresh = () => {
    if (!lastRefreshed) return 'Never refreshed';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastRefreshed.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-amber-400">School Finance Manager</h2>
        
        <button
          onClick={refreshAll}
          className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh All Data
        </button>
      </div>
      
      {/* System Status Overview */}
      {!systemStatus.isLoading && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <h3 className="text-md font-medium text-gray-300 mb-3">System Status Overview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-700/40 rounded-md p-3">
              <p className="text-xs text-gray-400">Admin Role Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${systemStatus.hasAdminRole ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <p className={`text-sm ${systemStatus.hasAdminRole ? 'text-green-400' : 'text-red-400'}`}>
                  {systemStatus.hasAdminRole ? 'ADMIN_ROLE Granted' : 'Missing ADMIN_ROLE'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-700/40 rounded-md p-3">
              <p className="text-xs text-gray-400">School Admin Role Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${systemStatus.hasSchoolAdminRole ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <p className={`text-sm ${systemStatus.hasSchoolAdminRole ? 'text-green-400' : 'text-red-400'}`}>
                  {systemStatus.hasSchoolAdminRole ? 'SCHOOL_ADMIN_ROLE Granted' : 'Missing SCHOOL_ADMIN_ROLE'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-700/40 rounded-md p-3">
              <p className="text-xs text-gray-400">Contract Status:</p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full ${systemStatus.isPaused ? 'bg-red-500' : 'bg-green-500'} mr-2`}></div>
                <p className={`text-sm ${systemStatus.isPaused ? 'text-red-400' : 'text-green-400'}`}>
                  {systemStatus.isPaused ? 'System Paused' : 'System Active'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-400 flex items-center justify-end">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Last refreshed: {getTimeSinceLastRefresh()}
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {systemStatus.isLoading && (
        <div className="flex items-center justify-center py-6 bg-gray-700/20 rounded-lg mb-4">
          <div className="w-6 h-6 border-2 border-t-amber-400 border-amber-200/30 rounded-full animate-spin mr-3"></div>
          <span className="text-sm text-gray-300">Loading financial system status...</span>
        </div>
      )}

      {/* Tab Interface */}
      {!systemStatus.isLoading && (
        <div>
          {/* Tab Navigation */}
          <div className="flex rounded-lg bg-gray-700/30 p-1 mb-4">
            <button
              onClick={() => setSelectedTabIndex(0)}
              className={`w-full py-2.5 text-sm font-medium leading-5 text-white rounded-lg
                ${selectedTabIndex === 0 
                  ? 'bg-amber-600 shadow' 
                  : 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
                }`
              }
            >
              Fee Structure Management
            </button>
            <button
              onClick={() => setSelectedTabIndex(1)}
              className={`w-full py-2.5 text-sm font-medium leading-5 text-white rounded-lg
                ${selectedTabIndex === 1
                  ? 'bg-amber-600 shadow' 
                  : 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
                }`
              }
            >
              Revenue Withdrawal
            </button>
          </div>
          
          {/* Tab Panels */}
          <AnimatePresence mode="wait">
            {selectedTabIndex === 0 && (
              <motion.div
                key="fee-structure"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-amber-400 mb-3">Default Fee Structure Management</h3>
                  
                  {/* System Status Banner */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border mb-4 ${
                    feeStructureHook.canUpdate 
                      ? 'bg-green-900/20 border-green-700/30' 
                      : 'bg-red-900/20 border-red-700/30'
                  }`}>
                    <div className="flex items-center">
                      {feeStructureHook.canUpdate ? (
                        <>
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          </div>
                          <div>
                            <h4 className="text-md font-medium text-green-400">System Ready</h4>
                            <p className="text-xs text-gray-300 mt-0.5">You can update the default fee structure</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          </div>
                          <div>
                            <h4 className="text-md font-medium text-red-400">System Unavailable</h4>
                            <p className="text-xs text-gray-300 mt-0.5">
                              {!feeStructureHook.hasRole && 'You lack the required ADMIN_ROLE permissions'}
                              {feeStructureHook.hasRole && feeStructureHook.isPaused && 'The system is currently paused'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={feeStructureHook.loadCurrentFeeStructure}
                        className="flex items-center text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={feeStructureHook.isLoading}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Load Current
                      </button>
                    </div>
                  </div>
                  
                  {/* Fee Structure Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="programFee" className="block text-sm font-medium text-gray-300 mb-1">
                        Program Fee (wei)
                      </label>
                      <input
                        id="programFee"
                        type="text"
                        value={feeStructureHook.programFee}
                        onChange={(e) => feeStructureHook.setProgramFee(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Fee charged when creating a new program
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="subscriptionFee" className="block text-sm font-medium text-gray-300 mb-1">
                        Subscription Fee (wei)
                      </label>
                      <input
                        id="subscriptionFee"
                        type="text"
                        value={feeStructureHook.subscriptionFee}
                        onChange={(e) => feeStructureHook.setSubscriptionFee(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Fee charged for subscription services
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="certificateFee" className="block text-sm font-medium text-gray-300 mb-1">
                        Certificate Fee (wei)
                      </label>
                      <input
                        id="certificateFee"
                        type="text"
                        value={feeStructureHook.certificateFee}
                        onChange={(e) => feeStructureHook.setCertificateFee(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Fee charged for issuing certificates
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="revenueShare" className="block text-sm font-medium text-gray-300 mb-1">
                        Revenue Share (basis points)
                      </label>
                      <input
                        id="revenueShare"
                        type="text"
                        value={feeStructureHook.revenueShare}
                        onChange={(e) => feeStructureHook.setRevenueShare(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Revenue share in basis points (1-10000, where 10000 = 100%)
                      </p>
                    </div>
                  </div>
                  
                  {/* Error Message */}
                  {feeStructureHook.errorMessage && (
                    <div className="w-full bg-red-500/20 text-red-400 border border-red-500/30 rounded-md p-3 mb-4 text-sm">
                      {feeStructureHook.errorMessage}
                    </div>
                  )}
                  
                  {/* Update Button */}
                  <button
                    onClick={feeStructureHook.handleUpdateFeeStructure}
                    disabled={feeStructureHook.isProcessing || !feeStructureHook.canUpdate || !feeStructureHook.isFormValid}
                    className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center ${
                      feeStructureHook.isProcessing || !feeStructureHook.canUpdate || !feeStructureHook.isFormValid
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500'
                    }`}
                  >
                    {feeStructureHook.isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Update Default Fee Structure
                      </>
                    )}
                  </button>
                  
                  {/* Transaction Success Message */}
                  {feeStructureHook.isUpdateConfirmed && !feeStructureHook.isUpdateConfirming && (
                    <div className="mt-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium">Default Fee Structure Successfully Updated</p>
                          <p className="text-xs mt-1">The default fee structure has been successfully updated. New schools will use these values.</p>
                          <div className="mt-2 pt-2 border-t border-green-500/20">
                            <p className="text-xs text-gray-300">Transaction Hash:</p>
                            <a
                              href={`https://etherscan.io/tx/${feeStructureHook.updateTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 font-mono break-all hover:underline"
                            >
                              {feeStructureHook.updateTxHash}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Educational Information */}
                {!hideEducationalInfo && (
                  <div className="mt-4 bg-gray-700/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">About Fee Structure Management</h4>
                    <p className="text-sm text-gray-400">
                      The fee structure management allows administrators to set platform-wide default fees for various services:
                    </p>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-700/40 rounded-md p-3">
                        <h5 className="text-xs font-medium text-amber-400 mb-1">Program Fee</h5>
                        <p className="text-xs text-gray-400">
                          One-time fee charged when creating a new educational program on the platform.
                        </p>
                      </div>
                      
                      <div className="bg-gray-700/40 rounded-md p-3">
                        <h5 className="text-xs font-medium text-amber-400 mb-1">Subscription Fee</h5>
                        <p className="text-xs text-gray-400">
                          Recurring fee for subscription-based access to platform services and content.
                        </p>
                      </div>
                      
                      <div className="bg-gray-700/40 rounded-md p-3">
                        <h5 className="text-xs font-medium text-amber-400 mb-1">Certificate Fee</h5>
                        <p className="text-xs text-gray-400">
                          Fee charged when issuing certificates to students upon course completion.
                        </p>
                      </div>
                      
                      <div className="bg-gray-700/40 rounded-md p-3">
                        <h5 className="text-xs font-medium text-amber-400 mb-1">Revenue Share</h5>
                        <p className="text-xs text-gray-400">
                          Percentage of revenue shared with the platform (in basis points, where 10000 = 100%).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {selectedTabIndex === 1 && (
              <motion.div
                key="revenue-withdrawal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CustomSchoolRevenueWithdrawalComponent />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {/* Financial Analytics Dashboard (Optional) */}
      {!systemStatus.isLoading && !hideEducationalInfo && (
        <div className="mt-4 bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-lg font-medium text-amber-400 mb-3">Financial Analytics</h3>
          
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-300">Revenue Overview</h4>
              <div className="bg-amber-600/20 text-amber-400 text-xs px-2 py-1 rounded">
                Coming Soon
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/40 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Collected Fees</p>
                <p className="text-xl font-semibold text-white mt-1">-- ETH</p>
              </div>
              
              <div className="bg-gray-700/40 rounded-lg p-3">
                <p className="text-xs text-gray-400">Revenue Share Percentage</p>
                <p className="text-xl font-semibold text-white mt-1">-- %</p>
              </div>
              
              <div className="bg-gray-700/40 rounded-lg p-3">
                <p className="text-xs text-gray-400">Monthly Revenue</p>
                <p className="text-xl font-semibold text-white mt-1">-- ETH</p>
              </div>
            </div>
            
            <div className="mt-4 h-40 bg-gray-700/20 rounded-lg flex items-center justify-center">
              <p className="text-gray-400 text-sm">Revenue chart visualization will appear here</p>
            </div>
          </div>
          
          <div className="text-xs text-gray-400">
            <p>The analytics dashboard will provide comprehensive insights into your financial data, including revenue trends, fee distribution, and withdrawal history. This feature will be available in the next update.</p>
          </div>
        </div>
      )}
      
      {/* Quick Help Section */}
      {!hideEducationalInfo && (
        <div className="mt-4 bg-gray-700/20 rounded-md p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-200">Need Help?</p>
              <p className="text-xs text-gray-400 mt-1">
                This unified financial manager allows you to handle both fee structure management and revenue withdrawals in one place.
                Use the tabs above to switch between these functions. Each function requires specific role permissions.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SchoolFinanceManager;