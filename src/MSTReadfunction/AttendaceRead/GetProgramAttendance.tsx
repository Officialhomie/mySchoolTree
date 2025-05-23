import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { contractAttendanceTrackingConfig } from '../../contracts';

export type ProgramAttendanceData = {
  programId: string;
  studentAddress: string;
  hasAttended: boolean | null;
  isLoading: boolean;
  isError: boolean;
  fetchAttendance: () => Promise<void>;
  fetchStatus: string;
};

type GetProgramAttendanceProps = {
  defaultProgramId?: number;
  defaultAddress?: `0x${string}`;
  onDataChange?: (data: ProgramAttendanceData) => void;
};

const GetProgramAttendance = ({ 
  defaultProgramId, 
  defaultAddress,
  onDataChange
}: GetProgramAttendanceProps) => {
    const [programId, setProgramId] = useState<string>(defaultProgramId?.toString() || '');
    const [studentAddress, setStudentAddress] = useState<string>(defaultAddress || '');
    const [hasAttended, setHasAttended] = useState<boolean | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [isValid, setIsValid] = useState(false);

    const { isError, isLoading, refetch } = useReadContract({
        address: contractAttendanceTrackingConfig.address as `0x${string}`,
        abi: contractAttendanceTrackingConfig.abi,
        functionName: 'programAttendance',
        args: [BigInt(programId || '0'), studentAddress as `0x${string}`],
    });

    // Validate inputs
    useEffect(() => {
        // Check if programId is a valid number
        const validProgramId = /^\d+$/.test(programId) && parseInt(programId) >= 0;
        
        // Check if address is a valid Ethereum address
        const validAddress = /^0x[a-fA-F0-9]{40}$/.test(studentAddress);
        
        setIsValid(validProgramId && validAddress);
    }, [programId, studentAddress]);

    const handleFetchInfo = useCallback(async () => {
        if (!isValid) {
            setFetchStatus('Please enter a valid program ID and Ethereum address');
            setShowStatus(true);
            return;
        }

        try {
            const result = await refetch();
            
            if (result.data !== undefined) {
                setHasAttended(result.data as boolean);
                setFetchStatus('Attendance status fetched successfully');
                setShowInfo(true);
            } else {
                setFetchStatus('Could not retrieve attendance status');
                setHasAttended(null);
                setShowInfo(false);
            }
        } catch (error) {
            console.error('Error fetching attendance status:', error);
            setFetchStatus('Error fetching attendance status');
            setHasAttended(null);
            setShowInfo(false);
        }
        
        setShowStatus(true);
    }, [isValid, refetch]);

    // Export data when it changes
    useEffect(() => {
        if (onDataChange) {
            onDataChange({
                programId,
                studentAddress,
                hasAttended,
                isLoading,
                isError,
                fetchAttendance: handleFetchInfo,
                fetchStatus
            });
        }
    }, [programId, studentAddress, hasAttended, isLoading, isError, handleFetchInfo, fetchStatus, onDataChange]);

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
                Program Attendance Check
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                    <label className="block text-sm text-gray-400 mb-1">Program ID</label>
                    <input
                        type="number"
                        value={programId}
                        onChange={(e) => setProgramId(e.target.value)}
                        min="0"
                        placeholder="Enter program ID"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                    <label className="block text-sm text-gray-400 mb-1">Student Address</label>
                    <input
                        type="text"
                        value={studentAddress}
                        onChange={(e) => setStudentAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            <div className="mb-4 flex justify-center">
                <motion.button
                    onClick={handleFetchInfo}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading || !isValid}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Check Attendance'}
                </motion.button>
            </div>
            
            {showStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                >
                    <p className={`p-2 rounded-md ${fetchStatus.includes('Error') || fetchStatus.includes('Could not') || fetchStatus.includes('Please enter') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {fetchStatus}
                    </p>
                </motion.div>
            )}
            
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="w-10 h-10 border-4 border-t-blue-400 border-r-purple-500 border-b-blue-400 border-l-purple-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Loading attendance information...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error checking attendance status</p>
                    </div>
                </div>
            )}
            
            {showInfo && hasAttended !== null && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Attendance Status</h3>
                        
                        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                            <p className="text-sm text-gray-400 mb-1">Attendance for Program ID: {programId}</p>
                            <div className="text-gray-200 flex items-center">
                                {hasAttended ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-green-400 font-semibold">Present</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-red-400 font-semibold">Absent</span>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <p className="text-purple-400">
                                    {hasAttended 
                                        ? "The student has attended this program session." 
                                        : "The student has not attended this program session."}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

// Custom hook to use program attendance data in other components
export const useProgramAttendance = (initialData?: ProgramAttendanceData) => {
    const [data, setData] = useState<ProgramAttendanceData>(initialData || {
        programId: '',
        studentAddress: '',
        hasAttended: null,
        isLoading: false,
        isError: false,
        fetchAttendance: async () => {},
        fetchStatus: ''
    });

    return {
        data,
        setData,
        checkAttendance: data.fetchAttendance,
        isStudentPresent: data.hasAttended,
        isPending: data.isLoading
    };
};

export default GetProgramAttendance;