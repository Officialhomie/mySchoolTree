import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import SystemContractsViewer, { SystemContractsData } from '../MSTReadfunction/AttendaceRead/AttendanceSystemViewer';
import GetProgramAttendance, { ProgramAttendanceData } from '../MSTReadfunction/AttendaceRead/GetProgramAttendance';
import RoleChecker, { RoleCheckerData, PREDEFINED_ROLES } from '../MSTReadfunction/AttendaceRead/hasRole';

// Define tabs for the interface
const TABS = [
  { name: 'System Overview', icon: 'dashboard' },
  { name: 'Attendance', icon: 'check' },
  { name: 'Roles & Permissions', icon: 'lock' }
];

const EducationalDashboard = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [systemData, setSystemData] = useState<SystemContractsData | null>(null);
  const [attendanceData, setAttendanceData] = useState<ProgramAttendanceData | null>(null);
  const [roleData, setRoleData] = useState<RoleCheckerData | null>(null);
  const [notifications, setNotifications] = useState<{message: string, type: 'success' | 'error' | 'info'}[]>([]);

  // Add notification helper
  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newNotification = { message, type };
    setNotifications(prev => [newNotification, ...prev]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== newNotification));
    }, 5000);
  }, []);

  // Handle system data change
  const handleSystemDataChange = useCallback((data: SystemContractsData) => {
    setSystemData(data);
    if (data.fetchStatus && data.fetchStatus !== '') {
      addNotification(data.fetchStatus, data.fetchStatus.includes('Error') ? 'error' : 'success');
    }
  }, [addNotification]);

  // Handle attendance data change
  const handleAttendanceDataChange = useCallback((data: ProgramAttendanceData) => {
    setAttendanceData(data);
    if (data.fetchStatus && data.fetchStatus !== '') {
      const type = data.fetchStatus.includes('Error') || data.fetchStatus.includes('Please enter') ? 'error' : 'success';
      addNotification(data.fetchStatus, type);
    }
  }, [addNotification]);

  // Handle role data change
  const handleRoleDataChange = useCallback((data: RoleCheckerData) => {
    setRoleData(data);
    const latestQuery = data.queryHistory[0];
    
    if (latestQuery) {
      const message = `${latestQuery.address} ${latestQuery.hasRole ? 'has' : 'does not have'} ${latestQuery.roleName}`;
      addNotification(message, latestQuery.hasRole ? 'success' : 'info');
    }
  }, [addNotification]);

  // Render the icon for each tab
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case 'check':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'lock':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Quick actions based on current context
  const QuickActions = () => {
    switch (selectedTab) {
      case 0: // System Overview
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => systemData?.fetchAllContracts()}
            disabled={systemData?.isAllLoading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md transition-colors shadow-lg disabled:opacity-50"
          >
            {systemData?.isAllLoading ? 'Loading...' : 'Refresh All Contracts'}
          </motion.button>
        );
      case 1: // Attendance
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => attendanceData?.fetchAttendance()}
            disabled={attendanceData?.isLoading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md transition-colors shadow-lg disabled:opacity-50"
          >
            {attendanceData?.isLoading ? 'Loading...' : 'Check Attendance'}
          </motion.button>
        );
      case 2: // Roles
        return roleData?.accountAddress ? (
          <div className="flex space-x-2">
            {Object.entries(PREDEFINED_ROLES).map(([name, value]) => (
              <motion.button
                key={name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => roleData.checkRole(value, roleData.accountAddress)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md transition-colors shadow-lg text-sm"
              >
                Check {name.split('_')[0].toLowerCase()}
              </motion.button>
            ))}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  // Notifications component
  const Notifications = () => {
    return (
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-md">
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            } flex items-center justify-between`}
          >
            <p>{notification.message}</p>
            <button 
              onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
              className="ml-3 text-white opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
              Educational Blockchain Dashboard
            </h1>
            <QuickActions />
          </div>
          
          <div className="mt-6 border-b border-gray-800">
            <div className="flex space-x-1">
              {TABS.map((tab, index) => (
                <button
                  key={tab.name}
                  className={`px-4 py-3 flex items-center space-x-2 ${
                    selectedTab === index
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  } transition-colors`}
                  onClick={() => setSelectedTab(index)}
                >
                  {renderIcon(tab.icon)}
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {selectedTab === 0 && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 text-blue-400">System Status</h2>
                  <p className="text-gray-300">
                    This dashboard provides a centralized interface for managing educational blockchain systems.
                    View contract statuses, check student attendance, and manage system roles.
                  </p>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-xl font-bold text-blue-400 mb-1">
                        {systemData?.contracts.filter(c => c.address).length || 0}/{systemData?.contracts.length || 0}
                      </div>
                      <div className="text-sm text-gray-400">Connected Contracts</div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-xl font-bold text-purple-400 mb-1">
                        {attendanceData?.hasAttended !== null ? 'Available' : 'Not Checked'}
                      </div>
                      <div className="text-sm text-gray-400">Attendance System</div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-xl font-bold text-green-400 mb-1">
                        {roleData?.queryHistory.length || 0}
                      </div>
                      <div className="text-sm text-gray-400">Role Checks Performed</div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <SystemContractsViewer onDataChange={handleSystemDataChange} />
            </div>
          )}

          {selectedTab === 1 && (
            <GetProgramAttendance onDataChange={handleAttendanceDataChange} />
          )}

          {selectedTab === 2 && (
            <RoleChecker onDataChange={handleRoleDataChange} />
          )}
        </main>

        {/* Notifications */}
        <Notifications />
      </div>
    </div>
  );
};

export default EducationalDashboard;