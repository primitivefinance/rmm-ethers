import { Pool, weiToWei } from '@primitivefi/rmm-sdk'
import { Wei } from 'web3-units'
import { EthersCallOverrides, EthersProvider, EthersRmmConnection, EthersSigner, _connect, _getContracts } from '.'
import { Position } from './Position'
import { poolify } from './utils'

/**
 * Read state of Rmm protocol.
 *
 * @beta
 */
export interface ReadableRmm {
  /** Connection to Rmm protocol. */
  readonly connection: EthersRmmConnection

  /** Constructs a {@link @primitivefi/rmm-sdk#Pool} entity from a `poolId`. */
  getPool(poolId: string, overrides?: EthersCallOverrides): Promise<Pool>

  /** Fetches `account`'s balance of liquidity for `poolId`. */
  getLiquidityBalance(poolId: string, address: string, overrides?: EthersCallOverrides): Promise<Wei>

  /** Constructs a {@link Position} entity from a Pool entity and by fetching the `account`'s balance of liquidity. */
  getPosition(pool: Pool, address: string, overrides?: EthersCallOverrides): Promise<Position>
}

/**
 * Implements {@link ReadableRmm}
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

  /** {@inheritdoc ReadableRmm.getPool} */
  getPool(poolId: string, overrides?: EthersCallOverrides): Promise<Pool> {
    const { primitiveManager } = _getContracts(this.connection)
    return primitiveManager.uri(poolId).then(poolify)
  }

  /** {@inheritdoc ReadableRmm.getLiquidityBalance} */
  getLiquidityBalance(poolId: string, address: string, overrides?: EthersCallOverrides): Promise<Wei> {
    const { primitiveManager } = _getContracts(this.connection)

    return primitiveManager
      .balanceOf(address, poolId)
      .then((bal: { toString: () => string }) => weiToWei(bal.toString()))
  }

  /** {@inheritdoc ReadableRmm.getPosition} */
  getPosition(pool: Pool, address: string, overrides?: EthersCallOverrides): Promise<Position> {
    return this.getLiquidityBalance(pool.poolId, address, overrides).then(val => new Position(pool, val))
  }
}
