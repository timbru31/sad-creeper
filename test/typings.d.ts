/* eslint-disable */
// Fix for https://github.com/facebook/jest/issues/11404
declare namespace jest {
  interface It {
    /**
     * Creates a test closure.
     *
     * @param name The name of your test
     * @param fn The function for your test
     * @param timeout The timeout for an async function test
     */
    (name: string, fn?: ProvidesCallbackWithAsyncDone, timeout?: number): void
  }

  type ProvidesCallbackWithAsyncDone =
    | ((cb: DoneCallback) => void | undefined)
    | (() => Promise<unknown>)
    | ((cb: DoneCallback) => Promise<unknown>)
}
