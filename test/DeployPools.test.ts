import { Contract, Signer } from 'ethers'
import hre, { deployRmm, ethers } from 'hardhat'
import { EthersRmm, _connectToDeployment, _RmmDeploymentJSON } from '../src'
import TestWeth from '@primitivefi/rmm-manager/artifacts/contracts/test/WETH9.sol/WETH9.json'
import { PoolDeployer } from '../utils/poolDeployer'
import { deployPools, POOL_CONFIG_TO_DEPLOY, POOL_DEPLOYMENTS_SAVE } from '../scripts/deploy-pools'

const connectToDeployment = async (deployment: _RmmDeploymentJSON, signer: Signer) =>
  EthersRmm._from(_connectToDeployment(deployment, signer))

const deployWeth = async (signer: Signer) => {
  const contract = await ethers.getContractFactory(TestWeth.abi, TestWeth.bytecode, signer)
  const t = await contract.deploy()
  await t.deployed()
  return t
}

describe('Deploy pools', function () {
  /* let deployment: _RmmDeploymentJSON
  let rmm: EthersRmm
  let user0: string, user1: string
  let weth: Contract
  let deployer: PoolDeployer
  let signer: Signer, signer1: Signer

  before(async () => {
    ;[signer, signer1] = await ethers.getSigners()
    user0 = await signer.getAddress()
    user1 = await signer1.getAddress()
    weth = await deployWeth(signer)
    const wethAddress = weth.address
    deployment = await deployRmm(signer, wethAddress)

    rmm = await connectToDeployment(deployment, signer)
    const chainId = rmm.connection.chainId

    if (chainId === 1) throw new Error('Do not use this in prod!')

    deployer = new PoolDeployer(chainId, POOL_DEPLOYMENTS_SAVE, POOL_CONFIG_TO_DEPLOY, rmm)
  })

  it('deploys the protocol and its pools', async function () {
    await deployPools(deployer)
  }) */
})
