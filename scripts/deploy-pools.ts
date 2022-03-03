import path from 'path'
import hre from 'hardhat'
import { Signer } from '@ethersproject/abstract-signer'
import { parsePercentage, parseWei, Time } from 'web3-units'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'
import { AllocateOptions, Engine, Pool, PoolSides } from '@primitivefi/rmm-sdk'
import { Ether } from '@uniswap/sdk-core'

import ERC20Artifact from '../artifacts/@primitivefi/rmm-manager/contracts/interfaces/external/IERC20WithMetadata.sol/IERC20WithMetadata.json'

import { log, setSilent } from '../utils/deploy'
import { deployPool } from '../utils/deployPool'
import { PoolConfigType, PoolDeployer, PoolDeployments } from '../utils/poolDeployer'

import { IERC20WithMetadata, PrimitiveEngine } from '../typechain'

type Signers = Signer | DefenderRelaySigner
type CalibrationType = { strike: string; sigma: string; maturity: string; gamma: string }

// --- Config ---
export const POOL_DEPLOYMENTS_SAVE = path.join('./deployments', 'default', 'pools.json')
const DEFAULT_MATURITY = 1648839599
const DEFAULT_GAMMA = 0.99
const defaultParams = { maturity: DEFAULT_MATURITY, gamma: DEFAULT_GAMMA }

/* export const POOL_CONFIG_TO_DEPLOY: PoolConfigType = {
  name: 'RBN-USDC',
  engine: '0x2678a653FE4DE7eBcc76d7FC3d27Be62e7E0015A', //rinkeby-rbn-usdc-engine//'0xe7Cad6009A6239bf7F7D68543d555836481f8283',
  spot: 2.42,
  pools: [
    { strike: 2.75, sigma: 1, ...defaultParams },
    { strike: 2.75, sigma: 1.25, ...defaultParams },
    { strike: 2.75, sigma: 1.5, ...defaultParams },
    { strike: 3, sigma: 1, ...defaultParams },
    { strike: 3, sigma: 1.25, ...defaultParams },
    { strike: 3, sigma: 1.5, ...defaultParams },
  ],
} */

export const POOL_CONFIG_TO_DEPLOY: PoolConfigType = {
  name: 'WETH-USDC',
  engine: '0x7CBD951e9b0254a7C0EcD90b34428Ee0c06B3f93', // weth-usdc rinkeby
  spot: 3000,
  pools: [
    { strike: 3500, sigma: 0.7, ...defaultParams },
    { strike: 3500, sigma: 0.75, ...defaultParams },
    { strike: 3500, sigma: 0.8, ...defaultParams },
    { strike: 3500, sigma: 0.85, ...defaultParams },
    { strike: 3500, sigma: 0.9, ...defaultParams },
    { strike: 3500, sigma: 0.95, ...defaultParams },
    { strike: 3500, sigma: 1, ...defaultParams },
    { strike: 3500, sigma: 1.05, ...defaultParams },
    { strike: 3500, sigma: 1.1, ...defaultParams },
    { strike: 3500, sigma: 1.15, ...defaultParams },
    { strike: 3500, sigma: 1.2, ...defaultParams },
    { strike: 3500, sigma: 1.25, ...defaultParams },
    { strike: 3500, sigma: 1.3, ...defaultParams },
    { strike: 3500, sigma: 1.35, ...defaultParams },
    { strike: 3500, sigma: 1.4, ...defaultParams },
    { strike: 3500, sigma: 1.45, ...defaultParams },
    { strike: 3500, sigma: 1.5, ...defaultParams },
    { strike: 3500, sigma: 1.55, ...defaultParams },
    { strike: 3500, sigma: 1.6, ...defaultParams },
    { strike: 3500, sigma: 1.65, ...defaultParams },
    { strike: 3500, sigma: 1.7, ...defaultParams },
  ],
}

export async function deployPools(deployer: PoolDeployer) {
  const signer = deployer.rmm.connection.signer
  const from = await signer.getAddress()

  const engine = new hre.ethers.Contract(POOL_CONFIG_TO_DEPLOY.engine, Engine.ABI, signer) as PrimitiveEngine
  log(`Got engine: ${engine.address}`)

  const [token0, token1] = (await Promise.all([engine.risky(), engine.stable()])).map(
    address => new hre.ethers.Contract(address, ERC20Artifact.abi, signer) as IERC20WithMetadata,
  )

  log(`Loading tokens...`)
  await deployer.loadTokens(token0, token1)

  const poolConfig = deployer.config
  const poolsFromConfig = poolConfig.pools
  const referencePrice = poolConfig.spot

  const pairs = [[token0, token1]]

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

      // get default parameters
      const minRisky = parseWei('100000000', risky.decimals)
      const minStable = parseWei('100000000', stable.decimals)
      const delLiquidity = parseWei(0.1)

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
        const useNative = risky.symbol.toLowerCase() === 'weth' ? Ether.onChain(deployer.chainId) : undefined
        const pool = poolEntities[i]

        const { delRisky, delStable } = pool.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

        log(`   Using native? ${useNative ? 'yes' : 'no'}`)
        if (typeof useNative === 'undefined') await deployer.mintTestnetTokens(from, [delRisky, delStable])

        const options: AllocateOptions = {
          recipient: from,
          slippageTolerance: parsePercentage(0.0),
          createPool: true,
          fromMargin: false,
          delRisky: pool.reserveRisky.add(1),
          delStable: pool.reserveStable.add(1),
          delLiquidity: pool.liquidity,
          useNative,
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

          // { [poolId]: poolSymbol }[]
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
