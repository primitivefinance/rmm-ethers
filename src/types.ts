import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { TransactionResponse, TransactionReceipt } from '@ethersproject/abstract-provider'
import { PopulatedTransaction } from '@ethersproject/contracts'

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
