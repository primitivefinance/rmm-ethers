import { Pool, weiToWei } from '@primitivefi/rmm-sdk'
import { Wei } from 'web3-units'
import { EthersProvider, EthersRmmConnection, EthersSigner, _connect, _getContracts } from '.'
import { Position } from './Position'

/**
 * @param uri JSON string with a `base64` encoding
 * @returns Parsed JSON
 */
export function parseTokenURI(uri: string) {
  const json = Buffer.from(uri.substring(29), 'base64').toString() //(uri.substring(29));
  const result = JSON.parse(json)
  return result
}

export function poolify(raw: string): Pool {
  const data = parseTokenURI(raw)
  const {
    factory,
    riskyName,
    riskySymbol,
    riskyDecimals,
    riskyAddress,
    stableName,
    stableSymbol,
    stableDecimals,
    stableAddress,
    strike,
    sigma,
    gamma,
    maturity,
    lastTimestamp,
    reserveRisky,
    reserveStable,
    liquidity,
    invariant,
    chainId,
  } = data.properties

  const risky = { address: riskyAddress, name: riskyName, symbol: riskySymbol, decimals: riskyDecimals }
  const stable = { address: stableAddress, name: stableName, symbol: stableSymbol, decimals: stableDecimals }
  const calibration = { strike, sigma, maturity, lastTimestamp, gamma }
  const reserve = { reserveRisky, reserveStable, liquidity }
  return new Pool(
    chainId,
    factory,
    { ...risky },
    { ...stable },
    { ...calibration },
    { ...reserve },
    invariant,
    undefined,
  )
}

/**
 * Read state of Rmm protocol.
 *
 * @beta
 */
export interface ReadableRmm {}

/**
 * Implements {@link ReadableEthersRmm}
 *
 * @beta
 */
export class ReadableEthersRmm implements ReadableRmm {
  readonly connection: EthersRmmConnection

  /** @internal */
  constructor(connection: EthersRmmConnection) {
    this.connection = connection
  }

  /** @internal */
  static _from(connection: EthersRmmConnection): ReadableEthersRmm {
    return new ReadableEthersRmm(connection)
  }

  /**
   * Connect to Rmm protocol and instantiate `ReadableEthersRmm` object.
   *
   * @param signerOrProvider Ethers `signer` or `provider`.
   *
   * @beta
   */
  static async connect(signerOrProvider: EthersSigner | EthersProvider): Promise<ReadableEthersRmm> {
    return ReadableEthersRmm._from(await _connect(signerOrProvider))
  }

  getPool(poolId: string, overrides?: any): Promise<Pool> {
    const { primitiveManager } = _getContracts(this.connection)
    return primitiveManager.uri(poolId).then(poolify)
  }

  getLiquidityBalance(poolId: string, address: string, overrides?: any): Promise<Wei> {
    const { primitiveManager } = _getContracts(this.connection)

    return primitiveManager
      .balanceOf(address, poolId)
      .then((bal: { toString: () => string }) => weiToWei(bal.toString()))
  }

  getPosition(pool: Pool, address: string, overrides?: any): Promise<Position> {
    return this.getLiquidityBalance(pool.poolId, address, overrides).then(val => new Position(pool, val))
  }
}
