import { useState, useEffect } from 'react';
import { useAccount } from "wagmi";
import { motion } from 'framer-motion';

// Import the components we've enhanced with exportable functionality
import { useAttendanceMetrics } from "../MSTReadfunction/AttendaceRead/StudentAttendance";
import { useStudentProgramProgress } from "../MSTReadfunction/AttendaceRead/StudentProgramProgress";
import { useStudentProgressTracker } from "../MSTReadfunction/AttendaceRead/StudentProgressTracker";

// Import the exportable UI components 
import { StudentProgressCompact } from "../MSTReadfunction/AttendaceRead/StudentProgramProgress";
import { CompactProgressIndicator } from "../MSTReadfunction/AttendaceRead/StudentProgressTracker";

// Import the contract configuration
import { contractAttendanceTrackingConfig } from "../contracts";

const StudentMakeUp = () => {
    // Get the student's wallet address
    const { address } = useAccount();
    
    // UI state management
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Hook into all three data sources using our exportable hooks
    // For attendance metrics
    const {
        setStudentAddress: setAttendanceAddress,
        metrics: attendanceMetrics,
        formatTimestamp,
        formatPercentage,
        handleFetchMetrics: fetchAttendance
    } = useAttendanceMetrics({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi
    });

    // For program progress
    const {
        progress: programProgress,
        getProgressPercentage: getProgramPercentage,
        getProgressStatus,
        handleFetchInfo: fetchProgramInfo
    } = useStudentProgramProgress({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi
    }, address);

    // For learning progress
    const {
        progress: learningProgress,
        formatProgressPercentage,
        getProgressPercentage: getLearningPercentage,
        getProgressColor,
        handleFetchProgress: fetchLearningProgress
    } = useStudentProgressTracker({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi
    }, address);

    // Set addresses and fetch all data when the component mounts
    useEffect(() => {
        if (address) {
            // Set the student address for attendance (program and learning progress already use address from props)
            setAttendanceAddress(address);
            
            // Function to fetch all data in parallel
            const fetchAllData = async () => {
                setIsLoading(true);
                try {
                    // Fetch each data source (in parallel)
                    await Promise.all([
                        fetchAttendance(),
                        fetchProgramInfo(),
                        fetchLearningProgress()
                    ]);
                } catch (error) {
                    console.error("Error fetching student data:", error);
                } finally {
                    setIsLoading(false);
                }
            };

            // Trigger the data fetch
            fetchAllData();
        }
    }, [address, setAttendanceAddress, fetchAttendance, fetchProgramInfo, fetchLearningProgress]);

    // Get overall student status based on all three metrics
    const calculateOverallStatus = () => {
        // Default values if data isn't loaded yet
        if (!attendanceMetrics || programProgress === null || learningProgress === null) {
            return { text: 'Loading...', color: 'text-gray-400' };
        }

        // Calculate percentages from each component
        const attendancePercent = attendanceMetrics.attendancePercentage 
            ? Number(attendanceMetrics.attendancePercentage) / 100 
            : 0;
        const programPercent = getProgramPercentage();
        const learningPercent = getLearningPercentage(learningProgress);

        // Calculate the average of all three metrics
        const averagePercent = (attendancePercent + programPercent + learningPercent) / 3;

        // Determine status based on the average
        if (averagePercent >= 80) return { text: 'Excellent', color: 'text-green-500' };
        if (averagePercent >= 60) return { text: 'Good', color: 'text-blue-500' };
        if (averagePercent >= 40) return { text: 'Satisfactory', color: 'text-yellow-500' };
        return { text: 'Needs Improvement', color: 'text-red-500' };
    };

    const overallStatus = calculateOverallStatus();

    // Animation variants for staggered card appearance
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Dashboard Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                    Student Dashboard
                </h1>
                <p className="text-gray-400 mt-2">
                    Welcome back, {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Student'}
                </p>
            </motion.div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-12 h-12 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-4 text-gray-300">Loading your educational data...</span>
                </div>
            ) : (
                <>
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-gray-700 mb-6">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 font-medium ${
                                activeTab === 'overview'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-4 py-2 font-medium ${
                                activeTab === 'attendance'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            Attendance
                        </button>
                        <button
                            onClick={() => setActiveTab('program')}
                            className={`px-4 py-2 font-medium ${
                                activeTab === 'program'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            Program Progress
                        </button>
                        <button
                            onClick={() => setActiveTab('learning')}
                            className={`px-4 py-2 font-medium ${
                                activeTab === 'learning'
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            Learning Progress
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="space-y-6"
                        >
                            {/* Summary Card */}
                            <motion.div 
                                variants={itemVariants}
                                className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg"
                            >
                                <h2 className="text-xl font-semibold text-blue-400 mb-2">Educational Journey Overview</h2>
                                <div className="flex items-center mb-3">
                                    <span className="text-lg mr-2">Overall Status:</span>
                                    <span className={`text-lg font-bold ${overallStatus.color}`}>{overallStatus.text}</span>
                                </div>
                                <p className="text-gray-400">
                                    This dashboard provides a comprehensive view of your educational journey, including attendance records,
                                    program completion status, and overall learning progress. Below you'll find a summary of your current standing.
                                </p>
                            </motion.div>

                            {/* Progress Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Attendance Card */}
                                <motion.div 
                                    variants={itemVariants}
                                    className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg"
                                >
                                    <h3 className="text-lg font-medium text-gray-300 mb-3">Attendance Record</h3>
                                    {attendanceMetrics ? (
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-gray-400">Attendance Rate:</span>
                                                <span className="text-white font-bold">{formatPercentage(attendanceMetrics.attendancePercentage)}%</span>
                                            </div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-gray-400">Present:</span>
                                                <span className="text-white">{attendanceMetrics.totalPresent} days</span>
                                            </div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-gray-400">Absent:</span>
                                                <span className="text-white">{attendanceMetrics.totalAbsent} days</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Current Streak:</span>
                                                <span className="text-white">{attendanceMetrics.consecutivePresent} days</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-400">No attendance data available</p>
                                    )}
                                    <button 
                                        onClick={() => setActiveTab('attendance')} 
                                        className="mt-4 w-full px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                                    >
                                        View Details
                                    </button>
                                </motion.div>

                                {/* Program Progress Card */}
                                <motion.div 
                                    variants={itemVariants}
                                    className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg"
                                >
                                    <h3 className="text-lg font-medium text-gray-300 mb-3">Program Progress</h3>
                                    {programProgress !== null ? (
                                        <div>
                                            <StudentProgressCompact 
                                                progress={programProgress} 
                                                maxProgress={100} 
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-gray-400">No program progress data available</p>
                                    )}
                                    <button 
                                        onClick={() => setActiveTab('program')} 
                                        className="mt-4 w-full px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                                    >
                                        View Details
                                    </button>
                                </motion.div>

                                {/* Learning Progress Card */}
                                <motion.div 
                                    variants={itemVariants}
                                    className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg"
                                >
                                    <h3 className="text-lg font-medium text-gray-300 mb-3">Learning Progress</h3>
                                    {learningProgress !== null ? (
                                        <div>
                                            <CompactProgressIndicator 
                                                progress={learningProgress} 
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-gray-400">No learning progress data available</p>
                                    )}
                                    <button 
                                        onClick={() => setActiveTab('learning')} 
                                        className="mt-4 w-full px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                                    >
                                        View Details
                                    </button>
                                </motion.div>
                            </div>

                            {/* Recent Attendance History */}
                            <motion.div 
                                variants={itemVariants}
                                className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg"
                            >
                                <h3 className="text-lg font-medium text-gray-300 mb-4">Recent Attendance</h3>
                                
                                {attendanceMetrics?.history && attendanceMetrics.history.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-700">
                                            <thead className="bg-gray-800/50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Term</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                                                {/* Show just the 5 most recent records */}
                                                {attendanceMetrics.history.slice(0, 5).map((record, index) => (
                                                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/10'}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                                                            {formatTimestamp(record.timestamp)}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                record.present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {record.present ? 'Present' : 'Absent'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                                                            {record.termNumber}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-400">No recent attendance records available</p>
                                )}
                            </motion.div>
                            
                            {/* Recommendations Section */}
                            <motion.div 
                                variants={itemVariants}
                                className="bg-blue-900/20 rounded-lg p-5 border border-blue-800/30 shadow-lg"
                            >
                                <h3 className="text-lg font-medium text-blue-400 mb-3">Personalized Recommendations</h3>
                                <ul className="space-y-3">
                                    {/* Attendance recommendations */}
                                    {attendanceMetrics && attendanceMetrics.attendancePercentage && 
                                     (Number(attendanceMetrics.attendancePercentage) / 100 < 70) ? (
                                        <li className="flex items-start">
                                            <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-gray-300">
                                                Your attendance rate is below 70%. Improving your attendance will significantly enhance your overall progress.
                                            </span>
                                        </li>
                                    ) : null}
                                    
                                    {/* Program progress recommendations */}
                                    {programProgress !== null && getProgramPercentage() < 50 ? (
                                        <li className="flex items-start">
                                            <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-gray-300">
                                                You've completed less than half of your program requirements. Focus on completing key assignments to progress to the next level.
                                            </span>
                                        </li>
                                    ) : null}
                                    
                                    {/* Learning progress recommendations */}
                                    {learningProgress !== null && getLearningPercentage(learningProgress) < 70 ? (
                                        <li className="flex items-start">
                                            <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-gray-300">
                                                Consider spending more time engaging with the course materials to improve your learning progress.
                                            </span>
                                        </li>
                                    ) : null}
                                    
                                    {/* General recommendation that's always shown */}
                                    <li className="flex items-start">
                                        <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-gray-300">
                                            Check your dashboard regularly to monitor your progress and identify areas where you can improve.
                                        </span>
                                    </li>
                                </ul>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Attendance Detail Tab */}
                    {activeTab === 'attendance' && (
                        <div>
                            <p className="text-gray-400 mb-4">Your attendance record shows your participation in scheduled class sessions.</p>
                            
                            {attendanceMetrics ? (
                                <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg">
                                    <h3 className="text-xl font-semibold mb-4 text-blue-400">Attendance Detail</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        {/* Attendance Percentage */}
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Attendance Rate</p>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-2xl font-bold text-gray-200">{formatPercentage(attendanceMetrics.attendancePercentage)}</span>
                                                <span className="text-gray-400">%</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Overall attendance percentage</p>
                                        </div>
                                        
                                        {/* Total Present */}
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Present</p>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-2xl font-bold text-gray-200">{attendanceMetrics.totalPresent}</span>
                                                <span className="text-gray-400">days</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Total days present</p>
                                        </div>
                                        
                                        {/* Total Absent */}
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Absent</p>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-2xl font-bold text-gray-200">{attendanceMetrics.totalAbsent}</span>
                                                <span className="text-gray-400">days</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Total days absent</p>
                                        </div>
                                        
                                        {/* Consecutive Present */}
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Current Streak</p>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-2xl font-bold text-gray-200">{attendanceMetrics.consecutivePresent}</span>
                                                <span className="text-gray-400">days</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Consecutive days present</p>
                                        </div>
                                    </div>
                                    
                                    {/* Complete Attendance History */}
                                    <div className="mt-6">
                                        <h4 className="text-lg font-semibold mb-3 text-gray-300">Complete Attendance History</h4>
                                        
                                        <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-700">
                                                    <thead className="bg-gray-800/50">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Term</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                                                        {attendanceMetrics?.history?.map((record, index) => (
                                                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/10'}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                                    {formatTimestamp(record.timestamp)}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                        record.present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {record.present ? 'Present' : 'Absent'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                                    {record.termNumber}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-800/60 rounded-lg p-8 border border-gray-700 shadow-lg text-center">
                                    <p className="text-gray-400 mb-4">No attendance data is currently available for your account.</p>
                                    <button
                                        onClick={fetchAttendance}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                    >
                                        Refresh Attendance Data
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Program Progress Tab */}
                    {activeTab === 'program' && (
                        <div>
                            <p className="text-gray-400 mb-4">Your progress through the educational program curriculum.</p>
                            
                            {programProgress !== null ? (
                                <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg">
                                    <h3 className="text-xl font-semibold mb-4 text-blue-400">Program Progress Detail</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Progress Points</p>
                                            <div className="text-gray-200 text-2xl font-bold">
                                                {programProgress} / 100
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Status</p>
                                            <div className={`font-semibold text-xl ${getProgressStatus().colorClass}`}>
                                                {getProgressStatus().text}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Progress bar */}
                                    <div className="mt-4 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                        <p className="text-sm text-gray-400 mb-1">Overall Progress</p>
                                        <div className="mt-3">
                                            <div className="w-full bg-gray-700 rounded-full h-4">
                                                <div 
                                                    className={`h-4 rounded-full ${
                                                        getProgramPercentage() < 25
                                                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                                                            : getProgramPercentage() < 50
                                                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                                                : getProgramPercentage() < 75
                                                                    ? 'bg-gradient-to-r from-purple-400 to-purple-500'
                                                                    : 'bg-gradient-to-r from-blue-500 to-green-400'
                                                    }`}
                                                    style={{ 
                                                        width: `${getProgramPercentage()}%` 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-1 text-xs text-gray-400">
                                            <span>0%</span>
                                            <span>25%</span>
                                            <span>50%</span>
                                            <span>75%</span>
                                            <span>100%</span>
                                        </div>
                                    </div>
                                    
                                    {/* Recommendations */}
                                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                        <div className="flex items-start">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <div className="text-blue-400">
                                                {getProgramPercentage() >= 100 ? (
                                                    <p>Congratulations! You've completed the program requirements.</p>
                                                ) : getProgramPercentage() >= 75 ? (
                                                    <p>You're making excellent progress! Continue attending sessions to complete the program.</p>
                                                ) : getProgramPercentage() >= 50 ? (
                                                    <p>You're on the right track. Keep up the good work and attend upcoming sessions.</p>
                                                ) : getProgramPercentage() >= 25 ? (
                                                    <p>You've made a good start. Increasing your participation will help boost your progress.</p>
                                                ) : (
                                                    <p>Getting started is the hardest part. Join more sessions to increase your progress.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-800/60 rounded-lg p-8 border border-gray-700 shadow-lg text-center">
                                    <p className="text-gray-400 mb-4">No program progress data is currently available for your account.</p>
                                    <button
                                        onClick={fetchProgramInfo}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                    >
                                        Refresh Program Data
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Learning Progress Tab */}
                    {activeTab === 'learning' && (
                        <div>
                            <p className="text-gray-400 mb-4">Your progress in mastering the educational content and materials.</p>
                            
                            {learningProgress !== null ? (
                                <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 shadow-lg">
                                    <h3 className="text-xl font-semibold mb-4 text-blue-400">Learning Progress Detail</h3>
                                    
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-300">Overall Learning Progress</span>
                                            <span className="text-gray-300 font-bold">{formatProgressPercentage(learningProgress)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getLearningPercentage(learningProgress)}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className={`h-full bg-gradient-to-r ${getProgressColor(getLearningPercentage(learningProgress))}`}
                                            ></motion.div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                        {/* Progress Level Card */}
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Progress Level</p>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-2xl font-bold text-gray-200">{formatProgressPercentage(learningProgress)}</span>
                                                <span className="text-gray-400">%</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Overall completion percentage</p>
                                        </div>
                                        
                                        {/* Status Card */}
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Status</p>
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    getLearningPercentage(learningProgress) < 30 ? 'bg-red-500' : 
                                                    getLearningPercentage(learningProgress) < 70 ? 'bg-yellow-500' : 
                                                    'bg-green-500'
                                                }`}></div>
                                                <span className="text-lg font-bold text-gray-200">
                                                    {getLearningPercentage(learningProgress) < 30 ? 'Starting' : 
                                                    getLearningPercentage(learningProgress) < 70 ? 'In Progress' : 
                                                    'Advanced'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Current learning status</p>
                                        </div>
                                        
                                        {/* Raw Value Card */}
                                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                            <p className="text-sm text-gray-400 mb-1">Raw Value</p>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-md font-bold text-gray-200 truncate">{learningProgress?.toString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Raw progress value (basis points)</p>
                                        </div>
                                    </div>
                                    
                                    {/* Progress Assessment */}
                                    <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                                        <h4 className="font-medium text-gray-300 mb-2">Learning Assessment</h4>
                                        <p className="text-sm text-gray-400">
                                            {getLearningPercentage(learningProgress) < 30 ? 
                                                'You are in the early stages of your educational journey. More focus and engagement with the learning materials will help improve your progress.' : 
                                                getLearningPercentage(learningProgress) < 70 ? 
                                                'You are making steady progress in your educational journey. Continued engagement with the learning materials will help you reach advanced stages.' : 
                                                'You are at an advanced stage in your educational journey. You are demonstrating excellent engagement with the learning materials.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-800/60 rounded-lg p-8 border border-gray-700 shadow-lg text-center">
                                    <p className="text-gray-400 mb-4">No learning progress data is currently available for your account.</p>
                                    <button
                                        onClick={fetchLearningProgress}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                    >
                                        Refresh Learning Data
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StudentMakeUp;