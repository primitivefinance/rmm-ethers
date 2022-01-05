// --- Receipt Types ---

import {
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  EthersTransactionResponse,
  PopulatableEthersRmm,
  PopulatedEthersSignerTransaction,
  SentEthersRmmTransaction,
} from '.'
import {
  EngineCreationDetails,
  EngineCreationParams,
  PositionAdjustmentDetails,
  PositionAllocateParams,
  PositionBatchTransferParams,
  PositionRemoveParams,
  PositionTransferParams,
} from './TransactableRmm'

/**
 * Indicates that the transaction hasn't been mined yet.
 *
 * @remarks
 * Returned by {@link SentRmmTransaction.getReceipt}.
 *
 * @public
 */
export type PendingReceipt = { status: 'pending' }

/** @internal */
export const _pendingReceipt: PendingReceipt = { status: 'pending' }

/**
 * Indicates that the transaction has been mined, but it failed.
 *
 * @remarks
 * The `rawReceipt` property is an implementation-specific transaction receipt object.
 *
 * Returned by {@link SentRmmTransaction.getReceipt} and
 * {@link SentRmmTransaction.waitForReceipt}.
 *
 * @public
 */
export type FailedReceipt<R = unknown> = { status: 'failed'; rawReceipt: R }

/** @internal */
export const _failedReceipt = <R>(rawReceipt: R): FailedReceipt<R> => ({
  status: 'failed',
  rawReceipt,
})

/**
 * Either a {@link FailedReceipt} or a {@link SuccessfulReceipt}.
 *
 * @remarks
 * If successful receipt, a parse method can be passed to return useful details about the transaction, used as `D`.
 *
 * @public
 */
export type MinedReceipt<R = unknown, D = unknown> = FailedReceipt<R> | SuccessfulReceipt<R, D>

/**
 * Indicates that the transaction has succeeded.
 *
 * @remarks
 * The `rawReceipt` property is an implementation-specific transaction receipt object.
 *
 * The `details` property may contain more information about the transaction.
 * See the return types of {@link TransactableRmm} functions for the exact contents of `details`
 * for each type of Rmm transaction.
 *
 * Returned by {@link SentRmmTransaction.getReceipt} and
 * {@link SentRmmTransaction.waitForReceipt}.
 *
 * @public
 */
export type SuccessfulReceipt<R = unknown, D = unknown> = {
  status: 'succeeded'
  rawReceipt: R
  details: D
}

/** @internal */
export const _successfulReceipt = <R, D>(
  rawReceipt: R,
  details: D,
  toString?: () => string,
): SuccessfulReceipt<R, D> => ({
  status: 'succeeded',
  rawReceipt,
  details,
  ...(toString ? { toString } : {}),
})

/**
 * One of either a {@link PendingReceipt}, a {@link FailedReceipt} or a {@link SuccessfulReceipt}.
 *
 * @public
 */
export type RmmReceipt<R = unknown, D = unknown> = PendingReceipt | MinedReceipt<R, D>

// --- Interfaces ---

export interface SentRmmTransaction<S = unknown, T extends RmmReceipt = RmmReceipt> {
  /** Implementable sent transaction object. */
  readonly rawSentTransaction: S

  /**
   * Check whether the transaction has been mined.
   *
   * @public
   */
  getReceipt(): Promise<T>

  /**
   * Wait for the transaction to be mined.
   *
   * @public
   */
  waitForReceipt(): Promise<Extract<T, MinedReceipt>>
}

export interface SendableRmm<R = unknown, S = unknown> {}

// --- Classes ---

const sendTransaction = <T>(tx: PopulatedEthersSignerTransaction<T>) => tx.send()

/**
 * Ethers implementation of {@link SendableRmm}
 *
 * @beta
 */
export class SendableEthersRmm implements SendableRmm<EthersTransactionReceipt, EthersTransactionResponse> {
  private _populate: PopulatableEthersRmm

  constructor(populate: PopulatableEthersRmm) {
    this._populate = populate
  }

  /** Executes an allocate liquidity transaction from a signer. */
  async allocate(
    params: PositionAllocateParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<SentEthersRmmTransaction<PositionAdjustmentDetails>> {
    return this._populate.allocate(params, overrides).then(sendTransaction)
  }

  /** Executes a remove liquidity transaction. */
  async remove(
    params: PositionRemoveParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<SentEthersRmmTransaction<PositionAdjustmentDetails>> {
    return this._populate.remove(params, overrides).then(sendTransaction)
  }

  /** Executes a remove liquidity transaction. */
  async safeTransfer(
    params: PositionTransferParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<SentEthersRmmTransaction<void>> {
    return this._populate.safeTransfer(params, overrides).then(sendTransaction)
  }
  /** Executes a remove liquidity transaction. */
  async safeBatchTransfer(
    params: PositionBatchTransferParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<SentEthersRmmTransaction<void>> {
    return this._populate.safeBatchTransfer(params, overrides).then(sendTransaction)
  }

  /** Executes a deploy engine transaction from the primitive factory using the signer. */
  async createEngine(
    params: EngineCreationParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<SentEthersRmmTransaction<EngineCreationDetails>> {
    return this._populate.createEngine(params, overrides).then(sendTransaction)
  }
}
