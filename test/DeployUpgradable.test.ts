import hre, { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { _connectToDeployment, _RmmDeploymentJSON } from '../src'
import { PositionRendererManager } from '@primitivefi/rmm-sdk'

describe('Deploy pools', function () {
  let deployer: SignerWithAddress, signer: SignerWithAddress
  before(async function () {
    ;[deployer, signer] = await ethers.getSigners()
  })

  it('deploys upgradable contract', async function () {
    const factory = await ethers.getContractFactory('PositionRenderer', deployer)
    console.log(`Deploying PositionRenderer ...`)
    const contract = await hre.upgrades.deployProxy(factory, [])
    console.log(contract.address)
  })
})
