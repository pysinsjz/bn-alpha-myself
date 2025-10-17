/**
 * 币安 Alpha 交易使用示例
 * 
 * 这个文件展示了如何使用币安 Alpha 交易功能
 */

import { 
  createBinanceAlphaTradingService, 
  extractAuthFromCurl,
  parseOrderFromCurl 
} from '@/lib/binance-alpha-trading'
import type { BinanceAlphaToken } from '@/types/alpha'

// 示例：从 curl 请求中提取认证信息
const exampleCurlRequest = `curl --location 'https://www.binance.com/bapi/asset/v1/private/alpha-trade/oto-order/place' \\
--header 'clienttype: web' \\
--header 'csrftoken: 507db50cbefc258aa45e79b3a1a89402' \\
--header 'Cookie: __BNC_USER_DEVICE_ID__={"bcb06544d3098d313686322727578425":{"date":1649671184472,"value":"1649671184511TIhXqiRYlm8qImyTPrE"}}; bnc-uuid=03a32736-f947-455a-acc6-af3deea3131b; userPreferredCurrency=USD_USD; BNC_FV_KEY=31bc237c4c96a03cbaf7fd08316c8cb613e4a7d0; lang=zh-CN; se_gd=FJaCQBlkNRRGwgQwQBBhgZZHgExIPBWVlcC9RV05lJXUQGlNWVwI1; se_gsd=RTMhGhVmNjAmDQktITUhJCkEGwlQAQobVFRKUVxbV1JRJ1NT1; theme=dark; ref=UC0SX37A; se_sd=1gKGxQlkMRRWQ1TIZGhIgZZBwVRZTEWVloINbVE9FFVUwEVNWVAH1; OptanonAlertBoxClosed=2025-10-10T13:52:57.004Z; currentAccount=; logined=y; BNC-Location=CN; _gcl_au=1.1.1429523166.1760104464; _uetvid=a20e3ce0a5e011f0a5eafb397b86ebb6; _gid=GA1.2.550335395.1760446761; aws-waf-token=87f38b27-af50-4965-beff-46cf014535a8:EQoAeDtaYHjfAAAA:0yKhQA78v+LtrhxAfGP+vDyYZe0H+uQBP44PN+9/tWeqwSfa0qu+LhTG9E+Hpn2bY7Jr+50VByTnzKGPGNKdvNLldklP7uFKoSORFDAFST0Z4gY8OWG+liPaXS5nJp7O74sZsgbSxmh/xjem5owwhBBw/MCdVtqssNXjlmU4VFqWasLQADgPmVCQ27IkUkFRHlU=; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2259787241%22%2C%22first_id%22%3A%22195333b61c4581-089d0a9aef36da-1e525636-2104200-195333b61c532ab%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E8%87%AA%E7%84%B6%E6%90%9C%E7%B4%A2%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC%22%2C%22%24latest_referrer%22%3A%22https%3A%2F%2Fwww.google.com.hk%2F%22%2C%22aws_waf_referrer%22%3A%22%7B%5C%22referrer%5C%22%3A%5C%22%5C%22%7D%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk1MzMzYjYxYzQ1ODEtMDg5ZDBhOWFlZjM2ZGEtMWU1MjU2MzYtMjEwNDIwMC0xOTUzMzNiNjFjNTMyYWIiLCIkaWRlbnRpdHlfbG9naW5faWQiOiI1OTc4NzI0MSJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%2259787241%22%7D%2C%22%24device_id%22%3A%22195988672af31aa-0b8ced001488f6-1b525636-2104200-195988672b038c2%22%7D; BNC_FV_KEY_T=101-W%2FNdrV1Mr9ZxIGEIL0Yx4Yd4%2BEDaTYw5Hk5dqOp32amdgBqkfOsKR%2Bxj57d057xCvJbFiYUjVH1Un0LMSAV13Q%3D%3D-gRJLqeAnwP3W2baCMatJHA%3D%3D-99; BNC_FV_KEY_EXPIRE=1760562522548; _gcl_aw=GCL.1760540925.Cj0KCQjwjL3HBhCgARIsAPUg7a47ZEsV9WmiO4HJt6bWm889mEE6mq9U8zp5pg_0eXTWBGl8pqlSEmMaAh7FEALw_wcB; _gcl_gs=2.1.k1$i1760540908$u181127351; _gac_UA-162512367-1=1.1760540927.Cj0KCQjwjL3HBhCgARIsAPUg7a47ZEsV9WmiO4HJt6bWm889mEE6mq9U8zp5pg_0eXTWBGl8pqlSEmMaAh7FEALw_wcB; s9r1=24CE6FE99E69AB298F48FA9595C7795F; r20t=web.859A453C4D9F98203503B180E657694C; r30t=1; cr00=331C1D12A01B003A47CFB7089C0D7CF1; d1og=web.59787241.599D69F7AE069C83F7B71302485C0819; r2o1=web.59787241.BADA8052C8EED46F158F4454F6A2D4E4; f30l=web.59787241.2B542A57D8A2AB5B8FEA386E1A366EDB; p20t=web.59787241.640255BEC3E3387422F571248BF21B7C; _ga_3WP50LGEEC=GS2.1.s1760540925$o7$g1$t1760541023$j22$l0$h0; _ga=GA1.2.631488353.1742020661; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Oct+15+2025+23%3A29%3A01+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=c3c5d781-1da9-4026-b516-eff35c13f810&interactionCount=2&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0004%3A1%2CC0002%3A1&AwaitingReconsent=false&intType=1&geolocation=SG%3B' \\
--header 'Content-Type: application/json' \\
--data '{
    "baseAsset": "ALPHA_382",
    "quoteAsset": "USDT",
    "workingSide": "BUY",
    "workingPrice": 0.07,
    "workingQuantity": 14.28,
    "paymentDetails": [
        {
            "amount": "1",
            "paymentWalletType": "CARD"
        }
    ],
    "pendingPrice": 0.07
}'`

/**
 * 示例 1: 提取认证信息
 */
export function extractAuthExample() {
  try {
    const { csrfToken, cookies } = extractAuthFromCurl(exampleCurlRequest)
    
    console.log('提取的认证信息:')
    console.log('CSRF Token:', csrfToken)
    console.log('Cookies:', cookies.substring(0, 100) + '...')
    
    return { csrfToken, cookies }
  } catch (error) {
    console.error('提取认证信息失败:', error)
    return null
  }
}

/**
 * 示例 2: 解析订单参数
 */
export function parseOrderExample() {
  try {
    const orderData = parseOrderFromCurl(exampleCurlRequest)
    
    console.log('解析的订单数据:')
    console.log(JSON.stringify(orderData, null, 2))
    
    return orderData
  } catch (error) {
    console.error('解析订单数据失败:', error)
    return null
  }
}

/**
 * 示例 3: 创建交易服务并下单
 */
export async function tradingExample() {
  try {
    // 1. 提取认证信息
    const auth = extractAuthExample()
    if (!auth) {
      throw new Error('无法提取认证信息')
    }

    // 2. 创建交易服务
    const tradingService = createBinanceAlphaTradingService(auth.csrfToken, auth.cookies)
    
    // 3. 创建示例 Alpha 代币
    const alphaToken: BinanceAlphaToken = {
      tokenId: '382',
      chainId: '56',
      chainIconUrl: '',
      chainName: 'BSC',
      contractAddress: '0x1234567890123456789012345678901234567890' as any,
      name: 'Example Token',
      symbol: 'EXAMPLE',
      iconUrl: '',
      price: '0.07',
      percentChange24h: '0',
      volume24h: '0',
      marketCap: '0',
      fdv: '0',
      liquidity: '0',
      totalSupply: '0',
      circulatingSupply: '0',
      holders: '0',
      decimals: 18,
      listingCex: false,
      hotTag: false,
      cexCoinName: 'EXAMPLE',
      canTransfer: true,
      denomination: 18,
      offline: false,
      tradeDecimal: 18,
      alphaId: 'ALPHA_382',
      offsell: false,
      priceHigh24h: '0',
      priceLow24h: '0',
      onlineTge: false,
      onlineAirdrop: false,
    }

    // 4. 挂买单
    console.log('正在挂买单...')
    const buyResult = await tradingService.placeBuyOrder({
      token: alphaToken,
      quoteAsset: 'USDT',
      price: 0.07,
      quantity: 14.28,
      paymentAmount: 1,
      paymentType: 'CARD'
    })
    
    console.log('买单结果:', buyResult)

    // 5. 查询订单
    console.log('正在查询订单...')
    const orders = await tradingService.queryOrders({
      baseAsset: 'ALPHA_382',
      limit: 10
    })
    
    console.log('订单列表:', orders)

    return { buyResult, orders }
  } catch (error) {
    console.error('交易示例失败:', error)
    throw error
  }
}

/**
 * 示例 4: 使用 React Hook
 */
export function reactHookExample() {
  // 在 React 组件中使用
  /*
  import { useBinanceAlphaTrading } from '@/hooks/use-binance-alpha-trading'

  function TradingComponent() {
    const {
      isAuthenticated,
      isLoading,
      error,
      setAuthFromCurl,
      placeBuyOrder,
      placeSellOrder,
      queryOrders,
      cancelOrder
    } = useBinanceAlphaTrading()

    const handleAuth = () => {
      setAuthFromCurl(exampleCurlRequest)
    }

    const handleBuyOrder = async () => {
      try {
        const result = await placeBuyOrder({
          token: alphaToken,
          quoteAsset: 'USDT',
          price: 0.07,
          quantity: 14.28,
          paymentAmount: 1,
          paymentType: 'CARD'
        })
        console.log('买单成功:', result)
      } catch (error) {
        console.error('买单失败:', error)
      }
    }

    return (
      <div>
        {!isAuthenticated ? (
          <button onClick={handleAuth}>设置认证</button>
        ) : (
          <button onClick={handleBuyOrder}>挂买单</button>
        )}
      </div>
    )
  }
  */
}

// 运行示例
if (typeof window === 'undefined') {
  // 在 Node.js 环境中运行
  console.log('=== 币安 Alpha 交易示例 ===')
  
  console.log('\n1. 提取认证信息:')
  extractAuthExample()
  
  console.log('\n2. 解析订单数据:')
  parseOrderExample()
  
  console.log('\n3. 交易示例 (需要有效的认证信息):')
  // tradingExample().catch(console.error)
}
