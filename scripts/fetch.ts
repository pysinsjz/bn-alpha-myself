import fsp from 'node:fs/promises'
import c from 'picocolors'
import { getAlphaTokens } from '@/lib/api'

async function run() {
  const tokens = await getAlphaTokens()
  await fsp.writeFile(
    'constants/tokens.ts',
    `import type { AlphaTokenInfo } from '@/types'

const tokens: AlphaTokenInfo[] = [
${tokens
  .map(
    item => `  {
    chainId: '${item.chainId}',
    contractAddress: '${item.contractAddress}',
    name: \`${item.name}\`,
    symbol: '${item.symbol}',
    decimals: ${item.decimals},
  },`,
  )
  .join('\n')}
]

export default tokens
`,
  )
  console.log(c.green('Tokens fetched successfully!'))
}

run()
