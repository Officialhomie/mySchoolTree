import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { motion } from 'framer-motion'

function ConnectWallet() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 sm:p-8">
      <div className="max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-700 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Choose prefered wallet
            </h1>
            {account.status === 'connected' && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => disconnect()}
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-full border border-red-500/30 transition-all"
              >
                Disconnect
              </motion.button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl">
              <span className="text-gray-400">Connection Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                account.status === 'connected' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {account.status}
              </span>
            </div>

            {account.status === 'connected' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gray-700/50 rounded-xl space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
                    <p className="font-mono text-sm break-all bg-gray-800/50 p-2 rounded-lg">
                      {account.address}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Chain ID</p>
                      <p className="font-medium">{account.chainId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Network</p>
                      <p className="font-medium">
                        {account.chain?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {account.status !== 'connected' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-700"
          >
            <h2 className="text-xl font-semibold mb-4 text-white">Connect Wallet</h2>
            <p className="text-gray-400 text-sm mb-6">
              Choose your preferred wallet provider to connect to the application
            </p>
            
            <div className="space-y-3">
              {connectors.map((connector) => (
                <motion.button
                  key={connector.uid}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => connect({ connector })}
                  className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all"
                >
                  <span className="font-medium">{connector.name}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.button>
              ))}
            </div>

            {status && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-blue-500/10 rounded-lg text-blue-400 text-sm"
              >
                {status}...
              </motion.div>
            )}
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-500/10 rounded-lg text-red-400 text-sm flex items-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error.message}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ConnectWallet