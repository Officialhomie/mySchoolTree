import { Buffer } from 'buffer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import OCConnectWrapper from './components/OCConnectWrapper'



import App from './App.tsx'
import { config } from './wagmi.ts'

import './index.css'
import { BrowserRouter } from 'react-router-dom'

(globalThis as any).Buffer = Buffer

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OCConnectWrapper sandboxMode={true}> {/* Set to false for production */}
            <App />
          </OCConnectWrapper>
      </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
