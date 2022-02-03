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

  const risky = '0xc778417E063141139Fce010982780140Aa0cD5Ab' // rinkeby:WETH: FIX
  const stable = '0x522064c1EafFEd8617BE64137f66A71D6C5c9aA3' // rinkeby:USDC: FIX

  //const risky = '0x60e7e6D548F09e7EcdbE7c58824CBb060a62F367'
  //const stable = '0xdC30DD02612C8AC1c0782D594B2c28F87ED40e22'

  //const risky = '0xcE5497AC20f3C505e74ECF63FD22Bf7e3914Cb4A' //rinkeby rbn

  const details = await deployEngine(rmm, risky, stable)
  log(`Deployed engine: ${details.address}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
