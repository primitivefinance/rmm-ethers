import { ethers, deployRmm } from 'hardhat'
import chai from 'chai'
import { Contract, Signer } from 'ethers'

import { EthersRmm } from '../src/EthersRmm'
import { _connectToDeployment, _RmmDeploymentJSON } from '../src'
import { EngineAddress } from '../src/TransactableRmm'
import { AllocateOptions, Pool, PoolSides, RemoveOptions, SafeTransferOptions } from '@primitivefi/rmm-sdk'
import TestWeth from '@primitivefi/rmm-manager/artifacts/contracts/test/WETH9.sol/WETH9.json'

import { parsePercentage, parseWei, Time } from 'web3-units'
import { Position } from '../src/Position'

const { MaxUint256 } = ethers.constants

const { expect } = chai

const provider = ethers.provider

const connectToDeployment = async (deployment: _RmmDeploymentJSON, signer: Signer) =>
  EthersRmm._from(_connectToDeployment(deployment, signer))

const deployWeth = async (signer: Signer) => {
  const contract = await ethers.getContractFactory(TestWeth.abi, TestWeth.bytecode, signer)
  const t = await contract.deploy()
  await t.deployed()
  return t
}

const deployTestERC20 = async (signer: Signer) => {
  const contract = await ethers.getContractFactory('ERC20')
  const t = await contract.deploy('test token', 't', 18)
  await t.deployed()
  return t
}

const getTokenMetadata = async (contract: Contract) => {
  return await Promise.all([contract.decimals(), contract.name(), contract.symbol()])
}

interface TokenLike {
  address: string
  decimals: string | number
  name?: string
  symbol?: string
}

describe('RMM Ethers', () => {
  let deployment: _RmmDeploymentJSON
  let deployer: Signer, signer1: Signer
  let rmm: EthersRmm
  let user0: string, user1: string
  let weth: Contract

  before(async () => {
    ;[deployer, signer1] = await ethers.getSigners()
    user0 = await deployer.getAddress()
    user1 = await signer1.getAddress()
    weth = await deployWeth(deployer)
    const wethAddress = weth.address
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
    let engine: EngineAddress,
      risky: Contract,
      stable: Contract,
      pool: Pool,
      factory: string,
      manager: string,
      riskyToken: TokenLike,
      stableToken: TokenLike,
      chainId: number

    beforeEach(async function () {
      factory = rmm.connection.addresses.primitiveFactory
      manager = rmm.connection.addresses.primitiveManager

      // deploy erc20s
      ;[risky, stable] = await Promise.all([deployTestERC20(deployer), deployTestERC20(deployer)])

      // mint and approve tokens for main user0
      await Promise.all([risky.approve(manager, MaxUint256), stable.approve(manager, MaxUint256)])
      await Promise.all([risky.mint(user0, parseWei('1000000').raw), stable.mint(user0, parseWei('1000000').raw)])

      // deploy engine
      ;({ engine } = await rmm.createEngine({ risky: risky.address, stable: stable.address }))

      // model pool entity
      const [riskyDecimals, riskyName, riskySymbol] = await getTokenMetadata(risky)
      const [stableDecimals, stableName, stableSymbol] = await getTokenMetadata(stable)
      riskyToken = { address: risky.address, decimals: riskyDecimals, name: riskyName, symbol: riskySymbol }
      stableToken = { address: stable.address, decimals: stableDecimals, name: stableName, symbol: stableSymbol }
      chainId = await deployer.getChainId()

      const refPrice = 10
      const calibration = {
        strike: parseWei(10, stableDecimals).toString(),
        sigma: parsePercentage(1).toString(),
        maturity: (Time.now + Time.YearInSeconds).toString(),
        gamma: parsePercentage(1 - 0.01).toString(),
        lastTimestamp: Time.now.toString(),
      }

      pool = Pool.fromReferencePrice(refPrice, factory, riskyToken, stableToken, calibration, chainId)

      const options: AllocateOptions = {
        createPool: true,
        fromMargin: false,
        slippageTolerance: parsePercentage(0.01),
        delRisky: pool.reserveRisky,
        delStable: pool.reserveStable.add(1),
        delLiquidity: pool.liquidity,
        recipient: user0,
      }
      await rmm.createPool({ pool, options })
    })

    it('creates a pool', async function () {
      const refPrice = 10
      const calibration = {
        strike: parseWei(10, +stableToken.decimals).toString(),
        sigma: parsePercentage(1).toString(),
        maturity: (Time.now + Time.YearInSeconds + 100).toString(), // for creating new pool
        gamma: parsePercentage(1 - 0.01).toString(),
        lastTimestamp: Time.now.toString(),
      }
      const createPool = Pool.fromReferencePrice(refPrice, factory, riskyToken, stableToken, calibration, chainId)

      const options: AllocateOptions = {
        createPool: true,
        fromMargin: false,
        slippageTolerance: parsePercentage(0.01),
        delRisky: createPool.reserveRisky,
        delStable: createPool.reserveStable.add(1),
        delLiquidity: createPool.liquidity,
        recipient: user0,
      }

      const details = await rmm.createPool({ pool: createPool, options })
      expect(details.params.pool.poolId).to.be.equal(createPool.poolId)
    })

    it('allocates liquidity to a pool', async function () {
      const standard = { fromMargin: false, slippageTolerance: parsePercentage(0.01), recipient: user0 }

      const refreshed = await rmm.getPool(pool.poolId)

      const delLiquidity = parseWei(1)
      const amounts = refreshed.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

      const options: AllocateOptions = {
        delRisky: amounts.delRisky,
        delStable: amounts.delStable,
        delLiquidity: delLiquidity,
        createPool: false,
        ...standard,
      }

      const details = await rmm.allocate({ pool: refreshed, options })
      expect(details.params.pool.poolId).to.be.equal(pool.poolId)
      expect(details.newPosition.equals(new Position(pool, options.delLiquidity))).to.be.true
    })

    it('removes liquidity from a pool', async function () {
      const standard = { toMargin: true, fromMargin: false, slippageTolerance: parsePercentage(0.01), recipient: user0 }

      // remove liquidity
      const balance = await rmm.getLiquidityBalance(pool.poolId, user0)
      const amountToRemove = balance.mul(50).div(100)
      const updatedBalance = balance.sub(amountToRemove)

      const { delRisky, delStable } = pool.liquidityQuote(amountToRemove, PoolSides.RMM_LP)

      const options: RemoveOptions = {
        delRisky: delRisky,
        delStable: delStable,
        expectedRisky: delRisky,
        expectedStable: delStable,
        delLiquidity: amountToRemove,
        ...standard,
      }

      const details = await rmm.remove({ pool: pool, options })
      expect(details.params.pool.poolId).to.be.equal(pool.poolId)
      expect(details.newPosition.equals(new Position(pool, updatedBalance))).to.be.true
    })

    it('transfers liquidity', async function () {
      const balance = await rmm.getLiquidityBalance(pool.poolId, user0)
      const amount = balance.mul(50).div(100)
      const options: SafeTransferOptions = {
        sender: user0,
        recipient: user1,
        amount,
        id: pool.poolId,
      }
      const updatedBalance = balance.sub(amount)
      await rmm.safeTransfer({ options })
      expect((await rmm.getLiquidityBalance(pool.poolId, user1)).raw._hex).to.be.equal(amount.raw._hex)
      expect((await rmm.getLiquidityBalance(pool.poolId, user0)).raw._hex).to.be.equal(updatedBalance.raw._hex)
    })
  })
})
