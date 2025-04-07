import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// Import from the first component
import { 
    useProgramManagement, 
    AddressWithCopy
} from '../MSTReadfunction/AttendaceRead/GetProgramManagement';

// Import from the second component
import GetProgramAttendance, { 
    useProgramAttendance,
    type ProgramAttendanceData 
} from '../MSTReadfunction/AttendaceRead/GetProgramAttendance';


// Main integrated component
const IntegratedProgramDashboard = () => {
    // States for the integrated component
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'management', 'attendance'

    // Use the custom hooks from both components
    const {
        programManagementAddress,
        showInfo: showManagementInfo,
        fetchStatus: managementFetchStatus,
        showStatus: showManagementStatus,
        isLoading: isManagementLoading,
        isError: isManagementError,
        handleFetchInfo: handleFetchManagementInfo
    } = useProgramManagement();

    const {
        data: attendanceData,
        setData: setAttendanceData,
        checkAttendance,
        isPending: isAttendanceLoading
    } = useProgramAttendance();

    // Handler for the attendance data changes
    const handleAttendanceDataChange = useCallback((data: ProgramAttendanceData) => {
        setAttendanceData(data);
    }, [setAttendanceData]);

    // Function to fetch all data for the overview
    const fetchAllData = useCallback(async () => {
        await handleFetchManagementInfo();
        if (attendanceData.programId && attendanceData.studentAddress) {
            await checkAttendance();
        }
    }, [handleFetchManagementInfo, checkAttendance, attendanceData.programId, attendanceData.studentAddress]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Program Dashboard
            </h1>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap mb-6 border-b border-gray-700">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 mr-2 ${activeTab === 'overview' 
                        ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400' 
                        : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('management')}
                    className={`px-4 py-2 mr-2 ${activeTab === 'management' 
                        ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-400' 
                        : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Program Management
                </button>
                <button 
                    onClick={() => setActiveTab('attendance')}
                    className={`px-4 py-2 ${activeTab === 'attendance' 
                        ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400' 
                        : 'text-gray-400 hover:text-gray-300'}`}
                >
                    Attendance Check
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Summary Card - Program Management */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                            <h3 className="text-xl font-semibold mb-4 text-blue-400">Program Management</h3>
                            
                            {programManagementAddress ? (
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <p className="text-sm text-gray-400 mb-1">Management Contract:</p>
                                    <AddressWithCopy address={programManagementAddress} />
                                </div>
                            ) : (
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 flex items-center justify-between">
                                    <p className="text-sm text-gray-400">No address data available</p>
                                    <button 
                                        onClick={handleFetchManagementInfo}
                                        className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded hover:bg-blue-500/30 transition-colors text-sm"
                                    >
                                        Fetch
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Summary Card - Attendance Status */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                            <h3 className="text-xl font-semibold mb-4 text-green-400">Attendance Status</h3>
                            
                            {attendanceData.hasAttended !== null ? (
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <div className="flex justify-between mb-2">
                                        <p className="text-sm text-gray-400">Program ID:</p>
                                        <p className="text-sm text-gray-300">{attendanceData.programId}</p>
                                    </div>
                                    <div className="flex justify-between mb-3">
                                        <p className="text-sm text-gray-400">Student:</p>
                                        <p className="text-sm text-gray-300">
                                            {attendanceData.studentAddress.slice(0, 6)}...{attendanceData.studentAddress.slice(-4)}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center mt-2">
                                        {attendanceData.hasAttended ? (
                                            <div className="flex items-center bg-green-500/20 text-green-400 px-4 py-2 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-semibold">Present</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center bg-red-500/20 text-red-400 px-4 py-2 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-semibold">Absent</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 flex flex-col justify-center items-center">
                                    <p className="text-sm text-gray-400 mb-2">No attendance data available</p>
                                    <button 
                                        onClick={() => setActiveTab('attendance')}
                                        className="bg-green-500/20 text-green-400 px-3 py-1 rounded hover:bg-green-500/30 transition-colors text-sm"
                                    >
                                        Check Attendance
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-purple-400">Quick Actions</h3>
                        
                        <div className="flex flex-wrap gap-4 justify-center">
                            <motion.button
                                onClick={fetchAllData}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isManagementLoading || isAttendanceLoading}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                            >
                                {isManagementLoading || isAttendanceLoading ? 'Loading...' : 'Refresh All Data'}
                            </motion.button>
                            
                            <motion.button
                                onClick={() => setActiveTab('management')}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="bg-blue-500/20 text-blue-400 py-2 px-6 rounded-md hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg"
                            >
                                Program Management
                            </motion.button>
                            
                            <motion.button
                                onClick={() => setActiveTab('attendance')}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="bg-green-500/20 text-green-400 py-2 px-6 rounded-md hover:bg-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg"
                            >
                                Check Attendance
                            </motion.button>
                        </div>
                    </div>
                </div>
            )}

            {/* Program Management Tab */}
            {activeTab === 'management' && (
                <div>
                    <div className="mb-4 flex justify-center">
                        <motion.button
                            onClick={handleFetchManagementInfo}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isManagementLoading}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                        >
                            {isManagementLoading ? 'Loading...' : 'Fetch Program Management'}
                        </motion.button>
                    </div>
                    
                    {showManagementStatus && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-4"
                        >
                            <p className={`p-2 rounded-md ${managementFetchStatus.includes('Error') || managementFetchStatus.includes('Could not') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                {managementFetchStatus}
                            </p>
                        </motion.div>
                    )}
                    
                    {isManagementLoading && (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                            <span className="ml-3 text-gray-300">Loading program management information...</span>
                        </div>
                    )}
                    
                    {isManagementError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                            <div className="text-red-400 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-lg">Error fetching program management address</p>
                            </div>
                        </div>
                    )}
                    
                    {showManagementInfo && programManagementAddress !== null && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                            className="mt-6"
                        >
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                                <h3 className="text-xl font-semibold mb-4 text-blue-400">Program Management Details</h3>
                                
                                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                    <p className="text-sm text-gray-400 mb-1">Program Management Contract Address</p>
                                    <div className="text-gray-200 break-all">
                                        <AddressWithCopy address={programManagementAddress} />
                                    </div>
                                </div>
                                
                                <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-blue-400">
                                            This is the address of the Program Management contract. It handles program-level operations and configurations.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Attendance Check Tab */}
            {activeTab === 'attendance' && (
                <GetProgramAttendance 
                    defaultProgramId={attendanceData.programId ? parseInt(attendanceData.programId) : undefined}
                    defaultAddress={attendanceData.studentAddress as `0x${string}` || undefined}
                    onDataChange={handleAttendanceDataChange}
                />
            )}
        </motion.div>
    );
};

// Export a simplified version for embedding
export const CompactProgramDashboard = ({ 
    defaultProgramId,
    defaultStudentAddress
}: { 
    defaultProgramId?: number;
    defaultStudentAddress?: `0x${string}`;
}) => {
    const {
        programManagementAddress,
        handleFetchInfo: handleFetchManagement
    } = useProgramManagement();

    const {
        data: attendanceData,
        setData: setAttendanceData,
        checkAttendance
    } = useProgramAttendance({
        programId: defaultProgramId?.toString() || '',
        studentAddress: defaultStudentAddress || '',
        hasAttended: null,
        isLoading: false,
        isError: false,
        fetchAttendance: async () => {},
        fetchStatus: ''
    });

    useEffect(() => {
        // Initial fetch of management data
        handleFetchManagement();
        
        // If both program ID and student address are provided, fetch attendance
        if (defaultProgramId && defaultStudentAddress) {
            setAttendanceData(prev => ({
                ...prev,
                programId: defaultProgramId.toString(),
                studentAddress: defaultStudentAddress
            }));
            checkAttendance();
        }
    }, [defaultProgramId, defaultStudentAddress, handleFetchManagement, checkAttendance, setAttendanceData]);

    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-md font-semibold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Program Dashboard
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
                {/* Management Info */}
                <div className="bg-gray-700/50 p-3 rounded-md">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-400">Management Contract:</p>
                        {!programManagementAddress && (
                            <button 
                                onClick={handleFetchManagement}
                                className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-500/30 transition-colors"
                            >
                                Fetch
                            </button>
                        )}
                    </div>
                    {programManagementAddress ? (
                        <div className="text-xs text-gray-200">
                            {programManagementAddress.slice(0, 6)}...{programManagementAddress.slice(-4)}
                            <button 
                                onClick={() => navigator.clipboard.writeText(programManagementAddress)}
                                className="ml-2 text-blue-400 hover:text-blue-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">Not available</p>
                    )}
                </div>
                
                {/* Attendance Status */}
                <div className="bg-gray-700/50 p-3 rounded-md">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-400">Attendance:</p>
                        {(defaultProgramId && defaultStudentAddress) && (
                            <button 
                                onClick={checkAttendance}
                                className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded hover:bg-green-500/30 transition-colors"
                            >
                                Check
                            </button>
                        )}
                    </div>
                    
                    {attendanceData.hasAttended !== null ? (
                        <div className="flex items-center mt-1">
                            {attendanceData.hasAttended ? (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Present
                                </span>
                            ) : (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Absent
                                </span>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">Not checked</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntegratedProgramDashboard;