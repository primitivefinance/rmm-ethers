import { EthersRmmConnection } from './EthersRmmConnection'
import { ReadableEthersRmm } from './ReadableEthersRmm'
import { PopulatableEthersRmm } from './PopulatableEthersRmm'
import { SendableEthersRmm } from './SendableEthersRmm'
import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from 'ethers'
import {
  EngineAddress,
  EthersCallOverrides,
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  FailedReceipt,
  SentEthersRmmTransaction,
  _connect,
} from '.'
import { Position } from './Position'
import {
  EngineCreationParams,
  TransactionFailedError,
  PositionAllocateParams,
  PositionAdjustmentDetails,
  PositionTransferParams,
  PositionBatchTransferParams,
  PositionRemoveParams,
  EngineCreationDetails,
} from './TransactableRmm'
import { Pool } from '@primitivefi/rmm-sdk'
import { Wei } from 'web3-units'

/**
 * Thrown by {@link EthersRmm} in case of transaction failure.
 *
 * @public
 */
export class EthersTransactionFailedError extends TransactionFailedError<FailedReceipt<EthersTransactionReceipt>> {
  constructor(message: string, failedReceipt: FailedReceipt<EthersTransactionReceipt>) {
    super('EthersTransactionFailedError', message, failedReceipt)
  }
}

const waitForSuccess = async <T>(tx: SentEthersRmmTransaction<T>) => {
  const receipt = await tx.waitForReceipt()

  if (receipt.status !== 'succeeded') {
    throw new EthersTransactionFailedError('Transaction failed', receipt)
  }

  return receipt.details
}

/**
 * Exposes all public functions of this library.
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

  /** Rmm protocol state. */
  private _readable: ReadableEthersRmm

  /** @internal */
  constructor(readable: ReadableEthersRmm) {
    this._readable = readable
    this.connection = readable.connection
    this.populate = new PopulatableEthersRmm(readable)
    this.send = new SendableEthersRmm(this.populate)
  }

  static _from(connection: EthersRmmConnection): EthersRmm {
    const readable = ReadableEthersRmm._from(connection)
    return new EthersRmm(readable)
  }

  /**
   * Connects to rmm protocol and instantiates `EthersRmm` object.
   *
   * @beta
   */
  static async connect(signerOrProvider: Signer | Provider): Promise<EthersRmm> {
    const connection = await _connect(signerOrProvider)
    return EthersRmm._from(connection)
  }

  /** {@inheritdoc SendableEthersRmm.allocate} */
  allocate(params: PositionAllocateParams, overrides?: EthersTransactionOverrides): Promise<PositionAdjustmentDetails> {
    return this.send.allocate(params, overrides).then(waitForSuccess)
  }

  /** {@inheritdoc SendableEthersRmm.createPool} */
  createPool(
    params: PositionAllocateParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<PositionAdjustmentDetails> {
    if (!params.options.createPool) throw new Error('Attempting to create pool without flagging createPool.')
    return this.send.allocate(params, overrides).then(waitForSuccess)
  }

  /** {@inheritdoc SendableEthersRmm.remove} */
  remove(params: PositionRemoveParams, overrides?: EthersTransactionOverrides): Promise<PositionAdjustmentDetails> {
    return this.send.remove(params, overrides).then(waitForSuccess)
  }

  /** {@inheritdoc SendableEthersRmm.safeTransfer} */
  safeTransfer(params: PositionTransferParams, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.safeTransfer(params, overrides).then(waitForSuccess)
  }

  /** {@inheritdoc SendableEthersRmm.safeBatchTransfer} */
  safeBatchTransfer(params: PositionBatchTransferParams, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.safeBatchTransfer(params, overrides).then(waitForSuccess)
  }

  /** {@inheritdoc SendableEthersRmm.createEngine} */
  createEngine(params: EngineCreationParams, overrides?: EthersTransactionOverrides): Promise<EngineCreationDetails> {
    return this.send.createEngine(params, overrides).then(waitForSuccess)
  }

  /** {@inheritdoc ReadableRmm.getPool} */
  getPool(poolId: string, overrides?: EthersCallOverrides): Promise<Pool> {
    return this._readable.getPool(poolId, overrides)
  }

  /** {@inheritdoc ReadableRmm.getLiquidityBalance} */
  getLiquidityBalance(poolId: string, address: string, overrides?: EthersCallOverrides): Promise<Wei> {
    return this._readable.getLiquidityBalance(poolId, address, overrides)
  }

  /** {@inheritdoc ReadableRmm.getPosition} */
  getPosition(pool: Pool, address: string, overrides?: EthersCallOverrides): Promise<Position> {
    return this._readable.getPosition(pool, address, overrides)
  }

  /** {@inheritdoc ReadableRmm.getEngine} */
  getEngine(riskyAddress: string, stableAddress: string, overrides?: EthersCallOverrides): Promise<EngineAddress> {
    return this._readable.getEngine(riskyAddress, stableAddress, overrides)
  }
}
