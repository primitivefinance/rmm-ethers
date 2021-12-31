import { EthersRmmConnection } from './EthersRmmConnection'
import { ReadableEthersRmm } from './ReadableEthersRmm'
import { PopulatableEthersRmm } from './PopulatableEthersRmm'
import { SendableEthersRmm } from './SendableEthersRmm'
import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from 'ethers'
import { _connect } from '.'

/**
 * Combines interfaces of this library.
 *
 * @beta
 */
export class EthersRmm implements ReadableEthersRmm {
  /** Connection to rmm protocol. */
  readonly connection: EthersRmmConnection

  /** Populate transaction. */
  readonly populate: PopulatableEthersRmm

  /** Execute transactions. */
  readonly send: SendableEthersRmm

  private _readable: ReadableEthersRmm

  /** @internal */
  constructor(readable: ReadableEthersRmm) {
    this._readable = readable
    this.connection = readable.connection
    this.populate = new PopulatableEthersRmm(readable)
    this.send = new SendableEthersRmm(this.populate)
  }

  static _from(connection: EthersRmmConnection): EthersRmm {
    return new EthersRmm(ReadableEthersRmm._from(connection))
  }

  /**
   * Connects to rmm protocol and instantiates `EthersRmm` object.
   *
   * @beta
   */
  static async connect(signerOrProvider: Signer | Provider): Promise<EthersRmm> {
    return EthersRmm._from(await _connect(signerOrProvider))
  }
}
