import fs from 'fs'
import { Contract, Signer } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Wei } from 'web3-units'
import { isAddress } from '@ethersproject/address'
import { MaxUint256 } from '@ethersproject/constants'

import { EthersRmm } from '../src'
import { ERC20, WETH9 } from '../typechain'
import ERC20Artifact from '../artifacts/contracts/ERC20.sol/ERC20.json'
import WETH9Artifact from '../artifacts/contracts/WETH9.sol/WETH9.json'
import { log } from './deploy'

export type PoolConfigType = {
  name: string
  risky: { contractName: string; name: string; symbol: string; decimals: number }
  stable: { contractName: string; name: string; symbol: string; decimals: number }
  spot: number
  pools: { strike: number; sigma: number; maturity: number; gamma: number }[]
}

export type TokenLike = { address: string; decimals: number; name: string; symbol: string }
export type PoolDeployments = { [poolId: string]: string }

const WETHLike = {
  address: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  decimals: 18,
  name: 'Test Weth',
  symbol: 'WETH',
}
const USDCLike = {
  address: '0x522064c1EafFEd8617BE64137f66A71D6C5c9aA3',
  decimals: 6,
  name: 'Test USDC',
  symbol: 'USDC',
}

export interface IPoolDeploymentsJSON {
  name: string
  risky: TokenLike
  stable: TokenLike
  pools: PoolDeployments
}

export class PoolDeployer {
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
  private _tokens?: (ERC20 | WETH9)[]

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

  set tokens(tokens: (ERC20 | WETH9)[] | undefined) {
    this._tokens = tokens
  }

  get tokens(): (ERC20 | WETH9)[] | undefined {
    return this._tokens
  }

  get symbols(): string[] {
    return [this.token0?.symbol ?? 'na', this.token1?.symbol ?? 'na']
  }

  get engineSymbol(): string {
    return `RMM-LP-${this.symbols[0]}/${this.symbols[1]}`
  }

  getPoolSymbol(strike: number, sigma: number, maturity: number, gamma: number): string {
    return `${this.engineSymbol}-${strike}-${sigma}-${maturity}-${gamma}`
  }

  async getDeployment(): Promise<IPoolDeploymentsJSON> {
    return (await readLog(this.chainId, this.config.name, this.path)) as IPoolDeploymentsJSON
  }

  async deployAndSaveToken(hre: HardhatRuntimeEnvironment, slot: keyof PoolConfigType): Promise<ERC20> {
    if (slot !== 'risky' && slot !== 'stable') throw new Error('Not the right token slot')
    const loadedDeployment = await this.getDeployment()

    const factory = await hre.ethers.getContractFactory(this.config[slot].contractName, this.signer)
    const meta = {
      name: this.config[slot].name,
      symbol: this.config[slot].symbol,
      decimals: this.config[slot].decimals,
    }

    log(`Deploying ${meta.name}!`)
    const token: ERC20 = (await factory.deploy(meta.name, meta.symbol, meta.decimals)) as ERC20
    await token.deployed()

    const next: IPoolDeploymentsJSON = {
      ...loadedDeployment,
      [slot]: { address: token.address, ...meta },
    }
    await updateLog(this.chainId, this.config.name, next, this.path)
    return token
  }

  async loadOrDeployTokens(hre: HardhatRuntimeEnvironment, wethOverride?: boolean): Promise<void> {
    let tokens = await getPoolTokensFromDeployment(this.config.name, this.chainId, this.path)
    tokens = wethOverride ? [WETHLike, USDCLike] : tokens
    const [riskyLike, stableLike] = tokens

    let riskyToken: ERC20 | WETH9
    if (riskyLike?.address)
      if (wethOverride) {
        riskyToken = new Contract(riskyLike.address, WETH9Artifact.abi, this.signer) as WETH9
      } else {
        riskyToken = new Contract(riskyLike.address, ERC20Artifact.abi, this.signer) as ERC20
      }
    else riskyToken = await this.deployAndSaveToken(hre, 'risky')

    let stableToken: ERC20
    if (stableLike?.address) stableToken = new Contract(stableLike.address, ERC20Artifact.abi, this.signer) as ERC20
    else stableToken = await this.deployAndSaveToken(hre, 'stable')

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

  /**
   * Approves the PrimitiveManager contract to spend tokens.
   *
   * @beta
   */
  async approveTokens(account: string, amounts: [Wei, Wei]): Promise<void> {
    if (typeof this.tokens === 'undefined') throw new Error('Tokens are not loaded')
    if (!isAddress(account)) throw new Error('Account is not a valid address, is it check summed?')
    const [riskyToken, stableToken] = this.tokens

    const spender = this.rmm.connection.addresses.primitiveManager
    // approve max uint if lower than min amounts
    try {
      const [riskyAllowance, stableAllowance] = await Promise.all([
        riskyToken.allowance(account, spender),
        stableToken.allowance(account, spender),
      ])

      if (amounts[0].gt(riskyAllowance)) await riskyToken.approve(spender, MaxUint256)
      if (amounts[1].gt(stableAllowance)) await stableToken.approve(spender, MaxUint256)
    } catch (e) {
      log(`Caught on approving tokens`)
      throw new Error(e as any)
    }
  }

  /**
   * Mints testnet tokens to use for pool deployment.
   *
   * @beta
   */
  async mintTestnetTokens(account: string, amounts: [Wei, Wei]): Promise<void> {
    if (typeof this.tokens === 'undefined') throw new Error('Tokens are not loaded')
    if (!isAddress(account)) throw new Error('Account is not a valid address, is it check summed?')
    const [riskyToken, stableToken] = this.tokens
    // mint tokens if not enough in balances
    try {
      const balances = await Promise.all([riskyToken.balanceOf(account), stableToken.balanceOf(account)])
      if ((riskyToken as ERC20)?.mint) {
        if (amounts[0].gt(balances[0])) await (riskyToken as ERC20).mint(account, amounts[0].raw.toHexString())
      }
      if ((stableToken as ERC20)?.mint) {
        if (amounts[1].gt(balances[1])) await (stableToken as ERC20).mint(account, amounts[1].raw.toHexString())
      }
    } catch (e) {
      log(`Caught on minting tokens`)
      throw new Error(e as any)
    }
  }
}

async function getPoolTokensFromDeployment(
  name: string,
  chainId: number,
  path: string,
): Promise<[TokenLike | undefined, TokenLike | undefined]> {
  const data = (await readLog(chainId, name, path)) as IPoolDeploymentsJSON
  return [data?.risky, data?.stable]
}

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
