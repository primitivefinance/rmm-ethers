import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'

import { log, setSilent } from '../utils/deploy'
import { PositionRendererManager } from '@primitivefi/rmm-sdk'

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

  if (chainId === 1) throw new Error('Do not use this in prod!')

  const renderer = rmm.connection.addresses.positionRenderer
  const factory = await hre.ethers.getContractFactory('PositionRenderer')

  const upgraded = await hre.upgrades.upgradeProxy(renderer, factory)
  log(`Upgraded the PositionRenderer ${upgraded.address}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
