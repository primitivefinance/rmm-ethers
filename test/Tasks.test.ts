import hre from 'hardhat'
import chai from 'chai'
import { ethers } from 'hardhat'
import { Contract, Signer } from 'ethers'

import { EthersRmm } from '../src/EthersRmm'
import { _connectToDeployment, _RmmDeploymentJSON } from '../src'
import { Pool, Swaps } from '@primitivefi/rmm-sdk'

import { parsePercentage, parseWei, Time } from 'web3-units'
import { TASK_DEPLOY_ENGINE, TASK_DEPLOY_POOL } from '../tasks/constants/task-names'

const { MaxUint256 } = ethers.constants

const { expect } = chai

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

describe('RMM Ethers', function () {
  let deployer: Signer
  let rmm: EthersRmm
  let user0: string
  let lastTimestamp: string

  before(async function () {
    ;[deployer] = await ethers.getSigners()
    user0 = await deployer.getAddress()
    rmm = await hre.connect(deployer)
    expect(rmm).to.be.instanceOf(EthersRmm)
  })

  describe('task:engines', function () {
    it('task::TASK_DEPLOY_ENGINE', async function () {
      const [token0, token1] = await Promise.all([deployTestERC20(deployer), deployTestERC20(deployer)])

      const engine = await hre.run(TASK_DEPLOY_ENGINE, { risky: token0.address, stable: token1.address, log: true })
      expect(engine).to.not.be.undefined
    })
  })

  describe('task:pools', async () => {
    let risky: Contract,
      stable: Contract,
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
      await rmm.createEngine({ risky: risky.address, stable: stable.address })

      // model pool entity
      const [riskyDecimals, riskyName, riskySymbol] = await getTokenMetadata(risky)
      const [stableDecimals, stableName, stableSymbol] = await getTokenMetadata(stable)
      riskyToken = { address: risky.address, decimals: riskyDecimals, name: riskyName, symbol: riskySymbol }
      stableToken = { address: stable.address, decimals: stableDecimals, name: stableName, symbol: stableSymbol }
      chainId = await deployer.getChainId()
    })

    // fix
    it.skip('task::TASK_DEPLOY_POOL', async function () {
      const refPrice = 10
      const calibration = {
        strike: parseWei(15, +stableToken.decimals).toString(),
        sigma: parsePercentage(1.33).toString(),
        maturity: (Time.now + Time.YearInSeconds + 100).toString(), // for creating new pool
        gamma: parsePercentage(1 - 0.01).toString(),
        lastTimestamp,
      }
      const createPool = Pool.fromReferencePrice(refPrice, factory, riskyToken, stableToken, calibration, chainId)

      const details = await hre.run(TASK_DEPLOY_POOL, {
        risky: createPool.risky.address,
        stable: createPool.stable.address,
        strike: createPool.strike.float,
        sigma: createPool.sigma.float,
        maturity: createPool.maturity.raw,
        gamma: createPool.gamma.float,
        spot: createPool.referencePriceOfRisky?.float,
        liquidity: createPool.liquidity.float,
        log: true,
      })
      expect(details).to.not.be.undefined
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
  })
})
