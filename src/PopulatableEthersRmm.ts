import { ErrorCode } from '@ethersproject/logger'
import { Transaction } from '@ethersproject/transactions'

import { EthersRmmConnection } from './EthersRmmConnection'
import { ReadableEthersRmm } from './ReadableEthersRmm'
import {
  SentRmmTransaction,
  MinedReceipt,
  RmmReceipt,
  _failedReceipt,
  _pendingReceipt,
  _successfulReceipt,
} from './SendableEthersRmm'

import { EthersPopulatedTransaction, EthersTransactionReceipt, EthersTransactionResponse } from './types'

// --- Transaction Failed ---
/** @internal */
export enum _RawErrorReason {
  TRANSACTION_FAILED = 'transaction failed',
  TRANSACTION_CANCELLED = 'cancelled',
  TRANSACTION_REPLACED = 'replaced',
  TRANSACTION_REPRICED = 'repriced',
}

interface RawTransactionFailedError extends Error {
  code: ErrorCode.CALL_EXCEPTION
  reason: _RawErrorReason.TRANSACTION_FAILED
  transactionHash: string
  transaction: Transaction
  receipt: EthersTransactionReceipt
}

const hasProp = <T, P extends string>(o: T, p: P): o is T & { [_ in P]: unknown } => p in o

const isTransactionFailedError = (error: Error): error is RawTransactionFailedError =>
  hasProp(error, 'code') &&
  error.code === ErrorCode.CALL_EXCEPTION &&
  hasProp(error, 'reason') &&
  error.reason === _RawErrorReason.TRANSACTION_FAILED

// --- Populatable Ethers ---

/** A ready to build populated transaction class with generic types. */
export interface PopulatableRmm<R = unknown, S = unknown, P = unknown> {}

/** A ready to send transaction with generic types. */
export interface PopulatedRmmTransaction<P = unknown, T extends SentRmmTransaction = SentRmmTransaction> {
  /** Implementable populated transaction object. */
  readonly rawPopulatedTransaction: P

  /**
   * Send the transaction.
   *
   * @returns An object that implements {@link SentRmmTransaction}
   *
   * @beta
   */
  send(): Promise<T>
}

/**
 * Implements {@link SentRmmTransaction}
 *
 * @remarks
 * Instantiates a Sent transaction class which is awaiting a receipt, with methods to get or wait for its receipt.
 *
 * @beta
 */
export class SentEthersRmmTransaction<T = unknown>
  implements SentRmmTransaction<EthersTransactionResponse, RmmReceipt<EthersTransactionReceipt, T>>
{
  readonly rawSentTransaction: EthersTransactionResponse

  private readonly _connection: EthersRmmConnection
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T

  /** @internal */
  constructor(
    rawSentTransaction: EthersTransactionResponse,
    connection: EthersRmmConnection,
    parse: (rawReceipt: EthersTransactionReceipt) => T,
  ) {
    this.rawSentTransaction = rawSentTransaction
    this._connection = connection
    this._parse = parse
  }

  private _receiptFrom(rawReceipt: EthersTransactionReceipt | null) {
    return rawReceipt
      ? rawReceipt.status
        ? _successfulReceipt(rawReceipt, this._parse(rawReceipt), () => '')
        : _failedReceipt(rawReceipt)
      : _pendingReceipt
  }

  private async _waitForRawReceipt(confirmations?: number) {
    try {
      return await this.rawSentTransaction.wait(confirmations)
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (isTransactionFailedError(error)) {
          return error.receipt
        }
      }
      throw error
    }
  }

  async getReceipt(): Promise<RmmReceipt<EthersTransactionReceipt, T>> {
    return this._receiptFrom(await this._waitForRawReceipt(0))
  }

  async waitForReceipt(): Promise<MinedReceipt<EthersTransactionReceipt, T>> {
    const receipt = this._receiptFrom(await this._waitForRawReceipt())

    if (receipt.status === 'pending') throw new Error('Still pending')
    return receipt
  }
}

/**
 * Implements {@link PopulatedRmmTransaction}
 *
 * @remarks
 * Instantiates a populated transaction with a connection and method to parse its receipt info.
 *
 * @beta
 */
export class PopulatedEthersRmmTransaction<T = unknown>
  implements PopulatedRmmTransaction<EthersPopulatedTransaction, SentEthersRmmTransaction<T>>
{
  readonly rawPopulatedTransaction: EthersPopulatedTransaction

  private readonly _connection: EthersRmmConnection
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T

  /** @internal */
  constructor(
    rawPopulatedTransaction: EthersPopulatedTransaction,
    connection: EthersRmmConnection,
    parse: (rawReceipt: EthersTransactionReceipt) => T,
  ) {
    this.rawPopulatedTransaction = rawPopulatedTransaction
    this._connection = connection
    this._parse = parse
  }

  async send(): Promise<SentEthersRmmTransaction<T>> {
    return new SentEthersRmmTransaction(
      await this._connection.signer.sendTransaction(this.rawPopulatedTransaction),
      this._connection,
      this._parse,
    )
  }
}

/**
 * Implements {@link PopulatableRmm}
 *
 * @remarks
 * Instantiates Populated transaction classes from the readable connection.
 *
 * @beta
 */
export class PopulatableEthersRmm
  implements PopulatableRmm<EthersTransactionReceipt, EthersTransactionResponse, EthersPopulatedTransaction>
{
  private readonly _readable: ReadableEthersRmm

  constructor(readable: ReadableEthersRmm) {
    this._readable = readable
  }

  private _wrap(rawPopulatedTransaction: EthersPopulatedTransaction): PopulatedEthersRmmTransaction<void> {
    return new PopulatedEthersRmmTransaction(rawPopulatedTransaction, this._readable.connection, () => undefined)
  }
}
