import {
  AllocateOptions,
  BatchTransferOptions,
  Pool,
  RemoveOptions,
  SafeTransferOptions,
  SwapOptions,
} from '@primitivefi/rmm-sdk'
import { FailedReceipt } from '.'
import { Position } from './Position'

/**
 * Thrown by {@link TransactableRmm} functions in case of transaction failure.
 *
 * @public
 */
export class TransactionFailedError<T extends FailedReceipt = FailedReceipt> extends Error {
  readonly failedReceipt: T

  /** @internal */
  constructor(name: string, message: string, failedReceipt: T) {
    super(message)
    this.name = name
    this.failedReceipt = failedReceipt
  }
}

// --- Params ---

/** @internal */ export type _PoolAction = { pool: Pool }

/** Parameters of an allocate transaction. */
export type PositionAllocateParams<T = unknown> = _PoolAction & { options: AllocateOptions }

/** Parameters of removing liquidity transaction. */
export type PositionRemoveParams = _PoolAction & { options: RemoveOptions }

/** Parameters of transferring ERC-1155 liquidity tokens. */
export type PositionTransferParams = { options: SafeTransferOptions }

/** Parameters of transferring a batch ERC-1155 liquidity tokens. */
export type PositionBatchTransferParams = { options: BatchTransferOptions }

/** Parameters of a swap transaction. */
export type SwapParams = _PoolAction & { options: SwapOptions }

/** Parameters of deploy engine transaction. */
export type EngineCreationParams = { risky: string; stable: string }

// --- Receipt Details ---

/** Receipt details returned from a transaction adjusting a Position. */
export interface PositionAdjustmentDetails {
  /** Parameters of allocate tx. */
  params: PositionAllocateParams | PositionRemoveParams

  /** Updated state of the adjusted Position directly after the transaction. */
  newPosition: Position

  /** Flag to signal a pool was created. */
  createdPool?: boolean
}

/** Aliased string to for Engine addresses. */
export type EngineAddress = string

/** Receipt details returned from deploying an Engine. */
export interface EngineCreationDetails {
  /** Engine creation parameters. */
  params: EngineCreationParams

  /** Deployed engine address. */
  engine: EngineAddress
}
