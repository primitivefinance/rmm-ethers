import fs from 'fs'
import path from 'path'
import hre from 'hardhat'
import { MaxUint256, AddressZero } from '@ethersproject/constants'
import { parsePercentage, parseWei, Time } from 'web3-units'
import { Signer } from '@ethersproject/abstract-signer'
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers'
import { Contract } from 'ethers'
import { EthersRmm, _RmmContractAbis } from '../src'
import { AllocateOptions, Pool, PoolSides, Swaps } from '@primitivefi/rmm-sdk'
import MintableERC20Artifact from '../artifacts/contracts/ERC20.sol/ERC20.json'
import { getAddress } from 'ethers/lib/utils'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const POOL_DEPLOYMENTS_SAVE = path.join('./deployments', 'default', 'pools.json')

// --- Config ---
const DEFAULT_MATURITY = 1642809599 // Fri Jan 21 2022 23:59:59 GMT+0000
const DEFAULT_GAMMA = 0.99
const yveCRVDAO = {
  name: 'yveCRV-DAO',
  risky: {
    contractName: 'ERC20',
    name: 'Test yveCRV-DAO yVault',
    symbol: 'yveCRV',
    decimals: 18,
  },
  stable: {
    contractName: 'ERC20',
    name: 'Test USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
  spot: 2.42,
  pools: [
    { strike: 2.75, sigma: 1 },
    { strike: 2.75, sigma: 1.25 },
    { strike: 2.75, sigma: 1.5 },
    { strike: 3, sigma: 1 },
    { strike: 3, sigma: 1.25 },
    { strike: 3, sigma: 1.5 },
  ],
}

type PoolConfigType = {
  name: string
  risky: { contractName: string; name: string; symbol: string; decimals: number }
  stable: { contractName: string; name: string; symbol: string; decimals: number }
  spot: number
  pools: { strike: number; sigma: number }[]
}

interface IAggregatedPools {
  vecrv: PoolConfigType
}

const AGGREGATED_POOLS: IAggregatedPools = {
  vecrv: yveCRVDAO,
}

type Signers = Signer | DefenderRelaySigner

type TokenLike = { address: string; decimals: number; name: string; symbol: string }
type PoolDeployments = { [poolId: string]: string }

interface IPoolDeploymentsJSON {
  name: string
  risky: TokenLike
  stable: TokenLike
  pools: PoolDeployments
}

function getEngineSymbol(symbols: string[]): string {
  const name = `RMM-LP-${symbols[0]}/${symbols[1]}`
  return name
}

function getPoolSymbol(symbols: string[], strike: number, sigma: number, maturity: number, gamma: number): string {
  const name = `${getEngineSymbol(symbols)}-${strike}-${sigma}-${maturity}-${gamma}`
  return name
}

const getTokenMetadata = async (contract: Contract): Promise<[number, string, string]> => {
  return await Promise.all([contract.decimals(), contract.name(), contract.symbol()])
}

async function getPoolTokensFromDeployment(
  name: string,
  chainId: number,
): Promise<[TokenLike | undefined, TokenLike | undefined]> {
  const data = (await readLog(chainId, name, POOL_DEPLOYMENTS_SAVE)) as IPoolDeploymentsJSON
  return [data?.risky, data?.stable]
}

type CalibrationType = { strike: string; sigma: string; maturity: string; gamma: string }

async function getEngineOrDeployEngine(rmm: EthersRmm, riskyToken: Contract, stableToken: Contract): Promise<Contract> {
  let engineAddress: string = AddressZero

  try {
    engineAddress = await rmm.getEngine(riskyToken.address, stableToken.address)
  } catch (e) {}

  if (engineAddress === AddressZero) {
    console.log('     Deploying engine!')
    const details = await rmm.createEngine({ risky: riskyToken.address, stable: stableToken.address })
    try {
      engineAddress = await rmm.getEngine(riskyToken.address, stableToken.address)
    } catch (e) {}

    engineAddress = details?.engine
  }

  if (engineAddress === AddressZero) throw new Error('Zero address on engine')
  const engine: Contract = new Contract(engineAddress, _RmmContractAbis.primitiveEngine, rmm.connection.signer)
  return engine
}

class PoolDeployer {
  /** Where pool deployments are saved to and loaded from. */
  readonly path: string

  /** Network of the deployments. */
  readonly chainId: number

  /** Rmm protocol connection. */
  readonly rmm: EthersRmm

  /** Deployment settings and configuration. */
  readonly config: PoolConfigType

  private _token0?: TokenLike

  private _token1?: TokenLike

  private _tokens?: Contract[]

  constructor(chainId: number, path: string, config: PoolConfigType, rmm: EthersRmm) {
    this.chainId = chainId
    this.path = path
    this.config = config
    this.rmm = rmm
  }

  get signer(): Signer {
    return this.rmm.connection.signer
  }

  set token0(token: TokenLike | undefined) {
    this._token0 = token
  }

  get token0(): TokenLike | undefined {
    return this._token0
  }

  set token1(token: TokenLike | undefined) {
    this._token1 = token
  }

  get token1(): TokenLike | undefined {
    return this._token1
  }

  set tokens(tokens: Contract[] | undefined) {
    this._tokens = tokens
  }

  get tokens(): Contract[] | undefined {
    return this._tokens
  }

  async getDeployment(): Promise<IPoolDeploymentsJSON> {
    return (await readLog(this.chainId, this.config.name, this.path)) as IPoolDeploymentsJSON
  }

  async deployAndSaveToken(slot: keyof PoolConfigType): Promise<Contract> {
    if (slot !== 'risky' && slot !== 'stable') throw new Error('Not the right token slot')
    const loadedDeployment = await this.getDeployment()

    const factory = await hre.ethers.getContractFactory(this.config[slot].contractName, this.signer)
    const meta = {
      name: this.config[slot].name,
      symbol: this.config[slot].symbol,
      decimals: this.config[slot].decimals,
    }

    console.log(`Deploying ${meta.name}!`)
    const token: Contract = await factory.deploy(meta.name, meta.symbol, meta.decimals)
    await token.deployed()

    const next: IPoolDeploymentsJSON = {
      ...loadedDeployment,
      [slot]: { address: token.address, ...meta },
    }
    await updateLog(this.chainId, this.config.name, next, this.path)
    return token
  }

  async deployed(hre: HardhatRuntimeEnvironment): Promise<void> {
    const tokens = await getPoolTokensFromDeployment(this.config.name, this.chainId)
    const [riskyLike, stableLike] = tokens

    let riskyToken: Contract
    if (riskyLike?.address) riskyToken = new Contract(riskyLike.address, MintableERC20Artifact.abi, this.signer)
    else riskyToken = await this.deployAndSaveToken('risky')

    let stableToken: Contract
    if (stableLike?.address) stableToken = new Contract(stableLike.address, MintableERC20Artifact.abi, this.signer)
    else stableToken = await this.deployAndSaveToken('stable')

    this.token0 = tokens[0]
    this.token1 = tokens[1]
    this.tokens = [riskyToken, stableToken]
  }

  async updatePools(name: string, pools: PoolDeployments): Promise<void> {
    const prev = await this.getDeployment()
    const next: IPoolDeploymentsJSON = {
      name,
      risky: prev.risky,
      stable: prev.stable,
      pools: { ...prev?.pools, ...pools },
    }
    await updateLog(this.chainId, this.config.name, next, this.path)
  }
}

const fn = async () => {
  const chainId = +(await hre.network.provider.send('eth_chainId'))
  console.log(`Using chainId: ${chainId}`)

  if (chainId === 1) throw new Error('Do not use this in prod!')

  const signer: Signers = await hre.run('useSigner')
  const from = getAddress(await signer.getAddress())
  console.log(`Using signer: ${from}`)

  const rmm = await EthersRmm.connect(signer)
  console.log(`Connected to RMM: `, rmm.connection.addresses)

  const deployer = new PoolDeployer(chainId, POOL_DEPLOYMENTS_SAVE, yveCRVDAO, rmm)

  await deployer.deployed(hre)

  const poolConfig = deployer.config
  const poolsFromConfig = poolConfig.pools
  const referencePrice = poolConfig.spot

  const pairs = deployer.tokens ? [deployer.tokens] : []

  if (pairs.length === 0) throw new Error('No loaded tokens')

  for (const [riskyToken, stableToken] of pairs) {
    const rMetadata = await getTokenMetadata(riskyToken)
    const sMetadata = await getTokenMetadata(stableToken)
    console.log(`Creating pools for the pair: ${rMetadata[2]}/${sMetadata[2]}`)
    const symbols = [rMetadata[2], sMetadata[2]]
    const engineSymbol = getEngineSymbol(symbols)

    const risky = { address: riskyToken.address, decimals: rMetadata[0], name: rMetadata[1], symbol: rMetadata[2] }
    const stable = { address: stableToken.address, decimals: sMetadata[0], name: sMetadata[1], symbol: sMetadata[2] }

    // Get engine, or deploy an engine
    const engine: Contract = await getEngineOrDeployEngine(rmm, riskyToken, stableToken)
    console.log(`Got engine or deployed engine: ${engine.address}`)

    // get default parameters
    const minRisky = parseWei('100000000', risky.decimals)
    const minStable = parseWei('100000000', stable.decimals)
    const delLiquidity = parseWei(1)

    // if devnet, sync with current timestamp
    const now = Time.now
    if (chainId === 1337) await hre.network.provider.send('evm_mine', [now])

    // get params
    const poolEntities: Pool[] = []

    poolsFromConfig.forEach(({ strike, sigma }) => {
      const calibration: CalibrationType = {
        strike: parseWei(strike, stable.decimals).toString(),
        sigma: parsePercentage(sigma).toString(),
        maturity: new Time(DEFAULT_MATURITY).raw.toString(),
        gamma: parsePercentage(DEFAULT_GAMMA).toString(),
      }

      const pool: Pool = Pool.fromReferencePrice(
        referencePrice,
        rmm.connection.addresses.primitiveFactory,
        risky,
        stable,
        calibration,
        chainId,
        delLiquidity.toString(),
      )
      poolEntities.push(pool)
    })

    console.log(`   Got all pools: ${poolEntities.length}`)

    const managerAddress = getAddress(rmm.connection.addresses.primitiveManager)
    const [riskyBalance, stableBalance] = await Promise.all([riskyToken.balanceOf(from), stableToken.balanceOf(from)])
    const [riskyAllowance, stableAllowance] = await Promise.all([
      riskyToken.allowance(from, managerAddress),
      stableToken.allowance(from, managerAddress),
    ])

    // approve max uint if lower than min amounts
    if (minRisky.gt(riskyAllowance)) await riskyToken.approve(managerAddress, MaxUint256)
    if (minStable.gt(stableAllowance)) await stableToken.approve(managerAddress, MaxUint256)

    console.log('   Creating pools')

    const loadedDeployment = await deployer.getDeployment()

    let deployedPools: PoolDeployments = {}
    for (let i = 0; i < poolEntities.length; i++) {
      const pool = poolEntities[i]

      const { delRisky, delStable } = pool.liquidityQuote(delLiquidity, PoolSides.RMM_LP)

      // mint test tokens if our balance gets low
      if (delRisky.gt(riskyBalance)) await riskyToken.mint(from, delRisky.raw)
      if (delStable.gt(stableBalance)) await stableToken.mint(from, delStable.raw)

      const options: AllocateOptions = {
        recipient: from,
        slippageTolerance: parsePercentage(0.01),
        createPool: true,
        fromMargin: false,
        delRisky: pool.reserveRisky.add(1),
        delStable: pool.reserveStable.add(1),
        delLiquidity: pool.liquidity,
      }

      const poolSymbol = getPoolSymbol(
        symbols,
        pool.strike.float,
        pool.sigma.float,
        pool.maturity.raw,
        pool.gamma.float,
      )

      const engineExists = loadedDeployment?.name
      const poolIdExists =
        loadedDeployment?.pools && Object.keys(loadedDeployment.pools).filter(id => id === pool.poolId).length > 0

      if (!engineExists || !poolIdExists) {
        try {
          const estimatedRisky = Swaps.getRiskyReservesGivenReferencePrice(
            pool.strike.float,
            pool.sigma.float,
            pool.tau.years,
            pool.referencePriceOfRisky?.float ?? 0,
          )
          console.log(
            `Attempting to create pool at spot price: ${pool.referencePriceOfRisky?.display} with liquidity: ${options.delLiquidity.display}, with risky reserves: ${estimatedRisky}`,
          )

          if (estimatedRisky < 1e-6) throw new Error(`Estimated risky reserves are low: ${estimatedRisky}  < 1e-6`)
          if (estimatedRisky > 1 - 1e-6)
            throw new Error(`Estimated risky reserves are high: ${estimatedRisky} > 1 - 1e-6`)
          const {
            newPosition: {
              pool: { poolId },
            },
          } = await rmm.createPool({
            pool,
            options,
          })

          deployedPools = Object.assign(deployedPools, {
            [poolId]: poolSymbol,
          })
        } catch (e) {
          console.log(`Failed to create pool with code: ${(e as any)?.code ? (e as any).code : e}`)
        }
      }
    }

    await deployer.updatePools(engineSymbol, deployedPools)
  }
}

async function main() {
  await fn()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

async function updateLog(chainId: number, contractName: string, data: IPoolDeploymentsJSON, path?: string) {
  try {
    const logRaw = await fs.promises.readFile(path ? path : './deployments/default/pools.json', {
      encoding: 'utf-8',
      flag: 'a+',
    })
    let log

    if (logRaw.length === 0) {
      log = {}
    } else {
      log = JSON.parse(logRaw)
    }

    if (!log[chainId]) {
      log[chainId] = {}
    }

    log[chainId][contractName] = data

    await fs.promises.writeFile(path ? path : './deployments/default/pools.json', JSON.stringify(log, null, 2))
  } catch (e) {
    console.error(e)
  }
}

async function readLog(chainId: number, contractName: string, path?: string): Promise<IPoolDeploymentsJSON | unknown> {
  try {
    const logRaw = await fs.promises.readFile(path ? path : './deployments/default/pools.json', {
      encoding: 'utf-8',
      flag: 'a+',
    })
    let log

    if (logRaw.length === 0) {
      log = {}
    } else {
      log = JSON.parse(logRaw)
    }

    if (!log[chainId]) {
      log[chainId] = {}
    }

    return log[chainId][contractName] as IPoolDeploymentsJSON
  } catch (e) {
    console.error(e)
    return e
  }
}
