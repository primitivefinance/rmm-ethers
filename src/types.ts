import { Provider, BlockTag } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { TransactionResponse, TransactionReceipt, TransactionRequest } from '@ethersproject/abstract-provider'
import { PopulatedTransaction } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'

/**
 * Alias of Ethers' abstract
 * {@link https://docs.ethers.io/v5/api/providers/ | Provider} type.
 *
 * @public
 */
export type EthersProvider = Provider

/**
 * Alias of Ethers' abstract
 * {@link https://docs.ethers.io/v5/api/signer/ | Signer} type.
 *
 * @public
 */
export type EthersSigner = Signer

/**
 * Alias of Ethers'
 * {@link https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse | TransactionResponse}
 * type.
 *
 * @public
 */
export type EthersTransactionResponse = TransactionResponse

/**
 * Alias of Ethers'
 * {@link https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt | TransactionReceipt}
 * type.
 *
 * @public
 */
export type EthersTransactionReceipt = TransactionReceipt

/**
 * Alias of Ethers' `PopulatedTransaction` type, which implements
 * {@link https://docs.ethers.io/v5/api/utils/transactions/#UnsignedTransaction | UnsignedTransaction}.
 *
 * @public
 */
export type EthersPopulatedTransaction = PopulatedTransaction

/**
 * Alias of Ethers' `TransactionRequest` type, which implements
 * {@link https://docs.ethers.io/v5/api/providers/types/#providers-TransactionRequest | TransactionRequest}.
 *
 * @public
 */
export type EthersTransactionRequest = TransactionRequest

/**
 * Optional parameters taken by {@link EthersRmm} transaction functions.
 *
 * @public
 */
export interface EthersTransactionOverrides {
  from?: string
  nonce?: number
  gasLimit?: BigNumber
  gasPrice?: BigNumber
}

/**
 * Optional parameters taken by {@link ReadableEthersRmm} functions.
 *
 * @public
 */
export interface EthersCallOverrides {
  blockTag?: BlockTag
}
