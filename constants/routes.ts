export const SWAP_ROUTES = [
  {
    method: '0xdad12b6c',
    amountPath: [2],
    fromTokenPath: [1],
    toTokenPath: [3],
    abi: [
      {
        name: 'proxySwap',
        type: 'function',
        inputs: [
          { name: 'router', type: 'address' },
          { name: 'fromTokenWithFee', type: 'uint256' },
          { name: 'fromAmt', type: 'uint256' },
          { name: 'toTokenWithFee', type: 'uint256' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
  },
  {
    method: '0xe5e8894b',
    amountPath: [2],
    fromTokenPath: [1],
    toTokenPath: [3],
    abi: [
      {
        name: 'proxySwapV2',
        type: 'function',
        inputs: [
          { name: 'router', type: 'address' },
          { name: 'fromTokenWithFee', type: 'uint256' },
          { name: 'fromAmt', type: 'uint256' },
          { name: 'toTokenWithFee', type: 'uint256' },
          { name: 'minReturnAmt', type: 'uint256' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
  },
  {
    method: '0xa03de6a9',
    amountPath: [1],
    fromTokenPath: [0],
    toTokenPath: [2],
    abi: [
      {
        inputs: [
          { internalType: 'uint256', name: 'fromTokenWithFee', type: 'uint256' },
          { internalType: 'uint256', name: 'fromAmt', type: 'uint256' },
          { internalType: 'uint256', name: 'toTokenWithFee', type: 'uint256' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        name: 'callOneInch',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
    ],
  },
  {
    method: '0xdadb693f',
    amountPath: [1],
    fromTokenPath: [0],
    toTokenPath: [2],
    abi: [
      {
        inputs: [
          { internalType: 'uint256', name: 'fromTokenWithFee', type: 'uint256' },
          { internalType: 'uint256', name: 'fromAmt', type: 'uint256' },
          { internalType: 'uint256', name: 'toTokenWithFee', type: 'uint256' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        name: 'callRango',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
    ],
  },
  {
    method: '0x849ce572',
    amountPath: [1],
    fromTokenPath: [0],
    toTokenPath: [2],
    abi: [
      {
        inputs: [
          { internalType: 'uint256', name: 'fromTokenWithFee', type: 'uint256' },
          { internalType: 'uint256', name: 'fromAmt', type: 'uint256' },
          { internalType: 'uint256', name: 'toTokenWithFee', type: 'uint256' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        name: 'callLiFi',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
    ],
  },
  {
    method: '0x3166c37c',
    amountPath: [1],
    fromTokenPath: [0],
    toTokenPath: [2],
    abi: [
      {
        inputs: [
          { internalType: 'uint256', name: 'fromTokenWithFee', type: 'uint256' },
          { internalType: 'uint256', name: 'fromAmt', type: 'uint256' },
          { internalType: 'uint256', name: 'toTokenWithFee', type: 'uint256' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        name: 'callQuant',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
    ],
  },
]
