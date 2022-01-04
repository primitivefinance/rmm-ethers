import { FailedReceipt } from '.'

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
