import { http } from 'viem'
import { bsc } from 'viem/chains'
import { coinbaseWallet, injected, metaMask, walletConnect } from '@wagmi/connectors'
import { createConfig } from '@wagmi/core'

// WalletConnect Project ID - 需要从 https://cloud.walletconnect.com 获取
const projectId = 'YOUR_PROJECT_ID'

export const config = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
    metaMask(),
    ...(typeof window !== 'undefined'
      ? [
          walletConnect({
            projectId,
            showQrModal: true,
          }),
          coinbaseWallet({
            appName: 'Binance Alpha Trading',
          }),
        ]
      : []),
  ],
  transports: {
    [bsc.id]: http('https://bsc.blockrazor.xyz'),
  },
  ssr: true,
})

