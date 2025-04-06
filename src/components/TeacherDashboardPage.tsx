import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';

// Import dashboard components from the provided files
import EducationalDashboard from './TeacherMakeUp';
import StudentManagementDashboard from './TeacherMakeUpThree';
import ProgramManagementDashboard from './TeacherMakeUpOne';
import StudentManagementSystem, { AttendanceRecord, ReputationRecord } from './TeacherMakeUpFour';
import EnhancedStudentReputationUpdater from './TeacherMakeUpfive';
import TeacherRoleChecker from '../MSTReadfunction/RoleManagementRead/hasTeacherRole';

// Import contract configurations
import { 
  contractRoleManagementConfig, 
  contractStudentManagementConfig, 
  contractAttendanceTrackingConfig
} from '../contracts';

// Define notification interface
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
}




// Define teacher dashboard component
const TeacherDashboardPage = () => {
  // Get connected wallet address
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Dashboard state
  const [activeSection, setActiveSection] = useState('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Shared state for cross-component communication
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(0);
  
  // Search history state
  const [searchHistory, setSearchHistory] = useState<Array<{
    type: string;
    address?: string;
    id?: number;
    timestamp: Date;
  }>>([]);
  
  // Error handling state
  const [componentErrors, setComponentErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs for responsive handling
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Log selectedProgram whenever it changes
  useEffect(() => {
    console.log('Selected Program:', selectedProgram);
  }, [selectedProgram]);
  
  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth < 1024 && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      } else if (window.innerWidth >= 1280 && sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);
  
  // Initialize data
  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Log that the dashboard is loaded
      console.log('Dashboard loaded, active section:', activeSection);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [activeSection]);
  
  // Add notification helper
  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    const notification = { id, message, type, timestamp: new Date() };
    
    setNotifications(prev => [
      notification,
      ...prev.slice(0, 4) // Keep only 5 most recent notifications
    ]);
    
    // Log notification for debugging
    console.log(`Notification added: ${type} - ${message}`);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);
  
  // Update attendance records history
  const handleAttendanceRecorded = useCallback((record: AttendanceRecord) => {
    console.log('Attendance recorded:', record);
    
    addNotification(
      `Attendance record for ${formatAddress(record.student)} successfully submitted!`,
      'success'
    );
    
    // Add to search history
    setSearchHistory(prev => {
      if (!prev.some(item => item.type === 'student' && item.address === record.student)) {
        return [
          { type: 'student', address: record.student, timestamp: new Date() },
          ...prev.slice(0, 9)
        ];
      }
      return prev;
    });
    
    // If this is the selected student, update their details
    if (record.student.toLowerCase() === selectedStudent.toLowerCase()) {
      // You might want to refresh student data here
      console.log('Updated attendance for selected student');
    }
  }, [addNotification, selectedStudent]);
  
  // Update reputation history
  const handleReputationUpdated = useCallback((record: ReputationRecord) => {
    console.log('Reputation updated:', record);
    
    addNotification(
      `Reputation for ${formatAddress(record.student)} successfully updated!`,
      'success'
    );
    
    // Add to search history
    setSearchHistory(prev => {
      if (!prev.some(item => item.type === 'student' && item.address === record.student)) {
        return [
          { type: 'student', address: record.student, timestamp: new Date() },
          ...prev.slice(0, 9)
        ];
      }
      return prev;
    });
    
    // If this is the selected student, update their details
    if (record.student.toLowerCase() === selectedStudent.toLowerCase()) {
      // You might want to refresh student data here
      console.log('Updated reputation for selected student');
    }
  }, [addNotification, selectedStudent]);
  
  // Handle contract errors
  const handleContractError = useCallback((error: Error) => {
    console.error('Contract error:', error);
    
    addNotification(
      `Transaction failed: ${error.message || 'Unknown error'}`,
      'error'
    );
  }, [addNotification]);
  
  // Handle selected student change
  const handleStudentSelected = useCallback((address: string) => {
    console.log('Student selected:', address);
    setSelectedStudent(address);
    
    // Add to search history if not already there
    if (address && address.length > 10) {
      setSearchHistory(prev => {
        if (!prev.some(item => item.type === 'student' && item.address === address)) {
          return [
            { type: 'student', address, timestamp: new Date() },
            ...prev.slice(0, 9) // Keep only 10 recent items
          ];
        }
        return prev;
      });
    }
  }, []);
  
  // Handle selected program change
  const handleProgramSelected = useCallback((programId: number) => {
    console.log('Program selected:', programId);
    setSelectedProgram(programId);
    
    // Add to search history if not already there
    if (programId > 0) {
      setSearchHistory(prev => {
        if (!prev.some(item => item.type === 'program' && item.id === programId)) {
          return [
            { type: 'program', id: programId, timestamp: new Date() },
            ...prev.slice(0, 9)
          ];
        }
        return prev;
      });
    }
  }, []);
  
  // Format wallet address for display
  const formatAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleString();
  };
  
  // Error boundary for component rendering
  const renderWithErrorBoundary = (componentKey: string, component: React.ReactNode) => {
    if (componentErrors[componentKey]) {
      return (
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
          <h3 className="text-lg text-red-400 font-medium mb-2">
            Error Loading Component
          </h3>
          <p className="text-gray-300 mb-3">
            {componentErrors[componentKey]}
          </p>
          <button
            onClick={() => {
              // Clear error and try reloading
              setComponentErrors(prev => ({...prev, [componentKey]: ''}));
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    try {
      return component;
    } catch (error) {
      console.error(`Error rendering ${componentKey}:`, error);
      
      setComponentErrors(prev => ({
        ...prev,
        [componentKey]: error instanceof Error ? error.message : 'Unknown error'
      }));
      
      return (
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
          <h3 className="text-lg text-red-400 font-medium mb-2">
            Error Loading Component
          </h3>
          <p className="text-gray-300">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      );
    }
  };
  
  // Define navigation items
  const navigationItems = [
    { 
      id: 'overview', 
      label: 'Dashboard Overview', 
      icon: 'dashboard',
      description: 'Key metrics and system status'
    },
    { 
      id: 'students', 
      label: 'Student Management', 
      icon: 'students',
      description: 'Lookup and manage student data'
    },
    { 
      id: 'programs', 
      label: 'Program Management', 
      icon: 'programs',
      description: 'View and manage educational programs' 
    },
    { 
      id: 'attendance', 
      label: 'Attendance Tracking', 
      icon: 'attendance',
      description: 'Record and track student attendance'
    },
    { 
      id: 'reputation', 
      label: 'Student Reputation', 
      icon: 'reputation',
      description: 'Manage student performance metrics'
    },
    { 
      id: 'roles', 
      label: 'Role Management', 
      icon: 'roles',
      description: 'Manage system permissions'
    }
  ];

  // Render different icon based on type
  const renderIcon = (iconName: string) => {
    switch(iconName) {
      case 'dashboard':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case 'students':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        );
      case 'programs':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
        );
      case 'attendance':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'reputation':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.796a4.002 4.002 0 01-.041-2.08l-.08.08-1.53-1.533A5.98 5.98 0 004 10c0 .954.223 1.856.619 2.657l1.54-1.54zm1.088-6.45A5.974 5.974 0 0110 4c.954 0 1.856.223 2.657.619l-1.54 1.54a4.002 4.002 0 00-2.346.033L7.246 4.668zM12 10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
          </svg>
        );
      case 'roles':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  // Render main content based on active section
  const renderMainContent = () => {
    switch(activeSection) {
      case 'overview':
        return renderWithErrorBoundary('overview', (
          // Remove the onDataChange prop if EducationalDashboard doesn't accept it
          <EducationalDashboard />
        ));
      case 'students':
        return renderWithErrorBoundary('students', (
          <StudentManagementDashboard 
            studentAddress={selectedStudent}
            refreshInterval={0}
            studentContractView={true}
            // Remove onStudentChange if the component doesn't accept it
          />
        ));
      case 'programs':
        return renderWithErrorBoundary('programs', (
          // Remove the callback props if ProgramManagementDashboard doesn't accept them
          <ProgramManagementDashboard />
        ));
      case 'attendance':
        return renderWithErrorBoundary('attendance', (
          <StudentManagementSystem 
            onAttendanceRecorded={handleAttendanceRecorded}
            onReputationUpdated={handleReputationUpdated}
            externalAttendanceRecords={[]}
            externalReputationRecords={[]}
          />
        ));
      case 'reputation':
        return renderWithErrorBoundary('reputation', (
          <EnhancedStudentReputationUpdater 
            reputationContract={contractAttendanceTrackingConfig}
            roleContract={contractRoleManagementConfig}
            schoolContract={contractStudentManagementConfig}
            studentAddress={selectedStudent}
            onPointsChange={(points) => {
              console.log('Points updated:', points);
            }}
            onValidationChange={(validation) => {
              if (!validation.isValid) {
                console.log('Validation error:', validation.errorMessage);
                if (validation.errorMessage) {
                  addNotification(`Validation error: ${validation.errorMessage}`, 'warning');
                }
              }
            }}
            onStatusChange={(status) => {
              if (status.error) {
                handleContractError(status.error);
              }
              
              if (status.isSuccess) {
                addNotification('Reputation update successful!', 'success');
              }
            }}
            onUpdateSuccess={(studentAddress, points) => {
              handleReputationUpdated({
                student: studentAddress,
                attendancePoints: points.attendancePoints,
                behaviorPoints: points.behaviorPoints,
                academicPoints: points.academicPoints,
                timestamp: Date.now()
              });
            }}
          />
        ));
      case 'roles':
        return renderWithErrorBoundary('roles', (
          <TeacherRoleChecker 
            onCheckComplete={(result: boolean, address: string) => {
              if (result) {
                addNotification(`Address ${formatAddress(address)} has teacher role`, 'success');
              } else {
                addNotification(`Address ${formatAddress(address)} does not have teacher role`, 'warning');
              }
              
              // Add to search history
              setSearchHistory(prev => {
                if (!prev.some(item => item.type === 'role-check' && item.address === address)) {
                  return [
                    { type: 'role-check', address, timestamp: new Date() },
                    ...prev.slice(0, 9)
                  ];
                }
                return prev;
              });
            }}
          />
        ));
      default:
        return renderWithErrorBoundary('default', <EducationalDashboard />);
    }
  };
  
  // Render recent search history in the sidebar
  const renderSearchHistory = () => {
    if ((sidebarCollapsed && !isMobileView) || searchHistory.length === 0) return null;
    
    return (
      <div className="px-4 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Recent Activity</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {searchHistory.slice(0, 5).map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 rounded-md bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => {
                // Make the search history items clickable
                if (item.type === 'student' && item.address) {
                  handleStudentSelected(item.address);
                  setActiveSection('students');
                } else if (item.type === 'program' && item.id) {
                  handleProgramSelected(item.id);
                  setActiveSection('programs');
                } else if (item.type === 'role-check' && item.address) {
                  handleStudentSelected(item.address);
                  setActiveSection('roles');
                }
              }}
            >
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  item.type === 'student' ? 'bg-blue-500' : 
                  item.type === 'program' ? 'bg-purple-500' : 
                  'bg-amber-500'
                }`}></div>
                <span className="text-xs text-gray-300 truncate">
                  {item.type === 'student' && item.address ? formatAddress(item.address) :
                   item.type === 'program' && item.id ? `Program #${item.id}` :
                   item.type === 'role-check' && item.address ? `Role Check: ${formatAddress(item.address)}` :
                   'Unknown item'}
                </span>
              </div>
              <span className="text-xs text-gray-500">{formatDate(item.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render mobile menu button
  const renderMobileMenuButton = () => {
    if (!isMobileView) return null;
    
    return (
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {mobileMenuOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Menu Button - Only visible on mobile */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        {renderMobileMenuButton()}
      </div>
      
      {/* Sidebar Navigation */}
      <div 
        ref={sidebarRef}
        className={`${
          isMobileView 
            ? mobileMenuOpen 
              ? 'fixed inset-y-0 left-0 z-40 w-64 transform translate-x-0' 
              : 'fixed inset-y-0 left-0 z-40 w-64 transform -translate-x-full'
            : sidebarCollapsed 
              ? 'w-20' 
              : 'w-64'
        } bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Dashboard Logo/Title */}
        <div className="h-16 flex items-center px-4 border-b border-gray-800">
          {(sidebarCollapsed && !isMobileView) ? (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
                Teacher Dashboard
              </h1>
              {isMobileView && (
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navigationItems.map((item: { id: string; label: string; icon: string; description: string }) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveSection(item.id);
                    if (isMobileView) {
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-gray-800 text-blue-400'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                  title={sidebarCollapsed || isMobileView ? `${item.label}: ${item.description}` : undefined}
                  aria-label={item.label}
                >
                  <span className="flex-shrink-0">{renderIcon(item.icon)}</span>
                  {(!sidebarCollapsed || isMobileView) && (
                    <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium truncate">{item.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Search History - Responsive */}
        <div className="hidden sm:block">
          {renderSearchHistory()}
        </div>
        
        {/* User Profile Section */}
        <div className={`p-2 sm:p-4 border-t border-gray-800 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`flex ${sidebarCollapsed ? 'flex-col items-center' : 'items-center'} ${!sidebarCollapsed && 'space-x-2 sm:space-x-3'}`}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white truncate">
                  Teacher Account
                </p>
                <p className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-full">
                  {isConnected ? formatAddress(connectedAddress || '') : 'Not connected'}
                </p>
              </div>
            )}
          </div>
          
          {/* Collapse/Expand button - hide on mobile */}
          {!isMobileView && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`mt-2 sm:mt-4 w-full text-xs flex items-center justify-center py-1 sm:py-2 px-2 sm:px-3 rounded-md bg-gray-800 text-gray-400 hover:text-gray-300 transition-colors ${sidebarCollapsed ? '' : 'text-center'}`}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M15 2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-2a1 1 0 1 1 0-2h1V4h-1a1 1 0 1 1 0-2h2zm-6 0a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h6zm-1 2H4v12h4V4z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h2a1 1 0 1 0 0-2H4V4h1a1 1 0 1 0 0-2H3zm12 0a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2zm-1 2h1v12h-1V4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs">Collapse</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-12 sm:h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 sm:px-6">
          {/* Page Title */}
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100 truncate ml-10 md:ml-0">
            {navigationItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
          </h2>
          
          {/* Header Actions */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                className="text-gray-400 hover:text-gray-300 p-1 rounded-md hover:bg-gray-800 transition-colors"
                aria-label={`Notifications ${notifications.length > 0 ? '(' + notifications.length + ')' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500 ring-2 ring-gray-900"></span>
                )}
              </button>
            </div>
            
            {/* Search History Count - Hide on small screens */}
            <div className="hidden sm:flex items-center px-3 py-1 bg-purple-900/20 border border-purple-800/30 rounded-full">
              <span className="text-xs font-medium text-purple-400">
                {searchHistory.length} recent items
              </span>
            </div>
            
            {/* Ethereum Network Status - Simplified on small screens */}
            <div className="flex items-center px-2 sm:px-3 py-1 bg-green-900/20 border border-green-800/30 rounded-full">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1 sm:mr-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              </div>
              <span className="text-xs font-medium text-green-400 hidden xs:inline">Network connected</span>
            </div>
            
            {/* Wallet Connection Status - Adaptive */}
            <div className="flex items-center px-2 sm:px-3 py-1 bg-gray-800 border border-gray-700 rounded-full">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${isConnected ? 'bg-blue-500' : 'bg-red-500'}`}></div>
              <span className="text-xs font-medium text-gray-300 hidden xs:inline truncate max-w-[80px] sm:max-w-full">
                {isConnected ? formatAddress(connectedAddress || '') : 'Wallet not connected'}
              </span>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 border-3 sm:border-4 border-t-blue-500 border-blue-200/20 rounded-full animate-spin mb-3 sm:mb-4"></div>
                <p className="text-sm sm:text-base text-gray-400">Loading dashboard...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
      
      {/* Notification System */}
      <div className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-50 space-y-2 max-w-[calc(100vw-24px)] sm:max-w-md">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              } flex items-center justify-between text-xs sm:text-sm`}
            >
              <p className="mr-2 break-words">{notification.message}</p>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="ml-1 sm:ml-3 text-white opacity-70 hover:opacity-100 flex-shrink-0"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;