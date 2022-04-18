import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'

import { log, setSilent } from '../utils/deploy'
import { deployEngine } from '../utils/deployEngine'

type Signers = Signer | DefenderRelaySigner

export async function main() {
  setSilent(false)

  const signer: Signers = await hre.run('useSigner')
  const from = await signer.getAddress()
  log(`Using signer: ${from}`)

  const rmm = await hre.connect(signer)

  log(`Connected to RMM: `, rmm.connection.addresses)

  const chainId = rmm.connection.chainId
  log(`Using chainId: ${chainId}`)

  if (chainId !== 1) throw new Error('Use this on mainnet!')

  const risky = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // mainnet WETH
  const stable = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // mainnet USDC

  await deployEngine(rmm, risky, stable)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
