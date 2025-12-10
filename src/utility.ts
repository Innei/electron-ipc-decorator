// Extract method signatures from service class
export type ExtractServiceMethods<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? K
    : never]: T[K] extends (...args: infer Args) => infer Output
    ? Args extends []
      ? () => AlwaysPromise<Output>
      : Args extends [infer Input]
      ? (input: Input) => AlwaysPromise<Output>
      : (...args: Args) => AlwaysPromise<Output>
    : never
}

type AlwaysPromise<T> = Promise<Awaited<T>>

// TypeScript utility type to automatically merge IPC services
// This version works with both the old object format and new createServices format
export type MergeIpcService<T> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer Instance
    ? ExtractServiceMethods<Instance>
    : T[K] extends infer Instance
    ? ExtractServiceMethods<Instance>
    : never
}
