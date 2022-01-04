import { ethers, deployRmm } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { TestToken__factory } from '../typechain'
import { Signer } from 'ethers'

import { EthersRmm } from '../src/EthersRmm'
import { _connectToDeployment, _RmmDeploymentJSON } from '../src'

chai.use(solidity)
const { expect } = chai

const provider = ethers.provider

const connectToDeployment = async (deployment: _RmmDeploymentJSON, signer: Signer) =>
  EthersRmm._from(_connectToDeployment(deployment, signer))

const deployTestERC20 = async (signer: Signer) => {
  const contract = await ethers.getContractFactory('TestToken')
  const t = await contract.deploy()
  await t.deployed()
  return t
}

describe('RMM Ethers', () => {
  let deployment: _RmmDeploymentJSON
  let deployer: Signer
  let rmm: EthersRmm

  before(async () => {
    const [deployer] = await ethers.getSigners()
    deployment = await deployRmm(deployer)

    rmm = await connectToDeployment(deployment, deployer)
    expect(rmm).to.be.instanceOf(EthersRmm)
  })

  describe('deploy', async () => {
    it('deploys engine', async function () {
      const [token0, token1] = await Promise.all([deployTestERC20(deployer), deployTestERC20(deployer)])

      const engine = await rmm.deploy({ risky: token0.address, stable: token1.address })
      expect(engine).to.not.be.undefined
    })
  })
})
