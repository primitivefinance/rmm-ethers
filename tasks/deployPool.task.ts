import { task, types } from 'hardhat/config'

import { constants } from 'ethers'
import { Ether, WETH9, Token } from '@uniswap/sdk-core'
import { AllocateOptions, Pool } from '@primitivefi/rmm-sdk'
import { parsePercentage, parseWei, Time } from 'web3-units'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'

import { PositionAdjustmentDetails } from '../src'
import { deployPool } from '../utils/deployPool'
import { IERC20 } from '../typechain'

import { TASK_DEPLOY_ENGINE, TASK_DEPLOY_POOL, TASK_USE_TOKEN } from './constants/task-names'

const { MaxUint256 } = constants

type Signers = Signer | DefenderRelaySigner
type UseToken = { contract: IERC20; metadata: { address: string; name: string; symbol: string; decimals: number } }

task(TASK_DEPLOY_POOL, 'deploys a pool')
  .addParam('risky', 'risky token address')
  .addParam('stable', 'stable token address')
  .addParam('strike', 'strike price', 0, types.float)
  .addParam('sigma', 'implied volatility', 0, types.float)
  .addParam('maturity', 'pool expiration date', 0, types.float)
  .addParam('gamma', ' a pools effective fee, equal to 1 - fee %', 0, types.float)
  .addParam('spot', 'reference market price', 0, types.float)
  .addParam('liquidity', 'initial liquidity to mint', 0, types.float)
  .addOptionalParam('gas', 'optional param to set gas limit')
  .setAction(async (args, hre) => {
    const { risky: riskyAddress, stable: stableAddress, strike, sigma, maturity, gamma, spot, liquidity } = args

    // --- Context ---
    const signer: Signers = await hre.run('useSigner', { log: true })
    const from = await signer.getAddress()

    const rmm = await hre.connect(signer, true)
    const chainId = rmm.connection.chainId

    const wethAddress = await new hre.ethers.Contract(
      rmm.connection.addresses.primitiveManager,
      ['function WETH9() view returns(address)'],
      signer,
    ).WETH9()

    const weth: Token = WETH9?.[chainId] ?? new Token(chainId, wethAddress, 18, 'WETH', 'Wrapped ETH')
    const ETH = Ether.onChain(chainId)

    // --- Conditional to avoid losing money ----
    if (chainId === 1) throw new Error('Do not use this in prod!')

    // --- Deploy Engine if needed ---
    try {
      await hre.run(TASK_DEPLOY_ENGINE, { risky: riskyAddress, stable: stableAddress })
    } catch (e) {}

    // --- Arguments to create pool with ---
    const risky: UseToken = await hre.run(TASK_USE_TOKEN, { address: riskyAddress, mintable: true })
    const stable: UseToken = await hre.run(TASK_USE_TOKEN, { address: stableAddress, mintable: true })
    const delLiquidity = parseWei(liquidity, 18)
    const calibration = {
      strike: parseWei(strike, stable.metadata.decimals).toString(),
      sigma: parsePercentage(sigma).toString(),
      maturity: new Time(maturity).toString(),
      gamma: parsePercentage(gamma).toString(),
    }
    const useNative = new Token(
      chainId,
      risky.metadata.address,
      risky.metadata.decimals,
      risky.metadata.symbol,
      risky.metadata.name,
    ).equals(weth)
      ? ETH
      : undefined

    // --- Pool entity ---
    const pool: Pool = Pool.fromReferencePrice(
      spot,
      rmm.connection.addresses.primitiveFactory,
      risky.metadata,
      stable.metadata,
      calibration,
      chainId,
      delLiquidity.toString(),
    )

    // --- Allocate Arguments ---
    const amounts = [pool.reserveRisky.add(1), pool.reserveStable.add(1)]
    const options: AllocateOptions = {
      recipient: from,
      slippageTolerance: parsePercentage(0.0),
      createPool: true,
      fromMargin: false,
      delRisky: amounts[0],
      delStable: amounts[1],
      delLiquidity: pool.liquidity,
      useNative,
    }

    // --- Testnet only ---
    try {
      const balances = await Promise.all([risky.contract.balanceOf(from), stable.contract.balanceOf(from)])
      if (!useNative && amounts[0].gt(balances[0]))
        await (risky.contract as any).mint(from, parseWei(100000, risky.metadata.decimals).raw)
      if (amounts[1].gt(balances[1]))
        await (stable.contract as any).mint(from, parseWei(100000, stable.metadata.decimals).raw)
    } catch (e) {
      console.log(`   Failed minting tokens, is it a test token?`, e)
    }

    // --- Approvals ---
    try {
      const [riskyAllowance, stableAllowance] = await Promise.all([
        risky.contract.allowance(from, rmm.connection.addresses.primitiveManager),
        stable.contract.allowance(from, rmm.connection.addresses.primitiveManager),
      ])
      if (!useNative && amounts[0].gt(riskyAllowance))
        await risky.contract.approve(rmm.connection.addresses.primitiveManager, MaxUint256)
      if (amounts[1].gt(stableAllowance))
        await stable.contract.approve(rmm.connection.addresses.primitiveManager, MaxUint256)
    } catch (e) {
      console.log(`   Failed approving: `, e)
    }

    // --- Deploy the pool ---
    let details: PositionAdjustmentDetails | undefined = undefined
    try {
      details = await deployPool(rmm, pool, options)
      if (details?.hash) {
        console.log(details)
        console.log(`🎉 Deployed pool! 🎉 ${pool.poolId}`)
      }
    } catch (e) {
      console.log(`   Caught when attempting to deploy pool: `, e)
    }

    return details
  })
