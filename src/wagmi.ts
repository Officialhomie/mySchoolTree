import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, polygon, optimism, arbitrum, base, bsc, Chain } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect, metaMask } from 'wagmi/connectors'

// Define Open Campus Codex Chain
const openCampusChain: Chain = {
  id: 656476,
  name: 'Open Campus Codex',
  nativeCurrency: {
    name: 'EDU',
    symbol: 'EDU',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.open-campus-codex.gelato.digital'],
    },
    public: {
      http: ['https://rpc.open-campus-codex.gelato.digital'],
    }
  },
  blockExplorers: {
    default: {
      name: 'Block Scout',
      url: 'https://opencampus-codex.blockscout.com/',
    },
  },
  testnet: true,
}

// Create a wagmi config with multiple chains and wallet connectors
export const config = createConfig({
  chains: [mainnet, sepolia, polygon, optimism, arbitrum, base, bsc, openCampusChain],
  connectors: [
    metaMask(),
    injected(),
    coinbaseWallet({
      appName: 'mySchoolTree',
      appLogoUrl: '/mySchoolTree.png',
    }),
    walletConnect({
      projectId: import.meta.env.VITE_WC_PROJECT_ID || 'YOUR_PROJECT_ID',
      metadata: {
        name: 'mySchoolTree',
        description: 'mySchoolTree Web Application',
        url: typeof window !== 'undefined' ? window.location.host : 'https://mySchooltree.app',
        icons: [typeof window !== 'undefined' ? window.location.origin + '/mySchoolTree.png' : '/mySchoolTree.png']
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [openCampusChain.id]: http(),
  },
  // Enable callback when chain changes
  ssr: false,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
