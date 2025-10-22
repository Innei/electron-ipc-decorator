# Electron IPC Decorator

A TypeScript-first decorator library that simplifies Electron IPC communication with type safety and automatic proxy generation.

## Features

- 🎯 **Type-Safe**: Full TypeScript support with automatic type inference
- 🚀 **Decorator-Based**: Clean and intuitive API using decorators
- 🔄 **Auto Proxy**: Automatic client-side proxy generation
- 📦 **Service Groups**: Organize IPC methods into logical service groups
- 🛡️ **Error Handling**: Built-in error handling and logging
- ⚡ **Async Support**: Native support for async/await patterns

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
import { IpcService, IpcMethod, IpcContext } from 'electron-ipc-decorator'

export class AppService extends IpcService {
  static readonly groupName = 'app' // Define static group name

  @IpcMethod()
  getAppVersion(): string {
    return app.getVersion()
  }

  @IpcMethod()
  switchAppLocale(context: IpcContext, locale: string): void {
    // The first parameter is always IpcContext
    // Additional parameters follow after context
    i18n.changeLanguage(locale)
    app.commandLine.appendSwitch('lang', locale)
  }

  @IpcMethod()
  async search(
    context: IpcContext,
    input: SearchInput,
  ): Promise<Electron.Result | null> {
    const { sender: webContents } = context

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

// Methods with parameters (context is automatically handled)
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

Context object passed as the first parameter to all IPC methods.

```typescript
interface IpcContext {
  sender: WebContents // The WebContents that sent the request
  event: IpcMainInvokeEvent // The original IPC event
}
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

- Removes the `IpcContext` parameter
- Wraps return types in `Promise<T>`

## Important Notes

### Method Signatures

1. **Context Parameter**: The first parameter of every IPC method must be `IpcContext`
2. **Return Types**: All methods return `Promise<T>` on the client side, even if they're synchronous on the server
3. **Error Handling**: Errors are automatically propagated from main to renderer process

### Example Method Signatures

```typescript
// Main process method signature
@IpcMethod()
someMethod(context: IpcContext, param1: string, param2: number): string {
  // Implementation
}

// Renderer process usage (auto-generated type)
ipcServices.group.someMethod(param1: string, param2: number): Promise<string>
```

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
riskyOperation(context: IpcContext): string {
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
sendNotification(context: IpcContext, message: string): void {
  const { sender } = context

  // Send data back to the specific renderer
  sender.send('notification', { message, timestamp: Date.now() })
}
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
