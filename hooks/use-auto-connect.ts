import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'

/**
 * 自动重连钱包的 Hook
 */
export function useAutoConnect() {
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  useEffect(() => {
    const autoConnect = async () => {
      // 如果已经连接，不需要重连
      if (isConnected) {
        return
      }

      // 检查是否有保存的连接信息
      const lastConnectedWallet = localStorage.getItem('lastConnectedWallet')
      if (!lastConnectedWallet) {
        return
      }

      setIsAutoConnecting(true)

      try {
        // 查找对应的连接器
        const connector = connectors.find(c => c.id === lastConnectedWallet)
        if (connector) {
          // 检查连接器是否可用
          try {
            const account = await (connector.getAccount as () => Promise<any>)()
            if (account) {
              console.log('自动重连钱包:', connector.name)
              await connect({ connector })
            } else {
              // 如果连接器不可用，清除保存的信息
              localStorage.removeItem('lastConnectedWallet')
            }
          } catch (connectorError) {
            console.log('连接器检查失败:', connectorError)
            // 清除无效的连接信息
            localStorage.removeItem('lastConnectedWallet')
          }
        } else {
          // 如果找不到对应的连接器，清除保存的信息
          localStorage.removeItem('lastConnectedWallet')
        }
      } catch (error) {
        console.log('自动重连失败:', error)
        // 清除无效的连接信息
        localStorage.removeItem('lastConnectedWallet')
      } finally {
        setIsAutoConnecting(false)
      }
    }

    // 延迟执行自动连接，确保页面完全加载
    const timer = setTimeout(autoConnect, 1500)
    return () => clearTimeout(timer)
  }, [isConnected, connectors, connect])

  return { isAutoConnecting }
}

/**
 * 保存钱包连接信息
 */
export function saveWalletConnection(connectorId: string) {
  localStorage.setItem('lastConnectedWallet', connectorId)
}

/**
 * 清除钱包连接信息
 */
export function clearWalletConnection() {
  localStorage.removeItem('lastConnectedWallet')
}

/**
 * 获取最后连接的钱包信息
 */
export function getLastConnectedWallet(): string | null {
  return localStorage.getItem('lastConnectedWallet')
}
