import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';

// Import components from SchoolAdmin files
import { ProgramStatusBadge, EnrollmentProgressBar } from './SchoolAdminOne';
import { useFinancialData } from './SchoolAdminTwo';
import { useProgramManagement, ComponentMode } from './SchoolAdminThree';
import SchoolFinanceManager from './SchoolAdminFour';
import { useStudentRegistration } from './SchoolAdminFive';
import { useStudentManagement } from './SchoolAdminSix';
import { FinancialManagementDashboard } from './SchoolAdminSeven';

// Import components from MSTReadfunction files
import GetOrganizationDetails, { useOrganizationDetails } from '../MSTReadfunction/SMFRead/GetOrganizationDetails';
import { useSchoolBalance } from '../MSTReadfunction/TuitionSystemRead/getSchoolBalance';
import { useAdminRoleCheck } from '../MSTReadfunction/RoleManagementRead/hasAdminRole';
import SystemAddresses from '../MSTReadfunction/SMBReadFunctions/ViewSystemsAddress';

// Dashboard page component
const SchoolAdministratorDashboardPage = () => {
  // State for dashboard loading and refresh
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingRole, setIsCheckingRole] = useState<boolean>(false);
  const [defaultProgramMode, setDefaultProgramMode] = useState<ComponentMode>('create');
  
  // WAGMI account hook
  const { address: connectedAddress, isConnected } = useAccount();

  // Hooks to access data from various components
  const { data: organizationData, refreshDetails } = useOrganizationDetails('', true);
  const { data: balanceData, refreshBalance } = useSchoolBalance();
  const { data: financialData } = useFinancialData();
  
  // Custom hooks from imported components
  const { data: roleData, checkRole } = useAdminRoleCheck();
  const { ProgramManagementComponent } = useProgramManagement();
  const { StudentRegistrationComponent } = useStudentRegistration();
  const { StudentManagementComponent } = useStudentManagement();

  // Enhanced role check function
  const checkAdminRole = useCallback(async (address: string) => {
    if (!address || isCheckingRole) return;
    
    setIsCheckingRole(true);
    try {
      await checkRole(address);
    } finally {
      setIsCheckingRole(false);
    }
  }, [checkRole, isCheckingRole]);
  
  // Effect to update has admin role when role data changes
  useEffect(() => {
    if (roleData && roleData.hasAdminRole !== null) {
      setIsAdmin(roleData.hasAdminRole);
    }
  }, [roleData]);

  // Effect to simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Effect to check admin role when address is connected
  useEffect(() => {
    if (isConnected && connectedAddress && !isAdmin && !isCheckingRole) {
      // Only check if we haven't determined the role yet
      checkAdminRole(connectedAddress);
    }
  }, [isConnected, connectedAddress, isAdmin, checkAdminRole, isCheckingRole]);

  // Function to handle dashboard refresh
  const handleRefreshDashboard = () => {
    setIsLoading(true);
    refreshDetails();
    refreshBalance();
    
    // Re-check admin role if wallet is connected and not currently checking
    if (isConnected && connectedAddress && !isCheckingRole) {
      checkAdminRole(connectedAddress);
    }
    
    // Simulate loading delay
    setTimeout(() => {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }, 1500);
  };

  // Format time since last refresh
  const getTimeSinceLastRefresh = () => {
    if (!lastRefreshed) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastRefreshed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-purple-900 py-6 shadow-xl">
        <div className="container mx-auto px-4">
          {/* Header Section with Timestamp */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold text-white">School Administrator Dashboard</h1>
              <div className="flex items-center">
                {isAdmin && (
                  <button 
                    onClick={handleRefreshDashboard} 
                    disabled={isCheckingRole || isLoading}
                    className={`mr-3 p-1.5 rounded-full ${isLoading || isCheckingRole ? 'bg-gray-700 text-gray-500' : 'bg-green-800/30 text-green-500 hover:bg-green-800/50'} transition-colors`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                <div className="text-sm text-gray-400">
                  Last Updated: {new Date(lastRefreshed || 0).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Connection Status */}
          {isConnected ? (
            <div className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs">
                  Connected
                </span>
                <span className="text-xs text-gray-400">
                  {connectedAddress ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : 'Unknown'}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/30 rounded-md p-6 text-center">
              <p className="text-gray-300 mb-3">Please connect your wallet to verify admin access.</p>
              <div className="bg-blue-500/20 text-blue-400 inline-block px-4 py-2 rounded-md">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Connect Wallet
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap mb-8 border-b border-gray-700 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 mr-2 ${activeTab === 'overview' 
              ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('programs')}
            className={`px-4 py-2 mr-2 ${activeTab === 'programs' 
              ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400' 
              : 'text-gray-400 hover:text-gray-300'}`}
          >
            Program Management
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 mr-2 ${activeTab === 'students' 
              ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-400' 
              : 'text-gray-400 hover:text-gray-300'}`}
          >
            Student Management
          </button>
          <button 
            onClick={() => setActiveTab('finances')}
            className={`px-4 py-2 mr-2 ${activeTab === 'finances' 
              ? 'bg-yellow-500/20 text-yellow-400 border-b-2 border-yellow-400' 
              : 'text-gray-400 hover:text-gray-300'}`}
          >
            Financial Management
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 ${activeTab === 'system' 
              ? 'bg-red-500/20 text-red-400 border-b-2 border-red-400' 
              : 'text-gray-400 hover:text-gray-300'}`}
          >
            System Configuration
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Dashboard Overview
                </h2>
                
                <div className="flex items-center">
                  {lastRefreshed && (
                    <span className="text-xs text-gray-400 mr-3 hidden md:inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Last updated: {getTimeSinceLastRefresh()}
                    </span>
                  )}
                  
                  <button 
                    onClick={handleRefreshDashboard}
                    disabled={isLoading}
                    className="flex items-center space-x-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-blue-400 border-r-blue-400 border-b-blue-400 border-l-transparent rounded-full animate-spin mr-1"></div>
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span>Refresh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Organization Status */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 mb-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Organization Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {organizationData ? (
                    <>
                      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-gray-400 mb-1">Subscription Status</p>
                        <div className={`font-semibold ${
                          organizationData.subscriptionStatus === 'Active' ? 'text-green-400' : 
                          (organizationData.subscriptionStatus === 'Grace Period' ? 'text-yellow-400' : 'text-red-400')
                        }`}>
                          {organizationData.subscriptionStatus}
                        </div>
                      </div>
                      
                      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                        <div className="text-white">
                          {organizationData.timeRemaining.days} days, {organizationData.timeRemaining.hours} hours
                        </div>
                      </div>
                      
                      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                        <div className="font-mono text-xs text-gray-300 truncate">
                          {organizationData.address || 'Not available'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-3 bg-gray-700/30 rounded-lg p-6 border border-gray-600 flex justify-center">
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 border-2 border-t-blue-400 border-r-blue-400 border-b-blue-400 border-l-transparent rounded-full animate-spin mr-3"></div>
                          <span className="text-gray-400">Loading organization data...</span>
                        </div>
                      ) : (
                        <p className="text-gray-400">Organization data not available</p>
                      )}
                    </div>
                  )}
                </div>
                
                {organizationData && organizationData.subscriptionStatus === 'Active' && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">Subscription Progress</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${organizationData.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Overview Cards */}
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg flex flex-col items-center justify-center h-24">
                      <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
                      <span className="text-xs text-gray-400 mt-2">Loading data...</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-400">Active Programs</p>
                        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {organizationData?.details ? organizationData.details.isActive ? '5' : '0' : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {organizationData?.lastFetched ? `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 'Not yet fetched'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-400">Total Students</p>
                        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-purple-400'}`}></div>
                      </div>
                      <div className="text-2xl font-bold text-purple-400">
                        {organizationData?.details ? organizationData.details.isActive ? '24' : '0' : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {organizationData?.lastFetched ? `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 'Not yet fetched'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-400">Pending Registrations</p>
                        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-yellow-400'}`}></div>
                      </div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {organizationData?.details ? organizationData.details.isActive ? '3' : '0' : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {organizationData?.lastFetched ? `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 'Not yet fetched'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-400">This Month's Revenue</p>
                        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {balanceData?.balance ? `${Number(balanceData.balance.formatted).toFixed(2)} ETH` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {balanceData?.lastChecked ? `Last updated: ${new Date(balanceData.lastChecked).toLocaleTimeString()}` : 'Not yet fetched'}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* School Balance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 text-teal-400">School Balance</h3>
                  
                  {balanceData ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="text-3xl font-bold text-teal-400 mb-3">
                        {balanceData.balance.formatted} ETH
                      </div>
                      
                      <div className="w-full flex justify-center mb-4">
                        <div className={`py-1 px-3 rounded-full text-xs font-medium ${
                          balanceData.balance.hasFunds
                            ? 'bg-green-900/20 text-green-400'
                            : 'bg-yellow-900/20 text-yellow-400'
                        }`}>
                          {balanceData.balance.hasFunds
                            ? 'Funds Available' 
                            : 'No Funds Available'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-400">
                          This is the current balance allocated to your school in the system
                        </p>
                        {balanceData.lastChecked && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last checked: {new Date(balanceData.lastChecked).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center py-8">
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 border-2 border-t-teal-400 border-r-teal-400 border-b-teal-400 border-l-transparent rounded-full animate-spin mr-3"></div>
                          <span className="text-gray-400">Loading balance data...</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => refreshBalance()}
                          className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 px-4 py-2 rounded-md transition-colors"
                        >
                          Check School Balance
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 text-purple-400">Attendance Rate</h3>
                  
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative w-32 h-32 mb-4">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle 
                          className="text-gray-700" 
                          strokeWidth="10" 
                          stroke="currentColor" 
                          fill="transparent" 
                          r="40" 
                          cx="50" 
                          cy="50" 
                        />
                        <circle 
                          className="text-purple-500" 
                          strokeWidth="10" 
                          stroke="currentColor" 
                          fill="transparent" 
                          r="40" 
                          cx="50" 
                          cy="50" 
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - (organizationData?.details ? 87 : 0) / 100)}`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                        <text 
                          x="50" 
                          y="50" 
                          className="text-2xl" 
                          dominantBaseline="middle" 
                          textAnchor="middle"
                          fill="white"
                        >
                          {organizationData?.details ? '87' : '0'}%
                        </text>
                      </svg>
                    </div>
                    
                    <p className="text-sm text-gray-400 text-center">
                      Average attendance rate across all programs
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Quick Actions</h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <button
                    onClick={() => setActiveTab('programs')}
                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-4 rounded-lg flex flex-col items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm">Create Program</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('students')}
                    className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 p-4 rounded-lg flex flex-col items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="text-sm">Register Student</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('finances')}
                    className="bg-green-500/10 hover:bg-green-500/20 text-green-400 p-4 rounded-lg flex flex-col items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Manage Fees</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('students')}
                    className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 p-4 rounded-lg flex flex-col items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Take Attendance</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('finances')}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-4 rounded-lg flex flex-col items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm">Withdraw Funds</span>
                  </button>
                </div>
              </div>
              
              {/* Admin Access Check */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Administrator Access</h3>
                
                {isConnected ? (
                  <div>
                    <div className="bg-gray-700/30 rounded-md p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Connected Address:</span>
                        <span className="text-sm font-mono text-gray-300">
                          {connectedAddress ? 
                            `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : 
                            'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/30 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Admin Status:</span>
                        {isCheckingRole ? (
                          <span className="bg-gray-600/50 text-gray-400 px-2 py-1 rounded-full text-xs">
                            <div className="flex items-center">
                              <div className="w-3 h-3 border-2 border-t-gray-400 border-r-gray-400 border-b-gray-400 border-l-transparent rounded-full animate-spin mr-1"></div>
                              Checking...
                            </div>
                          </span>
                        ) : isAdmin === null ? (
                          <span className="bg-gray-600/50 text-gray-400 px-2 py-1 rounded-full text-xs">
                            Not Checked
                          </span>
                        ) : isAdmin ? (
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                            Admin Access
                          </span>
                        ) : (
                          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs">
                            Limited Access
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700/30 rounded-md p-6 text-center">
                    <p className="text-gray-300 mb-3">Please connect your wallet to verify admin access.</p>
                    <div className="bg-blue-500/20 text-blue-400 inline-block px-4 py-2 rounded-md">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        Connect Wallet
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Programs Management Tab */}
          {activeTab === 'programs' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent">
                  Program Management
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Program Management Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-400">Programs Overview</h3>
                    
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <div className="w-6 h-6 border-2 border-t-green-400 border-green-200/30 rounded-full animate-spin mr-3"></div>
                          <span className="text-gray-400">Loading program data...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Programs:</span>
                            <span className="text-white font-semibold">
                              {organizationData?.details ? organizationData.details.isActive ? '5' : '0' : 'N/A'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Active Programs:</span>
                            <div className="flex items-center">
                              <span className="text-white font-semibold mr-2">
                                {organizationData?.details ? organizationData.details.isActive ? '3' : '0' : 'N/A'}
                              </span>
                              <ProgramStatusBadge isActive={true} />
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Inactive Programs:</span>
                            <div className="flex items-center">
                              <span className="text-white font-semibold mr-2">
                                {organizationData?.details ? organizationData.details.isActive ? '2' : '0' : 'N/A'}
                              </span>
                              <ProgramStatusBadge isActive={false} />
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-700">
                            <p className="text-sm text-gray-400 mb-2">Average Enrollment</p>
                            <EnrollmentProgressBar enrollmentPercentage={
                              organizationData?.details ? organizationData.details.isActive ? 75 : 0 : 0
                            } />
                            <div className="text-xs text-gray-500 text-right mt-1">
                              {organizationData?.lastFetched ? 
                                `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 
                                'Not yet fetched'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-green-400">Quick Program Actions</h3>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          setDefaultProgramMode('create' as ComponentMode);
                          setActiveTab('programs');
                        }}
                        disabled={isLoading || !organizationData?.details?.isActive}
                        className={`w-full py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
                          organizationData?.details?.isActive 
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                        } ${isLoading ? 'opacity-50' : ''}`}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-t-green-400 border-green-200/30 rounded-full animate-spin mr-2"></div>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        )}
                        Create New Program
                      </button>
                      
                      <button 
                        onClick={() => {
                          setDefaultProgramMode('view' as ComponentMode);
                          setActiveTab('programs');
                        }}
                        disabled={isLoading || !organizationData?.details?.isActive}
                        className={`w-full py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
                          organizationData?.details?.isActive 
                            ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' 
                            : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                        } ${isLoading ? 'opacity-50' : ''}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                          <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                        </svg>
                        View Program Data
                      </button>
                      
                      <button 
                        onClick={() => {
                          setDefaultProgramMode('update' as ComponentMode);
                          setActiveTab('programs');
                        }}
                        disabled={isLoading || !organizationData?.details?.isActive}
                        className={`w-full py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
                          organizationData?.details?.isActive 
                            ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400' 
                            : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                        } ${isLoading ? 'opacity-50' : ''}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Update Program Details
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Program Management Main Content */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg lg:col-span-2">
                    <div className="p-5">
                      <h3 className="text-lg font-semibold mb-4 text-green-400">Program Management Console</h3>
                      
                      {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="w-8 h-8 border-4 border-t-green-400 border-green-200/30 rounded-full animate-spin mr-3"></div>
                          <span className="text-gray-300">Loading program management...</span>
                        </div>
                      ) : !organizationData?.details?.isActive ? (
                        <div className="bg-red-900/20 text-red-400 p-4 rounded-md">
                          <p>Organization is not active. Please activate your organization to manage programs.</p>
                        </div>
                      ) : (
                        <ProgramManagementComponent 
                          defaultMode={defaultProgramMode}
                          hideRoleChecker={true}
                          onDataChange={(data) => {
                            console.log('Program data updated:', data);
                            if (data.status.isSuccess) {
                              handleRefreshDashboard();
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Student Management Tab */}
          {activeTab === 'students' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Student Management
                </h2>
              </div>
              
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Student Management Cards */}
                  {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg flex flex-col items-center justify-center h-24">
                        <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
                        <span className="text-xs text-gray-400 mt-2">Loading data...</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg" onClick={() => refreshBalance()}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-400">Total Students</p>
                          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-purple-400'}`}></div>
                        </div>
                        <div className="text-2xl font-bold text-purple-400">
                          {organizationData?.details ? organizationData.details.isActive ? '24' : '0' : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {organizationData?.lastFetched ? `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 'Not yet fetched'}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg" onClick={() => refreshBalance()}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-400">Active Students</p>
                          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {organizationData?.details ? organizationData.details.isActive ? '22' : '0' : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {organizationData?.lastFetched ? `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 'Not yet fetched'}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg" onClick={() => refreshBalance()}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-400">Inactive Students</p>
                          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                        </div>
                        <div className="text-2xl font-bold text-red-400">
                          {organizationData?.details ? organizationData.details.isActive ? '2' : '0' : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {organizationData?.lastFetched ? `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 'Not yet fetched'}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg" onClick={() => refreshBalance()}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-400">Recent Registrations</p>
                          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                        </div>
                        <div className="text-2xl font-bold text-blue-400">
                          {organizationData?.details ? organizationData.details.isActive ? '4' : '0' : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {organizationData?.lastFetched ? `Last updated: ${new Date(organizationData.lastFetched).toLocaleTimeString()}` : 'Not yet fetched'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Student Registration Section */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-4 text-purple-400">Student Registration</h3>
                    
                    <div className="bg-gray-700/30 rounded-md p-4 mb-4">
                      <p className="text-sm text-gray-300">
                        Register new students to the system. You can add students individually or in batch.
                      </p>
                    </div>
                    
                    <StudentRegistrationComponent 
                      defaultMode="single"
                      availablePrograms={[
                        { id: 1, name: "Computer Science" },
                        { id: 2, name: "Data Science" },
                        { id: 3, name: "Blockchain Development" },
                        { id: 4, name: "Web3 Fundamentals" },
                        { id: 5, name: "Smart Contract Engineering" },
                      ]}
                      hideModeSwitcher={false}
                      maxBatchSize={20}
                    />
                  </div>
                </div>
                
                {/* Student Management Section */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-4 text-purple-400">Student Administration</h3>
                    
                    <div className="bg-gray-700/30 rounded-md p-4 mb-4">
                      <p className="text-sm text-gray-300">
                        Manage existing students. Activate schools, deactivate students, or transfer students between schools.
                      </p>
                    </div>
                    
                    <StudentManagementComponent
                      defaultMode="activate-school"
                      hideRoleChecker={true}
                      showAllTabs={true}
                    />
                  </div>
                </div>
              </div>
              
              {/* Student List Preview */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-purple-400">Recent Students</h3>
                  
                  <button className="text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded-md transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 10-1.414 1.414L13.586 15H11a1 1 0 100 2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    View All
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-700/30">
                        <th className="px-4 py-2 text-left text-xs text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-400 uppercase tracking-wider">Address</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-400 uppercase tracking-wider">Program</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {[
                        { id: 1, name: "Alice Johnson", address: "0x1234...5678", program: "Computer Science", isActive: true },
                        { id: 2, name: "Bob Smith", address: "0x8765...4321", program: "Data Science", isActive: true },
                        { id: 3, name: "Charlie Brown", address: "0xabcd...efgh", program: "Blockchain Development", isActive: false },
                        { id: 4, name: "Diana Prince", address: "0x9876...5432", program: "Smart Contract Engineering", isActive: true },
                        { id: 5, name: "Ethan Hunt", address: "0xijkl...mnop", program: "Web3 Fundamentals", isActive: true },
                      ].map((student) => (
                        <tr key={student.id} className="hover:bg-gray-700/20">
                          <td className="px-4 py-2 text-sm text-white">{student.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-300 font-mono">{student.address}</td>
                          <td className="px-4 py-2 text-sm text-gray-300">{student.program}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              student.isActive 
                                ? 'bg-green-900/20 text-green-400' 
                                : 'bg-red-900/20 text-red-400'
                            }`}>
                              {student.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div className="flex space-x-2">
                              <button className="p-1 text-blue-400 hover:text-blue-300" title="View">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button className="p-1 text-yellow-400 hover:text-yellow-300" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button className="p-1 text-purple-400 hover:text-purple-300" title="Transfer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Financial Management Tab */}
          {activeTab === 'finances' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Financial Management
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Financial Overview */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-yellow-400">Financial Overview</h3>
                    
                    <div className="space-y-4">
                      {balanceData ? (
                        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                          <p className="text-sm text-gray-400 mb-1">School Balance</p>
                          <div className="text-2xl font-bold text-yellow-400">
                            {balanceData.balance.formatted} ETH
                          </div>
                          <div className="mt-2">
                            <div className={`inline-block py-1 px-2 rounded-full text-xs ${
                              balanceData.balance.hasFunds
                                ? 'bg-green-900/20 text-green-400'
                                : 'bg-red-900/20 text-red-400'
                            }`}>
                              {balanceData.balance.hasFunds ? 'Funds Available' : 'No Funds Available'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600 flex justify-center">
                          <button 
                            onClick={() => refreshBalance()}
                            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded transition-colors"
                          >
                            Check Balance
                          </button>
                        </div>
                      )}
                      
                      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-gray-400 mb-1">Revenue This Month</p>
                        {financialData?.revenueTracking ? (
                          <>
                            <div className="text-lg font-semibold text-green-400">
                              {financialData.revenueTracking.totalRevenue.formatted || 
                                (balanceData?.balance ? `${Number(balanceData.balance.formatted).toFixed(2)} ETH` : '0 ETH')}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {financialData.revenueTracking.lastWithdrawalTime.timeAgo || 'No withdrawals yet'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-semibold text-green-400">
                              {balanceData?.balance ? `${Number(balanceData.balance.formatted).toFixed(2)} ETH` : '0 ETH'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Last updated: {balanceData?.lastChecked ? new Date(balanceData.lastChecked).toLocaleTimeString() : 'N/A'}
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-gray-400 mb-1">Pending Transactions</p>
                        {isLoading ? (
                          <div className="flex items-center justify-center py-2">
                            <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
                            <span className="text-sm text-gray-400">Loading...</span>
                          </div>
                        ) : (
                          <>
                            <div className="text-lg font-semibold text-blue-400">
                              {organizationData?.details?.isActive ? '2' : '0'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {organizationData?.details?.isActive ?
                                `Total value: ${financialData?.programRevenue?.formatted || 
                                  (balanceData?.balance.raw ? `${(Number(balanceData.balance.formatted) * 0.3).toFixed(2)} ETH` : '0 ETH')}`
                                : 'No pending transactions'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-yellow-400">Quick Actions</h3>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={() => balanceData?.balance.hasFunds ? refreshBalance() : null}
                        disabled={isLoading || !balanceData?.balance.hasFunds} 
                        className={`w-full py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
                          balanceData?.balance.hasFunds
                            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                        } ${isLoading ? 'opacity-50' : ''}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                        </svg>
                        {isLoading ? 'Loading...' : `Withdraw Funds${balanceData?.balance ? ` (${balanceData.balance.formatted} ETH)` : ''}`}
                      </button>
                      
                      <button 
                        onClick={() => financialData ? handleRefreshDashboard() : null}
                        disabled={isLoading}
                        className={`w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-4 rounded-md transition-colors flex items-center justify-center ${isLoading ? 'opacity-50' : ''}`}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin mr-2"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-14a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        )}
                        Transaction History
                      </button>
                      
                      <button 
                        onClick={() => organizationData?.details?.isActive ? handleRefreshDashboard() : null}
                        disabled={isLoading || !organizationData?.details?.isActive}
                        className={`w-full py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
                          organizationData?.details?.isActive 
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                        } ${isLoading ? 'opacity-50' : ''}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                        </svg>
                        {isLoading ? 'Loading...' : 'Financial Reports'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Financial Management Main Content */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg mb-6">
                    <div className="p-5">
                      <h3 className="text-lg font-semibold mb-4 text-yellow-400">Fee Management</h3>
                      
                      <FinancialManagementDashboard 
                        onFinancialActionComplete={(actionType, txHash) => {
                          console.log(`${actionType} completed with hash: ${txHash}`);
                          // Refresh data after action completes
                          refreshBalance();
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
                    <div className="p-5">
                      <h3 className="text-lg font-semibold mb-4 text-yellow-400">School Finance Manager</h3>
                      
                      <SchoolFinanceManager 
                        defaultTab="fees"
                        hideEducationalInfo={true}
                        onFeeUpdateComplete={(txHash) => {
                          console.log(`Fee update completed with hash: ${txHash}`);
                          // Refresh data after fee update
                          refreshBalance();
                        }}
                        onWithdrawComplete={(txHash, amount) => {
                          console.log(`Withdrawal of ${amount} completed with hash: ${txHash}`);
                          // Refresh balance after withdrawal
                          refreshBalance();
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Financial Dashboard */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg mb-6">
                <h3 className="text-lg font-semibold mb-4 text-yellow-400">Financial Dashboard</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg flex flex-col items-center justify-center h-24">
                        <div className="w-6 h-6 border-2 border-t-blue-400 border-blue-200/30 rounded-full animate-spin"></div>
                        <span className="text-xs text-gray-400 mt-2">Loading data...</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-400">Total Revenue</p>
                          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {financialData?.revenueTracking?.totalRevenue.formatted || 
                            (balanceData?.balance ? `${Number(balanceData.balance.formatted).toFixed(2)} ETH` : '0 ETH')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {financialData?.lastChecked?.revenueTracking ? 
                            `Last updated: ${new Date(financialData.lastChecked.revenueTracking).toLocaleTimeString()}` : 
                            (balanceData?.lastChecked ? `Last checked: ${new Date(balanceData.lastChecked).toLocaleTimeString()}` : 'Not yet fetched')}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-400">Platform Share</p>
                          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                        </div>
                        <div className="text-2xl font-bold text-blue-400">
                          {financialData?.revenueTracking?.platformShare.formatted || 
                            (balanceData?.balance ? `${(Number(balanceData.balance.formatted) * 0.2).toFixed(2)} ETH` : '0 ETH')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {financialData?.lastChecked?.revenueTracking ? 
                            `Last updated: ${new Date(financialData.lastChecked.revenueTracking).toLocaleTimeString()}` : 
                            (balanceData?.lastChecked ? `Platform fee: 20%` : 'Not yet fetched')}
                        </div>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-400">School Share</p>
                          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-purple-400'}`}></div>
                        </div>
                        <div className="text-2xl font-bold text-purple-400">
                          {financialData?.revenueTracking?.schoolShare.formatted || 
                            (balanceData?.balance ? `${(Number(balanceData.balance.formatted) * 0.8).toFixed(2)} ETH` : '0 ETH')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {financialData?.lastChecked?.revenueTracking ? 
                            `Last updated: ${new Date(financialData.lastChecked.revenueTracking).toLocaleTimeString()}` : 
                            (balanceData?.lastChecked ? `School share: 80%` : 'Not yet fetched')}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="bg-gray-700/30 rounded-md p-4 mb-4">
                  <p className="text-sm text-gray-300">
                    View your financial data, manage fees, and monitor your institution's revenue.
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={() => console.log("Refresh financial data")}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-4 py-2 rounded-md transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Load Financial Data
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* System Configuration Tab */}
          {activeTab === 'system' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
                  System Configuration
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Organization Details */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 text-red-400">Organization Details</h3>
                  
                  {organizationData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                          <p className="text-sm text-gray-400 mb-1">Subscription Status</p>
                          <div className={`font-semibold ${
                            organizationData.subscriptionStatus === 'Active' ? 'text-green-400' : 
                            (organizationData.subscriptionStatus === 'Grace Period' ? 'text-yellow-400' : 'text-red-400')
                          }`}>
                            {organizationData.subscriptionStatus}
                          </div>
                        </div>
                        
                        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                          <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                          <div className="text-white">
                            {organizationData.timeRemaining.days} days, {organizationData.timeRemaining.hours} hours
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                        <div className="font-mono text-sm text-gray-300 break-all">
                          {organizationData.address || 'Not available'}
                        </div>
                      </div>
                      
                      {organizationData.lastFetched && (
                        <div className="text-xs text-gray-400 flex items-center justify-end">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Last checked: {new Date(organizationData.lastFetched).toLocaleString()}
                        </div>
                      )}
                      
                      {organizationData.subscriptionStatus === 'Active' && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-2">Subscription Progress</p>
                          <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div 
                              className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{ width: `${organizationData.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => refreshDetails()}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-md transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          Refresh Organization Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 border-2 border-t-red-400 border-r-red-400 border-b-red-400 border-l-transparent rounded-full animate-spin mr-3"></div>
                          <span className="text-gray-400">Loading organization details...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-400">Organization details not available</p>
                          <GetOrganizationDetails 
                            autoFetch={true}
                            onRefresh={() => {
                              console.log("Organization details refreshed");
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* System Addresses */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 text-red-400">System Addresses</h3>
                  
                  <SystemAddresses 
                    autoFetch={true}
                    hideVerifyLinks={false}
                    onRefresh={() => {
                      console.log("System addresses refreshed");
                    }}
                  />
                </div>
              </div>
              
              {/* Role Management */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg mb-6">
                <h3 className="text-lg font-semibold mb-4 text-red-400">Role Management</h3>
                
                <div className="bg-gray-700/30 rounded-md p-4 mb-4">
                  <p className="text-sm text-gray-300">
                    Check and verify administrative roles for users in the system. Admin privileges are required for certain operations.
                  </p>
                </div>
                
                {isConnected ? (
                  <div>
                    <div className="bg-gray-700/30 rounded-md p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Connected Address:</span>
                        <span className="text-sm font-mono text-gray-300">
                          {connectedAddress ? 
                            `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : 
                            'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/30 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Admin Status:</span>
                        {isCheckingRole ? (
                          <span className="bg-gray-600/50 text-gray-400 px-2 py-1 rounded-full text-xs">
                            <div className="flex items-center">
                              <div className="w-3 h-3 border-2 border-t-gray-400 border-r-gray-400 border-b-gray-400 border-l-transparent rounded-full animate-spin mr-1"></div>
                              Checking...
                            </div>
                          </span>
                        ) : isAdmin === null ? (
                          <span className="bg-gray-600/50 text-gray-400 px-2 py-1 rounded-full text-xs">
                            Not Checked
                          </span>
                        ) : isAdmin ? (
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                            Admin Access
                          </span>
                        ) : (
                          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs">
                            Limited Access
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700/30 rounded-md p-6 text-center">
                    <p className="text-gray-300 mb-3">Please connect your wallet to verify admin access.</p>
                    <div className="bg-blue-500/20 text-blue-400 inline-block px-4 py-2 rounded-md">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        Connect Wallet
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* System Status */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-red-400">System Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">Network Status</p>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
                        <span className="text-xs text-green-400">Online</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Last checked: Just now</p>
                  </div>
                  
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">Smart Contracts</p>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
                        <span className="text-xs text-green-400">Operational</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">3 contracts verified</p>
                  </div>
                  
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">System Paused</p>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-400 mr-1"></div>
                        <span className="text-xs text-red-400">No</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Normal operations</p>
                  </div>
                  
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">Transaction Pool</p>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></div>
                        <span className="text-xs text-yellow-400">3 Pending</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Average confirmation: 2 min</p>
                  </div>
                </div>
                
                <div className="flex justify-center mt-6 space-x-4">
                  <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-md transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Emergency Pause
                  </button>
                  
                  <button className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-md transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    System Check
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      
        {/* Footer information */}
        <footer className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>School Administration Dashboard © {new Date().getFullYear()}</p>
          <p className="mt-1">Blockchain-Based School Management System</p>
        </footer>
      </main>
    </div>
  );
};

export default SchoolAdministratorDashboardPage;
