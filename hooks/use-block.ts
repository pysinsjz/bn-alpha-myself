import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useLocalStorage } from '@/hooks/use-local-storage'

interface BlockCache {
  timestamp: number
  blockNumber: number
}

export function useBlockNumber(timestamp: number) {
  const [blockCache, setBlockCache] = useLocalStorage<BlockCache | null>('blockCache', null)
  return useQuery({
    queryKey: ['blocks', timestamp],
    queryFn: async () => {
      if (blockCache?.timestamp === timestamp) {
        return blockCache.blockNumber
      }
      const response = await axios.get('/api/blocks', {
        params: { timestamp },
      })
      setBlockCache({
        timestamp,
        blockNumber: response.data,
      })
      return response.data
    },
    enabled: !Number.isNaN(timestamp),
  })
}
