import { describe, expectTypeOf, it } from 'vitest'
import type { ExtractServiceMethods, MergeIpcService } from './utility'

describe('ExtractServiceMethods', () => {
  it('should extract methods without parameters', () => {
    class TestService {
      method1(): string {
        return 'test'
      }

      notAMethod = 'value'
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      method1: () => Promise<string>
    }>()
  })

  it('should extract methods with single parameter', () => {
    class TestService {
      method1(input: string): number {
        return input.length
      }
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      method1: (input: string) => Promise<number>
    }>()
  })

  it('should extract methods with multiple parameters', () => {
    class TestService {
      method1(a: number, b: number, c: string): boolean {
        return true
      }
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      method1: (a: number, b: number, c: string) => Promise<boolean>
    }>()
  })

  it('should wrap sync return types in Promise', () => {
    class TestService {
      syncMethod(): string {
        return 'sync'
      }

      asyncMethod(): Promise<string> {
        return Promise.resolve('async')
      }
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      syncMethod: () => Promise<string>
      asyncMethod: () => Promise<string>
    }>()
  })

  it('should exclude non-function properties', () => {
    class TestService {
      method(): string {
        return 'test'
      }

      property = 'value'
      numberProp = 123
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      method: () => Promise<string>
    }>()

    // These should not exist in Result
    expectTypeOf<Result>().not.toHaveProperty('property')
    expectTypeOf<Result>().not.toHaveProperty('numberProp')
  })

  it('should handle void return type', () => {
    class TestService {
      voidMethod(): void {}
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      voidMethod: () => Promise<void>
    }>()
  })

  it('should handle complex types', () => {
    interface ComplexInput {
      text: string
      options: {
        caseSensitive: boolean
      }
    }

    interface ComplexOutput {
      found: boolean
      position: number
    }

    class TestService {
      complexMethod(input: ComplexInput): ComplexOutput {
        return { found: true, position: 0 }
      }
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      complexMethod: (input: ComplexInput) => Promise<ComplexOutput>
    }>()
  })

  it('should handle optional parameters', () => {
    class TestService {
      optionalMethod(required: string, optional?: number): boolean {
        return true
      }
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      optionalMethod: (required: string, optional?: number) => Promise<boolean>
    }>()
  })

  it('should handle union types', () => {
    class TestService {
      unionMethod(input: string | number): string | null {
        return typeof input === 'string' ? input : null
      }
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toMatchTypeOf<{
      unionMethod: (input: string | number) => Promise<string | null>
    }>()
  })

  it('should handle generic types', () => {
    class TestService {
      genericMethod<T>(input: T): T {
        return input
      }
    }

    type Result = ExtractServiceMethods<TestService>

    expectTypeOf<Result>().toHaveProperty('genericMethod')
  })
})

describe('MergeIpcService', () => {
  it('should merge services from constructors', () => {
    class AppService {
      getVersion(): string {
        return '1.0.0'
      }
    }

    class UserService {
      getName(): string {
        return 'John'
      }
    }

    type Services = {
      app: typeof AppService
      user: typeof UserService
    }

    type Result = MergeIpcService<Services>

    expectTypeOf<Result>().toMatchTypeOf<{
      app: {
        getVersion: () => Promise<string>
      }
      user: {
        getName: () => Promise<string>
      }
    }>()
  })

  it('should merge services from instances', () => {
    class AppService {
      getVersion(): string {
        return '1.0.0'
      }
    }

    class UserService {
      getName(): string {
        return 'John'
      }
    }

    type Services = {
      app: AppService
      user: UserService
    }

    type Result = MergeIpcService<Services>

    expectTypeOf<Result>().toMatchTypeOf<{
      app: {
        getVersion: () => Promise<string>
      }
      user: {
        getName: () => Promise<string>
      }
    }>()
  })

  it('should handle single service', () => {
    class AppService {
      getVersion(): string {
        return '1.0.0'
      }

      getLocale(): string {
        return 'en'
      }
    }

    type Services = {
      app: AppService
    }

    type Result = MergeIpcService<Services>

    expectTypeOf<Result>().toMatchTypeOf<{
      app: {
        getVersion: () => Promise<string>
        getLocale: () => Promise<string>
      }
    }>()
  })

  it('should handle multiple methods per service', () => {
    class AppService {
      method1(): string {
        return 'test'
      }

      method2(input: number): boolean {
        return true
      }

      method3(a: string, b: number): void {}
    }

    type Services = {
      app: AppService
    }

    type Result = MergeIpcService<Services>

    expectTypeOf<Result>().toMatchTypeOf<{
      app: {
        method1: () => Promise<string>
        method2: (input: number) => Promise<boolean>
        method3: (a: string, b: number) => Promise<void>
      }
    }>()
  })

  it('should handle empty service', () => {
    class EmptyService {}

    type Services = {
      empty: EmptyService
    }

    type Result = MergeIpcService<Services>

    expectTypeOf<Result>().toMatchTypeOf<{
      empty: {}
    }>()
  })

  it('should work with complex service types', () => {
    interface SearchInput {
      text: string
      options: { caseSensitive: boolean }
    }

    interface SearchResult {
      found: boolean
      matches: number
    }

    class SearchService {
      search(input: SearchInput): SearchResult {
        return { found: false, matches: 0 }
      }

      clearSearch(): void {}
    }

    class FileService {
      readFile(path: string): Promise<string> {
        return Promise.resolve('')
      }

      writeFile(path: string, content: string): Promise<void> {
        return Promise.resolve()
      }
    }

    type Services = {
      search: SearchService
      file: FileService
    }

    type Result = MergeIpcService<Services>

    expectTypeOf<Result>().toMatchTypeOf<{
      search: {
        search: (input: SearchInput) => Promise<SearchResult>
        clearSearch: () => Promise<void>
      }
      file: {
        readFile: (path: string) => Promise<string>
        writeFile: (path: string, content: string) => Promise<void>
      }
    }>()
  })
})
