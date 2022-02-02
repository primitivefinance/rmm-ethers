import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'

import { log, setSilent } from '../utils/deploy'
import ProxyAdminArtifact from '@openzeppelin/contracts/build/contracts/ProxyAdmin.json'
import { PositionRendererManager } from '@primitivefi/rmm-sdk'
import { ProxyAdmin } from '../typechain/ProxyAdmin'

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

  const renderer = await PositionRendererManager.getFactory(signer).deploy()
  const admin = new hre.ethers.Contract(
    rmm.connection.addresses.positionRendererProxyAdmin,
    ProxyAdminArtifact.abi,
    signer,
  ) as ProxyAdmin

  const upgraded = await admin.upgrade(
    rmm.connection.addresses.positionRendererTransparentUpgradeableProxy,
    renderer.address,
  )
  const receipt = await upgraded.wait()
  log(`Upgraded the PositionRenderer`, receipt, receipt.events?.[0]?.topics)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
