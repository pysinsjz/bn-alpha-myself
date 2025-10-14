import type { Wallet } from '@/types'
import { atomWithStorage } from 'jotai/utils'

export const walletsAtom = atomWithStorage<Wallet[]>('walletList', [])
