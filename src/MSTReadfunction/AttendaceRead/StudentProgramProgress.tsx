import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { motion } from 'framer-motion';

const GetStudentProgramProgress = ({ 
    contract, 
    defaultAddress 
}: { 
    contract: { address: `0x${string}`; abi: any };
    defaultAddress?: `0x${string}`;
}) => {
    const [studentAddress, setStudentAddress] = useState<string>(defaultAddress || '');
    const [progress, setProgress] = useState<number | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [isValid, setIsValid] = useState(false);

    // Set max progress value (this could be fetched from contract in a real implementation)
    const MAX_PROGRESS = 100;

    const { isError, isLoading, refetch } = useReadContract({
        ...contract,
        functionName: 'studentProgramProgress',
        args: [studentAddress as `0x${string}`],
    });

    // Validate input
    useEffect(() => {
        // Check if address is a valid Ethereum address
        const validAddress = /^0x[a-fA-F0-9]{40}$/.test(studentAddress);
        setIsValid(validAddress);
    }, [studentAddress]);

    const handleFetchInfo = async () => {
        if (!isValid) {
            setFetchStatus('Please enter a valid Ethereum address');
            setShowStatus(true);
            return;
        }

        try {
            const result = await refetch();
            
            if (result.data !== undefined) {
                // Convert bigint to number
                setProgress(Number(result.data));
                setFetchStatus('Progress fetched successfully');
                setShowInfo(true);
            } else {
                setFetchStatus('Could not retrieve student progress');
                setProgress(null);
                setShowInfo(false);
            }
        } catch (error) {
            console.error('Error fetching student progress:', error);
            setFetchStatus('Error fetching student progress');
            setProgress(null);
            setShowInfo(false);
        }
        
        setShowStatus(true);
    };

    useEffect(() => {
        if (showStatus) {
            const timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showStatus]);

    // Calculate progress percentage
    const getProgressPercentage = () => {
        if (progress === null) return 0;
        return Math.min(100, (progress / MAX_PROGRESS) * 100);
    };

    // Get progress status and colors
    const getProgressStatus = () => {
        if (progress === null) return { text: '', colorClass: '' };
        
        const percentage = getProgressPercentage();
        
        if (percentage >= 100) {
            return { text: 'Completed', colorClass: 'text-green-400' };
        } else if (percentage >= 75) {
            return { text: 'Advanced', colorClass: 'text-blue-400' };
        } else if (percentage >= 50) {
            return { text: 'Intermediate', colorClass: 'text-purple-400' };
        } else if (percentage >= 25) {
            return { text: 'Beginner', colorClass: 'text-yellow-400' };
        } else {
            return { text: 'Getting Started', colorClass: 'text-red-400' };
        }
    };
    
    const progressStatus = getProgressStatus();

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Student Program Progress
            </h2>

            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 mb-4">
                <label className="block text-sm text-gray-400 mb-1">Student Address</label>
                <input
                    type="text"
                    value={studentAddress}
                    onChange={(e) => setStudentAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <div className="mb-4 flex justify-center">
                <motion.button
                    onClick={handleFetchInfo}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading || !isValid}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-6 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300 shadow-lg disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Check Progress'}
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
                    <span className="ml-3 text-gray-300">Loading progress information...</span>
                </div>
            )}
            
            {isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg">Error checking student progress</p>
                    </div>
                </div>
            )}
            
            {showInfo && progress !== null && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                >
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-blue-400">Progress Details</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Progress Points</p>
                                <div className="text-gray-200 text-2xl font-bold">
                                    {progress} / {MAX_PROGRESS}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                                <p className="text-sm text-gray-400 mb-1">Status</p>
                                <div className={`font-semibold text-xl ${progressStatus.colorClass}`}>
                                    {progressStatus.text}
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
                                            getProgressPercentage() < 25
                                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                                : getProgressPercentage() < 50
                                                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                                    : getProgressPercentage() < 75
                                                        ? 'bg-gradient-to-r from-purple-400 to-purple-500'
                                                        : 'bg-gradient-to-r from-blue-500 to-green-400'
                                        }`}
                                        style={{ 
                                            width: `${getProgressPercentage()}%` 
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
                        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="text-blue-400">
                                    {getProgressPercentage() >= 100 ? (
                                        <p>Congratulations! You've completed the program requirements.</p>
                                    ) : getProgressPercentage() >= 75 ? (
                                        <p>You're making excellent progress! Continue attending sessions to complete the program.</p>
                                    ) : getProgressPercentage() >= 50 ? (
                                        <p>You're on the right track. Keep up the good work and attend upcoming sessions.</p>
                                    ) : getProgressPercentage() >= 25 ? (
                                        <p>You've made a good start. Increasing your attendance will help boost your progress.</p>
                                    ) : (
                                        <p>Getting started is the hardest part. Join more sessions to increase your progress.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default GetStudentProgramProgress;