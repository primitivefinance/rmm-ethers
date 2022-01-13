import path from 'path'
import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { parsePercentage, parseWei, Time } from 'web3-units'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'
import { AllocateOptions, Pool, PoolSides } from '@primitivefi/rmm-sdk'

import { log, setSilent } from '../utils/deploy'
import { deployPool } from '../utils/deployPool'
import { deployEngine } from '../utils/deployEngine'
import { PoolConfigType, PoolDeployer, PoolDeployments } from '../utils/poolDeployer'

export const POOL_DEPLOYMENTS_SAVE = path.join('./deployments', 'default', 'pools.json')

// --- Config ---
const DEFAULT_MATURITY = 1642809599 // Fri Jan 21 2022 23:59:59 GMT+0000
const DEFAULT_GAMMA = 0.99

const defaultParams = { maturity: DEFAULT_MATURITY, gamma: DEFAULT_GAMMA }
const defaultStable = { contractName: 'ERC20', name: 'Test USD Coin', symbol: 'USDC', decimals: 6 }
const yveCRVDAO = {
  name: 'yveCRV-DAO',
  risky: {
    contractName: 'ERC20',
    name: 'Test yveCRV-DAO yVault',
    symbol: 'yveCRV',
    decimals: 18,
  },
  stable: { ...defaultStable },
  spot: 2.42,
  pools: [
    { strike: 2.75, sigma: 1, ...defaultParams },
    { strike: 2.75, sigma: 1.25, ...defaultParams },
    { strike: 2.75, sigma: 1.5, ...defaultParams },
    { strike: 3, sigma: 1, ...defaultParams },
    { strike: 3, sigma: 1.25, ...defaultParams },
    { strike: 3, sigma: 1.5, ...defaultParams },
  ],
}

const ribbon = {
  name: 'Ribbon',
  risky: {
    contractName: 'ERC20',
    name: 'Test Ribbon',
    symbol: 'RBN',
    decimals: 18,
  },
  stable: { ...defaultStable },
  spot: 3.22,
  pools: [
    { strike: 4.2, sigma: 1, ...defaultParams },
    { strike: 4.2, sigma: 1.25, ...defaultParams },
    { strike: 4.2, sigma: 1.5, ...defaultParams },
    { strike: 5.0, sigma: 1, ...defaultParams },
    { strike: 5.0, sigma: 1.25, ...defaultParams },
    { strike: 5.0, sigma: 1.5, ...defaultParams },
  ],
}

interface IAggregatedPools {
  vecrv: PoolConfigType
  rbn: PoolConfigType
}

const AGGREGATED_POOLS: IAggregatedPools = {
  vecrv: yveCRVDAO,
  rbn: ribbon,
}

type Signers = Signer | DefenderRelaySigner
type CalibrationType = { strike: string; sigma: string; maturity: string; gamma: string }

export const POOL_CONFIG_TO_DEPLOY = ribbon

export async function deployPools(deployer: PoolDeployer) {
  const from = await deployer.rmm.connection.signer.getAddress()

  try {
    log(`Attempting to load or deploy tokens to deploy pools for`)
    await deployer.loadOrDeployTokens(hre)
  } catch (e) {
    log('Thrown when deploying')
    throw new Error('Thrown on attempting to deploy testnet tokens')
  }

  const poolConfig = deployer.config
  const poolsFromConfig = poolConfig.pools
  const referencePrice = poolConfig.spot

  const pairs = deployer.tokens ? [deployer.tokens] : []

  if (pairs.length === 0) throw new Error('No loaded tokens')

  try {
    for (const [riskyToken, stableToken] of pairs) {
      log(`Creating pools for the pair: ${deployer.symbols[0]}/${deployer.symbols[1]}`)

      // if devnet, sync with current timestamp
      const now = Time.now
      if (deployer.chainId === 1337) await hre.network.provider.send('evm_mine', [now])

      if (typeof deployer.token0?.decimals === 'undefined')
        throw new Error('Token decimals for risky asset are undefined')

      if (typeof deployer.token1?.decimals === 'undefined')
        throw new Error('Token decimals for stable asset are undefined')

      const risky = {
        address: riskyToken.address,
        decimals: deployer.token0.decimals,
        name: deployer.token0?.name,
        symbol: deployer.token0?.symbol,
      }
      const stable = {
        address: stableToken.address,
        decimals: deployer.token1.decimals,
        name: deployer.token1?.name,
        symbol: deployer.token1?.symbol,
      }

      // Get engine, or deploy an engine
      const engine = await deployEngine(deployer.rmm, riskyToken.address, stableToken.address)
      log(`Got engine or deployed engine: ${engine.address}`)

      // get default parameters
      const minRisky = parseWei('100000000', risky.decimals)
      const minStable = parseWei('100000000', stable.decimals)
      const delLiquidity = parseWei(1)

      // get params
      const poolEntities: Pool[] = []
      poolsFromConfig.forEach(({ strike, sigma, maturity, gamma }) => {
        const calibration: CalibrationType = {
          strike: parseWei(strike, stable.decimals).toString(),
          sigma: parsePercentage(sigma).toString(),
          maturity: new Time(maturity).toString(),
          gamma: parsePercentage(gamma).toString(),
        }

        const pool: Pool = Pool.fromReferencePrice(
          referencePrice,
          deployer.rmm.connection.addresses.primitiveFactory,
          risky,
          stable,
          calibration,
          deployer.chainId,
          delLiquidity.toString(),
        )
        poolEntities.push(pool)
      })

      log(`   Got all pools: ${poolEntities.length}`)

      log(`   Approving tokens if needed`)
      await deployer.approveTokens(from, [minRisky, minStable])

      log(`   Loading deployment`)
      const loadedDeployment = await deployer.getDeployment()

      log('   Creating pools')
      let deployedPools: PoolDeployments = {}
      for (let i = 0; i < poolEntities.length; i++) {
        const pool = poolEntities[i]

        const { delRisky, delStable } = pool.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

        await deployer.mintTestnetTokens(from, [delRisky, delStable])

        const options: AllocateOptions = {
          recipient: from,
          slippageTolerance: parsePercentage(0.01),
          createPool: true,
          fromMargin: false,
          delRisky: pool.reserveRisky.add(1),
          delStable: pool.reserveStable.add(1),
          delLiquidity: pool.liquidity,
        }

        const poolSymbol = deployer.getPoolSymbol(
          pool.strike.float,
          pool.sigma.float,
          pool.maturity.raw,
          pool.gamma.float,
        )

        const engineExists = loadedDeployment?.name
        const poolIdExists =
          loadedDeployment?.pools && Object.keys(loadedDeployment.pools).filter(id => id === pool.poolId).length > 0

        if (!engineExists || !poolIdExists) {
          const details = await deployPool(deployer.rmm, pool, options)
          if (typeof details === 'undefined') continue
          const poolId = details.newPosition.pool.poolId

          deployedPools = Object.assign(deployedPools, {
            [poolId]: poolSymbol,
          })
        }
      }

      await deployer.updatePools(deployer.engineSymbol, deployedPools)
    }
  } catch (e) {
    log('Thrown when creating pools', e)
  }
}

export async function main() {
  setSilent(false)

  const signer: Signers = await hre.run('useSigner')
  const from = await signer.getAddress()
  log(`Using signer: ${from}`)

  const rmm = await hre.connect(signer)

  log(`Connected to RMM: `, rmm.connection.addresses)

  const chainId = rmm.connection.chainId
  log(`Using chainId: ${chainId}`)

  if (chainId === 1) throw new Error('Do not use this in prod!')

  const deployer = new PoolDeployer(chainId, POOL_DEPLOYMENTS_SAVE, POOL_CONFIG_TO_DEPLOY, rmm)

  await deployPools(deployer)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
