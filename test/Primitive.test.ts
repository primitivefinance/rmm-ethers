import hre, { deployRmm } from 'hardhat'
import chai from 'chai'
import { ethers } from 'hardhat'
import { BigNumber, Contract, Signer, utils } from 'ethers'
import { Base64 } from 'js-base64'
import { Engine } from '@primitivefi/rmm-sdk'
import { parsePercentage, parseWei, Time } from 'web3-units'

import { EthersRmm } from '../src/EthersRmm'
import { _connectToDeployment, _RmmDeploymentJSON } from '../src'
import { EngineAddress } from '../src/types/transactable'
import {
  AllocateOptions,
  Pool,
  PoolSides,
  RemoveOptions,
  SafeTransferOptions,
  Swaps,
  weiToWei,
} from '@primitivefi/rmm-sdk'
import PrimitiveManagerArtifact from '@primitivefi/rmm-manager/artifacts/contracts/PrimitiveManager.sol/PrimitiveManager.json'

import { Position } from '../src/Position'

const { MaxUint256 } = ethers.constants
const { expect } = chai

const connectToDeployment = (deployment: _RmmDeploymentJSON, signer: Signer) =>
  EthersRmm._from(_connectToDeployment(deployment, signer))

const deployWeth = async (signer: Signer) => {
  const contract = await ethers.getContractFactory('WETH9', signer)
  const t = await contract.deploy()
  await t.deployed()
  return t
}

const deployTestERC20 = async (signer: Signer) => {
  const contract = await ethers.getContractFactory('MintableERC20', signer)
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

type Metadata = {
  name: string
  image: string
  license: string
  creator: string
  description: string
  properties: {
    factory: string
    riskyName: string
    riskyAddress: string
    riskName: string
    riskySymbol: string
    riskyDecimals: number
    stableAddress: string
    stableName: string
    stableSymbol: string
    stableDecimals: number
    invariant: string
    strike: string
    sigma: string
    maturity: string
    lastTimestamp: string
    gamma: string
    reserveRisky: string
    reserveStable: string
    liquidity: string
    blockTimestamp: string
    cumulativeRisky: string
    cumulativeStable: string
    cumulativeLiquidity: string
    chainId: number
  }
}

describe('RMM Ethers', function () {
  let deployment: _RmmDeploymentJSON
  let deployer: Signer, signer1: Signer
  let rmm: EthersRmm
  let user0: string, user1: string
  let weth: Contract
  let lastTimestamp: string

  before(async function () {
    ;[deployer, signer1] = await ethers.getSigners()
    user0 = await deployer.getAddress()
    user1 = await signer1.getAddress()
    weth = await deployWeth(deployer)
    const wethAddress = weth.address
    deployment = await deployRmm(deployer, wethAddress)

    rmm = await connectToDeployment(deployment, deployer)
    expect(rmm).to.be.instanceOf(EthersRmm)
  })

  describe('deploy', function () {
    it('deploys engine', async function () {
      const [token0, token1] = await Promise.all([deployTestERC20(deployer), deployTestERC20(deployer)])

      const engine = await rmm.createEngine({ risky: token0.address, stable: token1.address })
      expect(engine).to.not.be.undefined
      expect(engine.hash).to.not.be.undefined
      expect(engine.engine).to.not.be.undefined
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
      const [tx] = await Promise.all([risky.approve(manager, MaxUint256), stable.approve(manager, MaxUint256)])
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
        lastTimestamp,
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
      const details = await rmm.createPool({ pool, options })

      if (details.hash) {
        const receipt = await ethers.provider.waitForTransaction(details.hash)
        const block = await ethers.provider.getBlock(receipt.blockNumber)
        lastTimestamp = block.timestamp.toString()
      }
    })

    it('creates a pool', async function () {
      const refPrice = 10
      const calibration = {
        strike: parseWei(10, +stableToken.decimals).toString(),
        sigma: parsePercentage(1).toString(),
        maturity: (Time.now + Time.YearInSeconds + 100).toString(), // for creating new pool
        gamma: parsePercentage(1 - 0.01).toString(),
        lastTimestamp,
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
      expect(details.hash).to.not.be.undefined
      expect(
        Swaps.getReportedPriceOfRisky(
          createPool.reserveRisky.float,
          createPool.strike.float,
          createPool.sigma.float,
          createPool.tau.years,
        ),
      ).to.be.within(refPrice - 0.01, refPrice + 0.01)
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
      const balance = await rmm.getLiquidityBalance(pool.poolId, user0)
      expect(details.params.pool.poolId).to.be.equal(pool.poolId)
      expect(details.newPosition.equals(new Position(pool, options.delLiquidity))).to.be.true
      expect(balance.sub(options.delLiquidity).raw.eq(balance.sub(details.newPosition.liquidity).raw)).to.be.true
      expect(details.hash).to.not.be.undefined
    })

    it('allocates liquidity to a pool then removes the exact amount', async function () {
      const standard = { fromMargin: false, slippageTolerance: parsePercentage(0.0), recipient: user0 }

      const refreshed = await rmm.getPool(pool.poolId)
      const [bfre0, bfre1] = await Promise.all([risky.balanceOf(user0), stable.balanceOf(user0)])

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

      const removeDefault = {
        toMargin: false,
        fromMargin: false,
        slippageTolerance: parsePercentage(0.0),
        recipient: user0,
      }

      // remove liquidity

      const postAllocatePool = await rmm.getPool(pool.poolId)
      const removeOptions: RemoveOptions = {
        delRisky: amounts.delRisky,
        delStable: amounts.delStable,
        additionalRisky: parseWei(0, amounts.delRisky.decimals),
        additionalStable: parseWei(0, amounts.delStable.decimals),
        delLiquidity: delLiquidity,
        ...removeDefault,
      }

      const removeDetails = await rmm.remove({ pool: postAllocatePool, options: removeOptions })

      const [aftr0, aftr1] = await Promise.all([risky.balanceOf(user0), stable.balanceOf(user0)])
      const [riskyDiff, stableDiff] = [
        BigNumber.from(aftr0).sub(bfre0).toString(),
        BigNumber.from(aftr1).sub(bfre1).toString(),
      ]
      expect(riskyDiff.toString()).to.deep.eq(0)
      expect(stableDiff.toString()).to.deep.eq(0)
      expect(bfre0.toString()).to.deep.eq(aftr0.toString())
      expect(bfre1.toString()).to.deep.eq(aftr1.toString())
    })

    it('gets the tokenURI (which should be validated with rendering it)', async function () {
      const res = await new ethers.Contract(pool.address, Engine.ABI, deployer).reserves(pool.poolId)
      const reserveRisky = res.reserveRisky
      const reserveStable = res.reserveStable
      const liquidity = res.liquidity

      const instance = new ethers.Contract(
        rmm.connection.addresses.primitiveManager,
        PrimitiveManagerArtifact.abi,
        deployer,
      )
      const uri = await instance.uri(pool.poolId)
      const [metadataFormat, encodedMetadata] = uri.split(',')
      expect(metadataFormat).to.be.equal('data:application/json;base64')
      const metadata: Metadata = JSON.parse(Base64.decode(encodedMetadata))
      console.log(Base64.decode(encodedMetadata))

      const riskySymbol = pool.risky.symbol
      const stableSymbol = pool.stable.symbol
      expect(metadata.name).to.be.equal(`Primitive RMM-01 LP ${riskySymbol}-${stableSymbol}`)

      const [imageFormat, encodedImage] = metadata.image.split(',')
      expect(imageFormat).to.be.equal('data:image/svg+xml;base64')
      expect(Base64.decode(encodedImage)).to.be.equal(
        '<svg width="512" height="512" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#000" d="M0 0h512v512H0z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M339.976 134.664h41.048L256 340.586 130.976 134.664h41.047V98H64.143L256 414 447.857 98H339.976v36.664Zm-38.759 0V98h-90.436v36.664h90.436Z" fill="#fff"/></svg>',
      )

      expect(metadata.license).to.be.equal('MIT')
      expect(metadata.creator).to.be.equal('primitive.eth')
      expect(metadata.description).to.be.equal('Concentrated liquidity tokens of a two-token AMM')

      expect(utils.getAddress(metadata.properties.factory)).to.be.equal(pool.factory)

      expect(utils.getAddress(metadata.properties.riskyAddress)).to.be.equal(pool.risky.address)
      expect(metadata.properties.riskyName).to.be.equal(pool.risky.name)
      expect(metadata.properties.riskySymbol).to.be.equal(pool.risky.symbol)
      expect(metadata.properties.riskyDecimals).to.be.equal(pool.risky.decimals.toString())

      expect(utils.getAddress(metadata.properties.stableAddress)).to.be.equal(pool.stable.address)
      expect(metadata.properties.stableName).to.be.equal(pool.stable.name)
      expect(metadata.properties.stableSymbol).to.be.equal(pool.stable.symbol)
      expect(metadata.properties.stableDecimals).to.be.equal(pool.stable.decimals.toString())

      expect(metadata.properties.invariant).to.be.equal('0')
      expect(metadata.properties.strike).to.be.equal(pool.strike.raw.toString())
      expect(metadata.properties.sigma).to.be.equal(pool.sigma.raw.toString())
      expect(metadata.properties.maturity).to.be.equal(pool.maturity.raw.toString())
      expect(metadata.properties.lastTimestamp).to.be.equal(lastTimestamp)
      expect(metadata.properties.gamma).to.be.equal(pool.gamma.raw.toString())
      expect(metadata.properties.reserveRisky).to.be.equal(reserveRisky.toString())
      expect(metadata.properties.reserveStable).to.be.equal(reserveStable.toString())
      expect(metadata.properties.liquidity).to.be.equal(liquidity.toString())
      expect(metadata.properties.blockTimestamp).to.be.equal(lastTimestamp)
      expect(metadata.properties.cumulativeRisky).to.be.equal('0')
      expect(metadata.properties.cumulativeStable).to.be.equal('0')
      expect(metadata.properties.cumulativeLiquidity).to.be.equal('0')

      expect(metadata.properties.chainId).to.be.equal(31337)
    })

    it('fails to allocate 0 min liquidity', async function () {
      const standard = { fromMargin: false, slippageTolerance: parsePercentage(0.01), recipient: user0 }

      const refreshed = await rmm.getPool(pool.poolId)

      const delLiquidity = parseWei(0)
      const amounts = refreshed.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

      const options: AllocateOptions = {
        delRisky: amounts.delRisky,
        delStable: amounts.delStable,
        delLiquidity: delLiquidity,
        createPool: false,
        ...standard,
      }
      expect(() => rmm.allocate({ pool: refreshed, options })).to.throw
    })

    it('fails to allocate 0 token amounts', async function () {
      const standard = { fromMargin: false, slippageTolerance: parsePercentage(0.01), recipient: user0 }

      const refreshed = await rmm.getPool(pool.poolId)

      const delLiquidity = parseWei(0)
      const amounts = refreshed.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

      const options: AllocateOptions = {
        delRisky: parseWei(0, amounts.delRisky.decimals),
        delStable: amounts.delStable,
        delLiquidity: delLiquidity,
        createPool: false,
        ...standard,
      }
      expect(() => rmm.allocate({ pool: refreshed, options })).to.throw
    })

    it('fails to allocate risky with incorrect token decimals', async function () {
      const standard = { fromMargin: false, slippageTolerance: parsePercentage(0.01), recipient: user0 }

      const refreshed = await rmm.getPool(pool.poolId)

      const delLiquidity = parseWei(0)
      const amounts = refreshed.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

      const options: AllocateOptions = {
        delRisky: parseWei(5, 3),
        delStable: amounts.delStable,
        delLiquidity: delLiquidity,
        createPool: false,
        ...standard,
      }
      expect(() => rmm.allocate({ pool: refreshed, options })).to.throw
    })

    it('removes liquidity from a pool', async function () {
      const standard = {
        toMargin: true,
        fromMargin: false,
        slippageTolerance: parsePercentage(0.0),
        recipient: user0,
      }

      const refreshed = await rmm.getPool(pool.poolId)

      // remove liquidity
      const balance = await rmm.getLiquidityBalance(refreshed.poolId, user0)
      const amountToRemove = balance.mul(50).div(100)
      const updatedBalance = balance.sub(amountToRemove)

      const { delRisky, delStable } = refreshed.liquidityQuote(amountToRemove, PoolSides.RMM_LP)

      const options: RemoveOptions = {
        delRisky,
        delStable,
        additionalRisky: parseWei(0, delRisky.decimals),
        additionalStable: parseWei(0, delStable.decimals),
        delLiquidity: amountToRemove,
        ...standard,
      }

      const [bfre0, bfre1] = await Promise.all([risky.balanceOf(user0), stable.balanceOf(user0)])
      const details = await rmm.remove({ pool: refreshed, options })
      const [aftr0, aftr1] = await Promise.all([risky.balanceOf(user0), stable.balanceOf(user0)])
      expect(details.params.pool.poolId).to.be.equal(refreshed.poolId)
      expect(details.newPosition.equals(new Position(refreshed, updatedBalance))).to.be.true
      expect(details.hash).to.not.be.undefined
      expect(delRisky.add(bfre0.toString()).float).to.be.closeTo(
        weiToWei(aftr0, delRisky.decimals).float,
        delRisky.add(bfre0.toString()).float * 0.000015, // rounding deficit
      )
      expect(delStable.add(bfre1.toString()).float).to.be.closeTo(
        weiToWei(aftr1, delStable.decimals).float,
        delStable.add(bfre1.toString()).float * 0.000015, // rounding deficit
      )
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
