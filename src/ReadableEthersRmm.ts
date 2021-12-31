import { EthersProvider, EthersRmmConnection, EthersSigner, _connect } from '.'

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
}
