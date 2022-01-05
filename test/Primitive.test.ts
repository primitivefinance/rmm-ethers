import hre, { ethers, deployRmm } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, Signer } from 'ethers'

import { EthersRmm } from '../src/EthersRmm'
import { _connectToDeployment, _RmmDeploymentJSON } from '../src'
import { EngineAddress } from '../src/TransactableRmm'
import { AllocateOptions, parseCalibration, Pool, PoolSides } from '@primitivefi/rmm-sdk'
import { parsePercentage, parseWei, Time } from 'web3-units'
import { Position } from '../src/Position'

const { MaxUint256 } = ethers.constants

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

const getTokenMetadata = async (contract: Contract) => {
  return await Promise.all([contract.decimals(), contract.name(), contract.symbol()])
}

describe('RMM Ethers', () => {
  let deployment: _RmmDeploymentJSON
  let deployer: Signer
  let rmm: EthersRmm
  let user: string

  before(async () => {
    ;[deployer] = await ethers.getSigners()
    user = await deployer.getAddress()
    let wethAddress = await deployer.getAddress()
    deployment = await deployRmm(deployer, wethAddress)

    rmm = await connectToDeployment(deployment, deployer)
    expect(rmm).to.be.instanceOf(EthersRmm)
  })

  describe('deploy', async () => {
    it('deploys engine', async function () {
      const [token0, token1] = await Promise.all([deployTestERC20(deployer), deployTestERC20(deployer)])

      const engine = await rmm.createEngine({ risky: token0.address, stable: token1.address })
      expect(engine).to.not.be.undefined
    })
  })

  describe('adjust positions', async () => {
    let engine: EngineAddress, risky: Contract, stable: Contract, pool: Pool, factory: string, manager: string

    beforeEach(async function () {
      factory = rmm.connection.addresses.primitiveFactory
      manager = rmm.connection.addresses.primitiveManager

      // deploy erc20s
      ;[risky, stable] = await Promise.all([deployTestERC20(deployer), deployTestERC20(deployer)])

      // mint and approve tokens for main user
      await Promise.all([risky.approve(manager, MaxUint256), stable.approve(manager, MaxUint256)])
      await Promise.all([risky.mint(user, parseWei('1000000').raw), stable.mint(user, parseWei('1000000').raw)])

      // deploy engine
      ;({ engine } = await rmm.createEngine({ risky: risky.address, stable: stable.address }))

      // model pool entity
      const [riskyDecimals, riskyName, riskySymbol] = await getTokenMetadata(risky)
      const [stableDecimals, stableName, stableSymbol] = await getTokenMetadata(stable)
      const riskyToken = { address: risky.address, decimals: riskyDecimals, name: riskyName, symbol: riskySymbol }
      const stableToken = { address: stable.address, decimals: stableDecimals, name: stableName, symbol: stableSymbol }

      const refPrice = 10
      const chainId = await deployer.getChainId()

      const calibration = {
        strike: parseWei(10, stableDecimals).toString(),
        sigma: parsePercentage(1).toString(),
        maturity: (Time.now + Time.YearInSeconds).toString(),
        gamma: parsePercentage(1 - 0.01).toString(),
        lastTimestamp: Time.now.toString(),
      }

      pool = Pool.fromReferencePrice(refPrice, factory, riskyToken, stableToken, calibration, chainId)
    })

    it('creates a pool', async function () {
      const options: AllocateOptions = {
        createPool: true,
        fromMargin: false,
        slippageTolerance: parsePercentage(0.01),
        delRisky: pool.reserveRisky,
        delStable: pool.reserveStable.add(1),
        delLiquidity: pool.liquidity,
        recipient: user,
      }

      const details = await rmm.createPool({ pool, options })
      expect(details.params.pool.poolId).to.be.equal(pool.poolId)
    })

    it('allocates liquidity to a pool', async function () {
      const standard = { fromMargin: false, slippageTolerance: parsePercentage(0.01), recipient: user }
      const create = { createPool: true }

      const createOptions: AllocateOptions = {
        delRisky: pool.reserveRisky,
        delStable: pool.reserveStable.add(1),
        delLiquidity: pool.liquidity,
        ...create,
        ...standard,
      }

      await rmm.createPool({ pool, options: createOptions })

      const newPool = await rmm.getPool(pool.poolId)

      const delLiquidity = parseWei(1)
      const amounts = newPool.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

      const options: AllocateOptions = {
        delRisky: amounts.delRisky,
        delStable: amounts.delStable,
        delLiquidity: delLiquidity,
        createPool: false,
        ...standard,
      }

      const details = await rmm.allocate({ pool: newPool, options })
      expect(details.params.pool.poolId).to.be.equal(pool.poolId)
      expect(details.newPosition.equals(new Position(pool, options.delLiquidity))).to.be.true
    })
  })
})
