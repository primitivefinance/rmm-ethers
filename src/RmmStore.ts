import assert from 'assert'

interface RmmBaseStoreState {
  placeholder?: string
}

interface RmmDerivedStoreState {
  placeholder?: string
}

export type RmmStoreState<T = unknown> = RmmBaseStoreState & RmmDerivedStoreState & T

/**
 * Parameters passed to {@link RmmStore} listeners.
 *
 * @remarks
 * Use the {@link RmmStore.subscribe | subscribe()} function to register a listener.

 * @public
 */
export interface RmmStoreListenerParams<T = unknown> {
  /** The entire previous state. */
  newState: RmmStoreState<T>

  /** The entire new state. */
  oldState: RmmStoreState<T>

  /** Only the state variables that have changed. */
  stateChange: Partial<RmmStoreState<T>>
}

const strictEquals = <T>(a: T, b: T) => a === b
const eq = <T extends { eq(that: T): boolean }>(a: T, b: T) => a.eq(b)
const equals = <T extends { equals(that: T): boolean }>(a: T, b: T) => a.equals(b)
const wrap =
  <A extends unknown[], R>(f: (...args: A) => R) =>
  (...args: A) =>
    f(...args)

const difference = <T>(a: T, b: T) =>
  Object.fromEntries(
    Object.entries(a).filter(([key, value]) => value !== (b as Record<string, unknown>)[key]),
  ) as Partial<T>

/**
 * Rmm protocol store.
 *
 * @remarks
 * Not fully implemented yet.
 *
 * @alpha
 */
export abstract class RmmStore<T = unknown> {
  logging = false

  onLoaded?: () => void

  protected _loaded = false

  private _baseState?: RmmBaseStoreState
  private _derivedState?: RmmDerivedStoreState
  private _extraState?: T

  private _updateTimeoutId: ReturnType<typeof setTimeout> | undefined
  private _listeners = new Set<(params: RmmStoreListenerParams<T>) => void>()

  /**
   * Current state of store.
   *
   * @beta
   */
  get state(): RmmStoreState<T> {
    return Object.assign({}, this._baseState, this._derivedState, this._extraState)
  }

  /** @internal */
  protected abstract _doStart(): () => void

  /**
   * Begin on-chain monitoring.
   *
   * @returns Function to stop monitoring.
   */
  start(): () => void {
    const doStop = this._doStart()

    return () => {
      doStop()

      this._cancelUpdateIfScheduled()
    }
  }

  private _cancelUpdateIfScheduled() {
    if (this._updateTimeoutId !== undefined) clearTimeout(this._updateTimeoutId)
  }

  private _scheduleUpdate() {
    this._cancelUpdateIfScheduled()

    this._updateTimeoutId = setTimeout(() => {
      this._updateTimeoutId = undefined
      this._update()
    }, 35000)
  }

  private _logUpdate<U>(name: string, next: U, show?: (next: U) => string): U {
    if (this.logging) {
      console.log(`${name} updated to ${show ? show(next) : next}`)
    }

    return next
  }

  private _updateIfChanged<U>(
    equals: (a: U, b: U) => boolean,
    name: string,
    prev: U,
    next?: U,
    show?: (next: U) => string,
  ): U {
    return next !== undefined && !equals(prev, next) ? this._logUpdate(name, next, show) : prev
  }

  private _reduce(baseState: RmmBaseStoreState, baseStateUpdate: Partial<RmmBaseStoreState>): RmmBaseStoreState {
    return { placeholder: '' }
  }

  private _derive({ placeholder }: RmmBaseStoreState): RmmDerivedStoreState {
    return { placeholder } as RmmDerivedStoreState
  }

  private _reduceDerived(
    derivedState: RmmDerivedStoreState,
    derivedStateUpdate: RmmDerivedStoreState,
  ): RmmDerivedStoreState {
    return { placeholder: '' }
  }

  /** @internal */
  protected abstract _reduceExtra(extraState: T, extraStateUpdate: Partial<T>): T

  private _notify(params: RmmStoreListenerParams<T>) {
    [...this._listeners].forEach(listener => {
      if (this._listeners.has(listener)) {
        listener(params)
      }
    })
  }

  /**
   * Register listener.
   *
   * @returns Function to unregister listener.
   */
  subscribe(listener: (params: RmmStoreListenerParams<T>) => void): () => void {
    const uniqueListener = wrap(listener)

    this._listeners.add(uniqueListener)

    return () => {
      this._listeners.delete(uniqueListener)
    }
  }

  protected _load(): void {
    console.log('placeholder')
  }

  protected _update(baseStateUpdate?: Partial<RmmBaseStoreState>, extraStateUpdate?: Partial<T>): void {
    assert(this._baseState && this._derivedState)

    const previous = this.state

    if (baseStateUpdate) this._baseState = this._reduce(this._baseState, baseStateUpdate)

    this._derivedState = this._reduceDerived(this._derivedState, this._derive(this._baseState))

    if (extraStateUpdate) {
      assert(this._extraState)
      this._extraState = this._reduceExtra(this._extraState, extraStateUpdate)
    }

    this._scheduleUpdate()

    this._notify({ newState: this.state, oldState: previous, stateChange: difference(this.state, previous) })
  }
}
