import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


// Import components and hooks
import CurrentProgramIdReader, { useCurrentProgramId } from '../MSTReadfunction/ProgramManagementRead/getProgramID';
import ProgramEnrollmentStatus, { EnrollmentData } from '../MSTReadfunction/ProgramManagementRead/ProgramEnrollmentStatus';
import ProgramStatusChecker, { ProgramStatusData } from '../MSTReadfunction/ProgramManagementRead/isProgramActive';


// Main types for the integrated dashboard
type ProgramManagementData = {
  programId: number;
  isActive: boolean | null;
  programInfo: string;
  enrollmentData: EnrollmentData | null;
  statusData: ProgramStatusData | null;
};

const ProgramManagementDashboard = () => {
  // State for the active program
  const [activeProgram, setActiveProgram] = useState<ProgramManagementData>({
    programId: 0,
    isActive: null,
    programInfo: '',
    enrollmentData: null,
    statusData: null,
  });
  
  // State for notifications
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>>([]);
  
  // Program history - track recently viewed programs
  const [programHistory, setProgramHistory] = useState<number[]>([]);
  
  // Tab state
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Custom hooks for program data
  const programIdData = useCurrentProgramId();
  
  // Add notification helper
  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [{ id, message, type }, ...prev]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);
  
  // Update active program when programId changes
  useEffect(() => {
    if (programIdData.isSuccess && programIdData.programIdNumber > 0) {
      setActiveProgram(prev => ({
        ...prev,
        programId: programIdData.programIdNumber,
        programInfo: programIdData.programInfo
      }));
      
      // Add to program history if not already there
      setProgramHistory(prev => {
        if (!prev.includes(programIdData.programIdNumber)) {
          return [programIdData.programIdNumber, ...prev.slice(0, 4)];
        }
        return prev;
      });
      
      addNotification(`Active program loaded: ${programIdData.programInfo}`, 'success');
    }
  }, [programIdData.isSuccess, programIdData.programIdNumber, programIdData.programInfo, addNotification]);
  
  // Handle program ID read from component
  const handleProgramIdRead = useCallback((programId: number) => {
    if (programId > 0) {
      setActiveProgram(prev => ({
        ...prev,
        programId,
      }));
    }
  }, []);
  
  // Handle status change
  const handleStatusChange = useCallback((programId: string, isActive: boolean) => {
    setActiveProgram(prev => ({
      ...prev,
      isActive,
    }));
    
    addNotification(
      `Program #${programId} status: ${isActive ? 'Active' : 'Inactive'}`,
      isActive ? 'success' : 'warning'
    );
  }, [addNotification]);
  
  // Handle enrollment data read
  const handleEnrollmentDataRead = useCallback((currentEnrollment: number, maxEnrollment: number, programId: number) => {
    const percentage = maxEnrollment > 0 ? Math.round((currentEnrollment / maxEnrollment) * 100) : 0;
    const data: EnrollmentData = {
      programId,
      currentEnrollment,
      maxEnrollment,
      enrollmentPercentage: percentage,
      availableSpots: Math.max(0, maxEnrollment - currentEnrollment),
      statusText: getEnrollmentStatusText(percentage),
      isFull: currentEnrollment >= maxEnrollment
    };
    
    setActiveProgram(prev => ({
      ...prev,
      enrollmentData: data,
    }));
    
    addNotification(`Enrollment data loaded: ${percentage}% full (${currentEnrollment}/${maxEnrollment})`, 'info');
  }, [addNotification]);
  
  // Helper to get enrollment status text
  const getEnrollmentStatusText = (percentage: number): string => {
    if (percentage >= 100) return 'Full';
    if (percentage >= 75) return 'Almost Full';
    if (percentage >= 25) return 'Filling Up';
    if (percentage > 0) return 'Open';
    return 'No Enrollment Data';
  };
  
  // Quick actions based on tab and context
  const QuickActions = () => {
    // Switch based on active tab
    switch (selectedTab) {
      case 0: // Overview
        return (
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => programIdData.refetch()}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md shadow-md transition-colors text-sm"
            >
              Refresh Program
            </motion.button>
          </div>
        );
      case 1: // Status
        return (
          <div className="flex space-x-2">
            {activeProgram.programId > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (document.getElementById('program-id-input')) {
                    (document.getElementById('program-id-input') as HTMLInputElement).value = 
                      activeProgram.programId.toString();
                  }
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md shadow-md transition-colors text-sm"
              >
                Use Current Program
              </motion.button>
            )}
          </div>
        );
      case 2: // Enrollment
        return null;
      default:
        return null;
    }
  };
  
  // Status indicators based on available data
  const StatusIndicators = () => {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div 
          className={`p-3 rounded-lg border ${
            activeProgram.programId > 0 
              ? 'bg-green-500/20 border-green-500/30' 
              : 'bg-gray-500/20 border-gray-500/30'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-sm font-medium mb-1">
            {activeProgram.programId > 0 
              ? 'Active Program' 
              : 'No Program'
            }
          </div>
          <div className={`text-lg font-bold ${
            activeProgram.programId > 0 ? 'text-green-400' : 'text-gray-400'
          }`}>
            {activeProgram.programId > 0 
              ? `Program #${activeProgram.programId}` 
              : 'Not Available'
            }
          </div>
        </motion.div>
        
        <motion.div 
          className={`p-3 rounded-lg border ${
            activeProgram.isActive === true 
              ? 'bg-green-500/20 border-green-500/30' 
              : activeProgram.isActive === false 
                ? 'bg-red-500/20 border-red-500/30'
                : 'bg-gray-500/20 border-gray-500/30'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="text-sm font-medium mb-1">Status</div>
          <div className={`text-lg font-bold ${
            activeProgram.isActive === true 
              ? 'text-green-400' 
              : activeProgram.isActive === false 
                ? 'text-red-400'
                : 'text-gray-400'
          }`}>
            {activeProgram.isActive === true 
              ? 'Active' 
              : activeProgram.isActive === false 
                ? 'Inactive'
                : 'Unknown'
            }
          </div>
        </motion.div>
        
        <motion.div 
          className={`p-3 rounded-lg border ${
            activeProgram.enrollmentData
              ? activeProgram.enrollmentData.isFull
                ? 'bg-red-500/20 border-red-500/30'
                : 'bg-blue-500/20 border-blue-500/30'
              : 'bg-gray-500/20 border-gray-500/30'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="text-sm font-medium mb-1">Enrollment</div>
          <div className={`text-lg font-bold ${
            activeProgram.enrollmentData
              ? activeProgram.enrollmentData.isFull
                ? 'text-red-400'
                : 'text-blue-400'
              : 'text-gray-400'
          }`}>
            {activeProgram.enrollmentData
              ? `${activeProgram.enrollmentData.enrollmentPercentage}% Full`
              : 'No Data'
            }
          </div>
        </motion.div>
      </div>
    );
  };
  
  // Program history component
  const ProgramHistoryComponent = () => {
    if (programHistory.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Programs</h3>
        <div className="flex flex-wrap gap-2">
          {programHistory.map(id => (
            <button
              key={id}
              onClick={() => handleProgramIdRead(id)}
              className={`py-1 px-3 rounded-full text-xs ${
                activeProgram.programId === id
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Program #{id}
            </button>
          ))}
        </div>
      </div>
    );
  };
  
  // Notifications component
  const NotificationsComponent = () => {
    return (
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-md">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`px-4 py-3 rounded-lg shadow-lg ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              } flex items-center justify-between`}
            >
              <p>{notification.message}</p>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="ml-3 text-white opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  // Render function for each tab
  const renderTabContent = (tabIndex: number) => {
    switch (tabIndex) {
      case 0: // Overview Tab
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CurrentProgramIdReader onProgramIdRead={handleProgramIdRead} />
              
              {activeProgram.programId > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                >
                  <h3 className="text-lg font-medium text-blue-400 mb-2">
                    Program Summary
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-700/30 rounded-md p-3">
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-gray-400">Program ID:</div>
                        <div className="text-gray-200">{activeProgram.programId}</div>
                        
                        <div className="text-gray-400">Status:</div>
                        <div className={activeProgram.isActive === true ? 'text-green-400' : 
                                          activeProgram.isActive === false ? 'text-red-400' : 'text-gray-400'}>
                          {activeProgram.isActive === true ? 'Active' : 
                            activeProgram.isActive === false ? 'Inactive' : 'Unknown'}
                        </div>
                        
                        <div className="text-gray-400">Enrollment:</div>
                        <div className="text-gray-200">
                          {activeProgram.enrollmentData 
                            ? `${activeProgram.enrollmentData.currentEnrollment}/${activeProgram.enrollmentData.maxEnrollment}`
                            : 'Unknown'}
                        </div>
                        
                        <div className="text-gray-400">Availability:</div>
                        <div className="text-gray-200">
                          {activeProgram.enrollmentData 
                            ? activeProgram.enrollmentData.isFull 
                              ? 'No available spots' 
                              : `${activeProgram.enrollmentData.availableSpots} spots available`
                            : 'Unknown'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setSelectedTab(1)}
                        className="text-xs py-1 px-3 bg-blue-600/30 hover:bg-blue-600/40 text-blue-400 rounded"
                      >
                        Check Status
                      </button>
                      <button 
                        onClick={() => setSelectedTab(2)}
                        className="text-xs py-1 px-3 bg-purple-600/30 hover:bg-purple-600/40 text-purple-400 rounded"
                      >
                        View Enrollment
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Enhanced visualization */}
            {activeProgram.enrollmentData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
              >
                <h3 className="text-lg font-medium text-blue-400 mb-4">
                  Enrollment Visualization
                </h3>
                
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-400 bg-blue-200/10">
                        {activeProgram.enrollmentData.statusText}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-400">
                        {activeProgram.enrollmentData.enrollmentPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-700">
                    <motion.div 
                      style={{ width: `${activeProgram.enrollmentData.enrollmentPercentage}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${activeProgram.enrollmentData.enrollmentPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        activeProgram.enrollmentData.enrollmentPercentage >= 90 ? 'bg-red-500' :
                        activeProgram.enrollmentData.enrollmentPercentage >= 70 ? 'bg-orange-500' :
                        activeProgram.enrollmentData.enrollmentPercentage >= 50 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                    ></motion.div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  <div className="bg-gray-700/30 rounded-md p-3">
                    <div className="text-2xl font-bold text-blue-400">
                      {activeProgram.enrollmentData.currentEnrollment}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Current Enrollment</div>
                  </div>
                  
                  <div className="bg-gray-700/30 rounded-md p-3">
                    <div className="text-2xl font-bold text-purple-400">
                      {activeProgram.enrollmentData.maxEnrollment}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Maximum Capacity</div>
                  </div>
                  
                  <div className="bg-gray-700/30 rounded-md p-3">
                    <div className="text-2xl font-bold text-green-400">
                      {activeProgram.enrollmentData.availableSpots}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Available Spots</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );
        
      case 1: // Status Tab
        return <ProgramStatusChecker onStatusChange={handleStatusChange} />;
        
      case 2: // Enrollment Tab
        return (
          <ProgramEnrollmentStatus 
            initialProgramId={activeProgram.programId} 
            onEnrollmentDataRead={handleEnrollmentDataRead}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
              Program Management
            </h1>
            <QuickActions />
          </div>
          
          {/* Status Indicators */}
          <StatusIndicators />
          
          {/* Program History */}
          <ProgramHistoryComponent />
          
          {/* Tabs */}
          <div className="border-b border-gray-800">
            <div className="flex space-x-1">
              {['Overview', 'Program Status', 'Enrollment'].map((tabName, index) => (
                <button
                  key={tabName}
                  className={`px-4 py-3 flex items-center space-x-2 ${
                    selectedTab === index
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  } transition-colors`}
                  onClick={() => setSelectedTab(index)}
                >
                  <span>{tabName}</span>
                </button>
              ))}
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent(selectedTab)}
            </motion.div>
          </AnimatePresence>
        </main>
        
        {/* Notifications */}
        <NotificationsComponent />
      </div>
    </div>
  );
};

export default ProgramManagementDashboard;