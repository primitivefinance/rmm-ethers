import {
  AllocateOptions,
  BatchTransferOptions,
  Pool,
  RemoveOptions,
  SafeTransferOptions,
  SwapOptions,
} from '@primitivefi/rmm-sdk'
import { Position } from '../Position'

// --- Params ---

/** @internal */ export type _PoolAction = { pool: Pool }

/** @internal */ export type _TransactionHash = { hash?: string }

/** Parameters of an allocate transaction. @beta */
export type PositionAllocateParams<T = unknown> = _PoolAction & { options: AllocateOptions }

/** Parameters of removing liquidity transaction. @beta */
export type PositionRemoveParams = _PoolAction & { options: RemoveOptions }

/** Parameters of transferring ERC-1155 liquidity tokens. @beta */
export type PositionTransferParams = { options: SafeTransferOptions }

/** Parameters of transferring a batch ERC-1155 liquidity tokens. @beta */
export type PositionBatchTransferParams = { options: BatchTransferOptions }

/** Parameters of a swap transaction. @beta */
export type SwapParams = _PoolAction & { options: SwapOptions }

/** Parameters of deploy engine transaction. @beta */
export type EngineCreationParams = { risky: string; stable: string }

// --- Receipt Details ---

/** Receipt details returned from a transaction adjusting a Position. @beta. */
export interface PositionAdjustmentDetails extends _TransactionHash {
  /** Parameters of allocate tx. */
  params: PositionAllocateParams | PositionRemoveParams

  /** Updated state of the adjusted Position directly after the transaction. */
  newPosition: Position

  /** Flag to signal a pool was created. */
  createdPool?: boolean
}

/** Aliased string to for Engine addresses. @beta*/
export type EngineAddress = string

/** Receipt details returned from deploying an Engine. @beta*/
export interface EngineCreationDetails extends _TransactionHash {
  /** Engine creation parameters. */
  params: EngineCreationParams

  /** Deployed engine address. */
  engine: EngineAddress
}
