interface RmmBaseStore {}

interface RmmDerivedStore {}

export abstract class RmmStore<T = unknown> {
  logging = false

  onLoaded?: () => void

  protected _loaded = false
  private _listeners = new Set<() => void>()

  /**
   * Begin on-chain monitoring.
   *
   * @returns Function to stop monitoring.
   */
  start(): () => void {
    return () => {}
  }

  private _cancelUpdateIfScheduled() {}

  private _scheduleUpdate() {}

  private _notify() {}

  private _logUpdate<U>(next: U): U {
    return next
  }

  /**
   * Register listener.
   *
   * @returns Function to unregister listener.
   */
  subscribe(): () => void {
    return () => {}
  }

  protected _load(): void {}

  protected _update(): void {}
}
