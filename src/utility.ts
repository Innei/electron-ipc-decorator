import type { IpcContext } from './base'

// Extract method signatures from service class, removing context parameter
export type ExtractServiceMethods<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? K
    : never]: T[K] extends (
    context: IpcContext,
    ...args: infer Args
  ) => infer Output
    ? Args extends []
      ? () => AlwaysPromise<Output>
      : Args extends [infer Input]
      ? (input: Input) => AlwaysPromise<Output>
      : (...args: Args) => AlwaysPromise<Output>
    : never
}

type AlwaysPromise<T> = Promise<Awaited<T>>

// TypeScript utility type to automatically merge IPC services
export type MergeIpcService<T> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer Instance
    ? ExtractServiceMethods<Instance>
    : T[K] extends infer Instance
    ? ExtractServiceMethods<Instance>
    : never
}
