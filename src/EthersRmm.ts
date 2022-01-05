import { EthersRmmConnection } from './EthersRmmConnection'
import { ReadableEthersRmm } from './ReadableEthersRmm'
import { PopulatableEthersRmm } from './PopulatableEthersRmm'
import { SendableEthersRmm } from './SendableEthersRmm'
import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from 'ethers'
import {
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

  /**
   * {@inheritdoc}
   */
  allocate(params: PositionAllocateParams, overrides?: EthersTransactionOverrides): Promise<PositionAdjustmentDetails> {
    return this.send.allocate(params, overrides).then(waitForSuccess)
  }

  createPool(
    params: PositionAllocateParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<PositionAdjustmentDetails> {
    if (!params.options.createPool) throw new Error('Attempting to create pool without flagging createPool.')
    return this.send.allocate(params, overrides).then(waitForSuccess)
  }

  remove(params: PositionRemoveParams, overrides?: EthersTransactionOverrides): Promise<PositionAdjustmentDetails> {
    return this.send.remove(params, overrides).then(waitForSuccess)
  }

  safeTransfer(params: PositionTransferParams, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.safeTransfer(params, overrides).then(waitForSuccess)
  }

  safeBatchTransfer(params: PositionBatchTransferParams, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.safeBatchTransfer(params, overrides).then(waitForSuccess)
  }

  createEngine(params: EngineCreationParams, overrides?: EthersTransactionOverrides): Promise<EngineCreationDetails> {
    return this.send.createEngine(params, overrides).then(waitForSuccess)
  }

  getPool(poolId: string, overrides?: EthersTransactionOverrides): Promise<Pool> {
    return this._readable.getPool(poolId, overrides)
  }

  getLiquidityBalance(poolId: string, address: string, overrides?: EthersTransactionOverrides): Promise<Wei> {
    return this._readable.getLiquidityBalance(poolId, address, overrides)
  }

  getPosition(pool: Pool, address: string, overrides?: EthersTransactionOverrides): Promise<Position> {
    return this._readable.getPosition(pool, address, overrides)
  }
}
