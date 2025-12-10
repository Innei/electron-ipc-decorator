# Electron IPC Decorator

[![npm version](https://badge.fury.io/js/electron-ipc-decorator.svg)](https://www.npmjs.com/package/electron-ipc-decorator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript-first decorator library that simplifies Electron IPC communication with type safety and automatic proxy generation.

## Features

- 🎯 **Type-Safe**: Full TypeScript support with automatic type inference
- 🚀 **Decorator-Based**: Clean and intuitive API using decorators
- 🔄 **Auto Proxy**: Automatic client-side proxy generation
- 📦 **Service Groups**: Organize IPC methods into logical service groups
- 🛡️ **Error Handling**: Built-in error handling and logging
- ⚡ **Async Support**: Native support for async/await patterns
- 🔌 **Context Injection**: AsyncLocalStorage-based context management

## Installation

```bash
npm install electron-ipc-decorator
# or
pnpm add electron-ipc-decorator
# or
yarn add electron-ipc-decorator
```

## Quick Start

### 1. Define IPC Services (Main Process)

```typescript
import { app } from 'electron'
import { IpcService, IpcMethod, getIpcContext } from 'electron-ipc-decorator'

export class AppService extends IpcService {
  static readonly groupName = 'app' // Define static group name

  @IpcMethod()
  getAppVersion(): string {
    return app.getVersion()
  }

  @IpcMethod()
  switchAppLocale(locale: string): void {
    i18n.changeLanguage(locale)
    app.commandLine.appendSwitch('lang', locale)
  }

  @IpcMethod()
  async search(input: SearchInput): Promise<Electron.Result | null> {
    // Context is automatically injected via AsyncLocalStorage
    // Access it using getIpcContext() when needed
    // Get context when needed
    const { sender: webContents } = getIpcContext()

    const { promise, resolve } = Promise.withResolvers<Electron.Result | null>()

    let requestId = -1
    webContents.once('found-in-page', (_, result) => {
      resolve(result.requestId === requestId ? result : null)
    })

    requestId = webContents.findInPage(input.text, input.options)
    return promise
  }
}
```

### 2. Initialize Services (Main Process)

```typescript
import { createServices, MergeIpcService } from 'electron-ipc-decorator'
import { AppService } from './app-service'

// Create services with automatic type inference
export const services = createServices([AppService])

// Generate type definition for all services
export type IpcServices = MergeIpcService<typeof services>
```

### 3. Create Client Proxy (Renderer Process)

```typescript
import { createIpcProxy } from 'electron-ipc-decorator/client'
import type { IpcServices } from './main/services' // Import from main process

// ipcRenderer should be exposed through electron's context bridge
export const ipcServices = createIpcProxy<IpcServices>(ipcRenderer)
```

### 4. Use in Renderer Process

```typescript
// Synchronous methods
const version = await ipcServices.app.getAppVersion()

// Methods with parameters
await ipcServices.app.switchAppLocale('en')

// Async methods
const searchResult = await ipcServices.app.search({
  text: 'search term',
  options: {
    findNext: false,
    forward: true,
  },
})
```

## API Reference

### Decorators

#### `@IpcMethod()`

Marks a method as an IPC endpoint.

```typescript
@IpcMethod()
someMethod() { }
```

### Classes

#### `IpcService`

Base class for creating IPC service groups.

```typescript
abstract class IpcService {
  static readonly groupName: string // Must be defined by subclasses
}
```

#### `IpcContext`

Context object available through `getIpcContext()` within IPC method handlers. The context is automatically injected using AsyncLocalStorage.

```typescript
interface IpcContext {
  sender: WebContents // The WebContents that sent the request
  event: IpcMainInvokeEvent // The original IPC event
}
```

#### `getIpcContext()`

Retrieves the current IPC context from AsyncLocalStorage. Must be called within an IPC method handler.

```typescript
function getIpcContext(): IpcContext
```

### Functions

#### `createServices<T>(serviceConstructors: T): ServicesResult<T>`

Creates services from an array of service constructors with automatic type inference. Each service class must define a static `groupName` property.

```typescript
// Define services
class AppService extends IpcService {
  static readonly groupName = 'app'
  // methods...
}

class UserService extends IpcService {
  static readonly groupName = 'user'
  // methods...
}

// Create services with type safety
const services = createServices([AppService, UserService])
// Type is: { app: AppService, user: UserService }
```

#### `createIpcProxy<T>(ipcRenderer: IpcRenderer): T`

Creates a type-safe proxy for calling IPC methods from the renderer process.

### Type Utilities

#### `MergeIpcService<T>`

Merges multiple service instances into a single type definition.

#### `ExtractServiceMethods<T>`

Extracts and transforms service methods for client-side usage, automatically:

- Preserves all method parameters
- Wraps return types in `Promise<T>`

## Important Notes

### Method Signatures

1. **Context Access**: Access IPC context using `getIpcContext()` within method handlers when needed
2. **Return Types**: All methods return `Promise<T>` on the client side, even if they're synchronous on the server
3. **Error Handling**: Errors are automatically propagated from main to renderer process

### Example Method Signatures

```typescript
// Main process method signature
@IpcMethod()
someMethod(param1: string, param2: number): string {
  const context = getIpcContext() // Get context when needed
  // Implementation
}

// Renderer process usage (auto-generated type)
ipcServices.group.someMethod(param1: string, param2: number): Promise<string>
```

## Breaking Changes in v1.0.0

### 🚨 Context Parameter Removed

Version 1.0.0 introduces a breaking change in how IPC context is accessed. The `context` parameter has been removed from all IPC method signatures in favor of AsyncLocalStorage-based context injection.

#### Migration Steps

**Before (v0.x):**

```typescript
import { IpcService, IpcMethod, IpcContext } from 'electron-ipc-decorator'

export class AppService extends IpcService {
  static readonly groupName = 'app'

  @IpcMethod()
  someMethod(context: IpcContext, param: string): string {
    const { sender } = context
    // Use context...
    return 'result'
  }
}
```

**After (v1.0.0):**

```typescript
import { IpcService, IpcMethod, getIpcContext } from 'electron-ipc-decorator'

export class AppService extends IpcService {
  static readonly groupName = 'app'

  @IpcMethod()
  someMethod(param: string): string {
    const { sender } = getIpcContext() // Get context when needed
    // Use context...
    return 'result'
  }
}
```

#### Benefits of the New Approach

- **Cleaner API**: Method signatures match their actual purpose without boilerplate
- **On-Demand Context**: Only retrieve context when you actually need it
- **Better Type Inference**: Automatic type extraction works more accurately
- **Promise Chain Context**: Context is preserved throughout async operations via AsyncLocalStorage

#### Update Checklist

1. Remove `IpcContext` parameter from all `@IpcMethod()` decorated methods
2. Import and use `getIpcContext()` when you need to access the context
3. Update your type definitions (the types will now automatically match your method signatures)
4. No changes needed on the renderer side - the API remains the same

## Migration Guide

### From Constructor-based to Static groupName

If you're upgrading from a version that used constructor-based group names, here's how to migrate:

**Old way:**

```typescript
export class AppService extends IpcService {
  constructor() {
    super('app') // Group name in constructor
  }
}

// Manual service object creation
export const services = {
  app: new AppService(),
}
```

**New way (recommended):**

```typescript
export class AppService extends IpcService {
  static readonly groupName = 'app' // Static group name
}

// Automatic service creation with type safety
export const services = createServices([AppService])
```

**Benefits of the new approach:**

- **Type Safety**: Prevents mismatch between service keys and group names
- **Auto-completion**: Full IntelliSense support for service methods
- **Runtime Safety**: Compile-time errors if `groupName` is missing
- **Simpler**: No need to manually maintain service object keys

## Advanced Usage

### Error Handling

Errors thrown in main process methods are automatically caught and re-thrown in the renderer process:

```typescript
@IpcMethod()
riskyOperation(): string {
  throw new Error("Something went wrong")
}

// In renderer
try {
  await ipcServices.app.riskyOperation()
} catch (error) {
  console.error("IPC Error:", error.message) // "Something went wrong"
}
```

### Using WebContents

```typescript
@IpcMethod()
sendNotification(message: string): void {
  const { sender } = getIpcContext()

  // Send data back to the specific renderer
  sender.send('notification', { message, timestamp: Date.now() })
}
```

## Testing

This project maintains 100% test coverage. To run tests:

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## TypeScript Configuration

Ensure your `tsconfig.json` has decorator support enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## License

2025 © Innei, Released under the MIT License.

> [Personal Website](https://innei.in/) · GitHub [@Innei](https://github.com/innei/)
