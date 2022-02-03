import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'

import { log, setSilent } from '../utils/deploy'

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

  const name = 'USD Coin'
  const symbol = 'USDC'
  const decimals = 6
  const factory = await hre.ethers.getContractFactory('ERC20')
  const c = await factory.deploy(name, symbol, decimals)
  const t = await c.deployed()
  log(`Deployed token: ${symbol} to ${t.address}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
