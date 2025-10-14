import { http } from 'viem'
import { bsc } from 'viem/chains'
import { coinbaseWallet, injected, metaMask } from '@wagmi/connectors'
import { createConfig } from '@wagmi/core'

// 如果需要使用 WalletConnect，请到 https://cloud.walletconnect.com 注册获取 Project ID
// 然后取消下面的注释并填入 Project ID
import { walletConnect } from '@wagmi/connectors'
const projectId = '0b25f98ed810dd054dbe18492163d24f'

export const config = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
    metaMask(),
    ...(typeof window !== 'undefined'
      ? [
          // 暂时禁用 WalletConnect，需要配置 Project ID 后才能使用
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

