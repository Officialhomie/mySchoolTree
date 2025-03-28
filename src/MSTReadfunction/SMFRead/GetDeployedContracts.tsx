import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';

// Utility function to truncate address
const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const GetDeployedContracts = ({ contract }: { contract: any }) => {
    const [deployedContracts, setDeployedContracts] = useState<any[]>([]);
    const [fetchStatus, setFetchStatus] = useState('');
    const [showStatus, setShowStatus] = useState(false);
    const [showList, setShowList] = useState(false);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);

    const { data, isError, isLoading } = useReadContract({
        ...contract,
        functionName: 'getDeployedContracts',
        args: [offset, limit],
    });    


    const handleToggleContracts = () => {
        if (!deployedContracts.length) {
            if (data) {
                setDeployedContracts(data as any);
                setFetchStatus('Contracts fetched successfully');
            } else {
                setFetchStatus('No contracts found or error fetching contracts');
            }
            setShowStatus(true);
        }
        setShowList(!showList);
    };

    const handleLoadMore = () => {
        setOffset(offset + limit);
    };

    useEffect(() => {
        if (data && (data as any).length > 0) {

            setDeployedContracts(prev => [...prev, ...data as any]);
        }
    }, [data]);

    useEffect(() => {
        if (showStatus) {
            const timer = setTimeout(() => {
                setShowStatus(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showStatus]);

    if (isLoading && offset === 0) return <div>Loading...</div>;
    if (isError) return <div>Error fetching deployed contracts</div>;

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 max-w-full mx-auto w-full md:max-w-full mb-9">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Deployed Contracts</h2>
            <div className="flex gap-4 mb-4">
                <div>
                    <label htmlFor="limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Limit per page
                    </label>
                    <select
                        id="limit"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>
            
            <button
                onClick={handleToggleContracts}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors duration-300"
            >
                {showList ? 'Hide Contracts' : 'Fetch Contracts'}
            </button>
            
            {showStatus && (
                <p className={`mt-4 text-lg text-center transition-opacity duration-500 ${showStatus ? 'opacity-100' : 'opacity-0'}`}>
                    {fetchStatus}
                </p>
            )}
            
            <div className="mt-6">
                {showList && deployedContracts.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Contracts List:</h3>
                        <ul className="space-y-2">
                            {deployedContracts.map((contractAddress, index) => (
                                <li key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <span className="block md:hidden">{truncateAddress(contractAddress)}</span>
                                    <span className="hidden md:block">{contractAddress}</span>
                                </li>
                            ))}
                        </ul>
                        
                        {limit > 0 && (
                            <button
                                onClick={handleLoadMore}
                                className="mt-4 w-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-300"
                            >
                                Load More
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GetDeployedContracts;