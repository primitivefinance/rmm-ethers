import { ErrorCode } from '@ethersproject/logger'
import { Transaction } from '@ethersproject/transactions'
import { MethodParameters, PeripheryManager, FactoryManager, weiToWei } from '@primitivefi/rmm-sdk'
import { Contract } from 'ethers'
import { toBN } from 'web3-units'
import { EthersTransactionOverrides, EthersTransactionRequest, _getContracts } from '.'

import { EthersRmmConnection } from './EthersRmmConnection'
import { Position } from './Position'
import { ReadableEthersRmm } from './ReadableEthersRmm'
import {
  SentRmmTransaction,
  MinedReceipt,
  RmmReceipt,
  _failedReceipt,
  _pendingReceipt,
  _successfulReceipt,
} from './SendableEthersRmm'
import {
  EngineCreationDetails,
  EngineCreationParams,
  PositionAdjustmentDetails,
  PositionAllocateParams,
  PositionBatchTransferParams,
  PositionRemoveParams,
  PositionTransferParams,
  _PoolAction,
} from './types/transactable'

import { EthersTransactionReceipt, EthersTransactionResponse } from './types/base'

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

// --- Sendable ---

/**
 * Implements {@link SentRmmTransaction}
 *
 * @remarks
 * Instantiates a Sent transaction class which is awaiting a receipt, with methods to get or wait for its receipt.
 *
 * T = details
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

  /** @internal */
  private _receiptFrom(rawReceipt: EthersTransactionReceipt | null) {
    return rawReceipt
      ? rawReceipt.status
        ? _successfulReceipt(rawReceipt, this._parse(rawReceipt), undefined)
        : _failedReceipt(rawReceipt)
      : _pendingReceipt
  }

  /** @internal */
  private async _waitForRawReceipt(confirmations?: number) {
    try {
      return await this.rawSentTransaction.wait(confirmations)
    } catch (error) {
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

// --- Populatable Ethers ---

/**
 * A ready to send transaction with generic types.
 *
 * @beta
 */
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
 * Implements {@link PopulatedRmmTransaction}
 *
 * @remarks
 * Instantiates a populated transaction from a signer.
 * Important! This is by sending a raw tx directly from a signer, rather than a tx from a contract.
 * For example, managerContract.populate.allocate() would return an EthersPopulatedTransaction, not an EthersTransactionRequest.
 * Instead, this is doing signer.populate(rawAllocateTx), which returns an EthersTransactionRequest.
 *
 * @beta
 */
export class PopulatedEthersSignerTransaction<T = unknown>
  implements PopulatedRmmTransaction<EthersTransactionRequest, SentEthersRmmTransaction<T>>
{
  readonly rawPopulatedTransaction: EthersTransactionRequest

  private readonly _connection: EthersRmmConnection
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T

  /** @internal */
  constructor(
    rawPopulatedTransaction: EthersTransactionRequest,
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
 * Prepare rmm transactions for sending from signer.
 *
 * @remarks
 * Implemented by {@link PopulatableEthersRmm}
 * R = Receipt type, S = SentTransaction type, P = populated transaction type
 *
 * @beta
 */
export interface PopulatableRmm<R = unknown, S = unknown, P = unknown> {
  /**
   * Allocates liquidity by depositing both pool tokens.
   *
   * @beta
   */
  allocate(
    params: PositionAllocateParams,
  ): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, PositionAdjustmentDetails>>>>

  /**
   *
   * @param params Remove liquidity from pool and withdraws token
   */
  remove(
    params: PositionRemoveParams,
  ): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, PositionAdjustmentDetails>>>>

  /**
   * Transfers liquidity to a `recipient` account.
   */
  safeTransfer(
    params: PositionTransferParams,
  ): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, void>>>>

  /**
   * Transfers a batch of liquidity tokens to a `recipient` account.
   */
  safeBatchTransfer(
    params: PositionBatchTransferParams,
  ): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, void>>>>

  /**
   * Deploys a new Engine contract
   *
   * @beta
   */
  createEngine(
    params: EngineCreationParams,
  ): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, EngineCreationDetails>>>>
}

/** @internal */
export interface _PositionChange<T> {
  params: T
  newPosition: Position
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
  implements PopulatableRmm<EthersTransactionReceipt, EthersTransactionResponse, EthersTransactionRequest>
{
  private readonly _readable: ReadableEthersRmm

  constructor(readable: ReadableEthersRmm) {
    this._readable = readable
  }

  private _wrap<P>(rawPopulatedTransaction: P): PopulatedEthersSignerTransaction<void> {
    return new PopulatedEthersSignerTransaction(rawPopulatedTransaction, this._readable.connection, () => undefined)
  }

  /** Gets PopulatedEthersSignerTransaction object and adds a parse function to use when receipt is received. */
  private _wrapPositionChange<T extends _PoolAction, P>(
    params: T,
    rawPopulatedTransaction: P,
  ): PopulatedEthersSignerTransaction<_PositionChange<T>> {
    const { primitiveManager } = _getContracts(this._readable.connection)

    return new PopulatedEthersSignerTransaction(rawPopulatedTransaction, this._readable.connection, ({ logs }) => {
      const [created] = primitiveManager
        .extractEvents(logs, 'Create')
        .map(({ args: { poolId } }) => poolId === params.pool.poolId)

      let [newPosition] = created
        ? [new Position(params.pool)] // FIX!: no way to get new liquidity from created pool
        : primitiveManager
            .extractEvents(logs, 'Allocate')
            .map(({ args: { delLiquidity } }) => new Position(params.pool, weiToWei(delLiquidity.toString())))

      if (!newPosition)
        [newPosition] = primitiveManager
          .extractEvents(logs, 'Remove')
          .map(({ args: { delLiquidity } }) => new Position(params.pool, weiToWei(delLiquidity.toString())))

      return {
        params,
        newPosition,
      }
    })
  }

  private async _applyGasLimit(
    contract: Contract,
    txParams: MethodParameters,
    overrides?: EthersTransactionOverrides,
  ): Promise<EthersTransactionRequest> {
    // returns tx object with overrides applied, so we can use to get gas limit
    const tx = () => {
      return { to: contract.address, data: txParams.calldata, value: txParams.value, ...overrides }
    }

    // gets gas limit, and updates overrides...
    // therefore calling tx() will have the new gas limit
    const prevTx = tx() as EthersTransactionRequest
    if (!prevTx?.gasLimit) {
      const gas = await contract.signer.estimateGas(prevTx)
      const gasLimit = gas.mul(150).div(100)
      overrides = { ...overrides, gasLimit }
    }
    const nextTx = tx()
    const populated = await contract.signer.populateTransaction(nextTx)
    return populated
  }

  /** Gets a ready-to-send from a signer populated ethers transaction for allocating liquidity. */
  async allocate(
    params: PositionAllocateParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<PopulatedEthersSignerTransaction<PositionAdjustmentDetails>> {
    const { primitiveManager } = _getContracts(this._readable.connection)

    const populated = await this._applyGasLimit(
      primitiveManager.contract,
      PeripheryManager.allocateCallParameters(params.pool, params.options),
      overrides,
    )

    return this._wrapPositionChange(params, populated)
  }

  /** Populates a remove liquidity transaction. */
  async remove(
    params: PositionRemoveParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<PopulatedEthersSignerTransaction<PositionAdjustmentDetails>> {
    const { primitiveManager } = _getContracts(this._readable.connection)

    const populated = await this._applyGasLimit(
      primitiveManager.contract,
      PeripheryManager.removeCallParameters(params.pool, params.options),
      overrides,
    )

    return this._wrapPositionChange(params, populated)
  }

  /** Deploys an Engine. */
  async createEngine(
    params: EngineCreationParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<PopulatedEthersSignerTransaction<EngineCreationDetails>> {
    const { primitiveFactory } = _getContracts(this._readable.connection)

    const populated = await this._applyGasLimit(
      primitiveFactory.contract,
      {
        calldata: FactoryManager.encodeDeploy(params.risky, params.stable),
        value: toBN(0)._hex,
      },
      overrides,
    )

    return new PopulatedEthersSignerTransaction(populated, this._readable.connection, ({ logs }) => {
      const [engine] = primitiveFactory.extractEvents(logs, 'DeployEngine').map(({ args: { engine } }) => engine)
      return {
        params,
        engine: engine,
      }
    })
  }

  /** Transfer liquidity. */
  async safeTransfer(
    params: PositionTransferParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<PopulatedEthersSignerTransaction<void>> {
    const { primitiveManager } = _getContracts(this._readable.connection)

    const populated = await this._applyGasLimit(
      primitiveManager.contract,
      PeripheryManager.safeTransferFromParameters(params.options),
      overrides,
    )

    return this._wrap(populated)
  }

  /** Batch transfer liquidity positions. */
  async safeBatchTransfer(
    params: PositionBatchTransferParams,
    overrides?: EthersTransactionOverrides,
  ): Promise<PopulatedEthersSignerTransaction<void>> {
    const { primitiveManager } = _getContracts(this._readable.connection)

    const populated = await this._applyGasLimit(
      primitiveManager.contract,
      PeripheryManager.batchTransferFromParameters(params.options),
      overrides,
    )

    return this._wrap(populated)
  }
}
