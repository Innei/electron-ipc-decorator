# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-10

### 🚨 Breaking Changes

- **Context Parameter Removed**: IPC method signatures no longer require `IpcContext` as the first parameter. Use `getIpcContext()` to access context when needed.

### Added

- **AsyncLocalStorage Context Injection**: Context is now automatically injected via Node.js AsyncLocalStorage, providing cleaner method signatures
- **`getIpcContext()` Function**: New function to retrieve IPC context within method handlers
- **Complete Test Coverage**: Achieved 100% test coverage with 57 comprehensive tests
- **GitHub CI**: Added automated testing workflow for Node.js 18.x, 20.x, and 22.x

### Changed

- Method signatures are now cleaner without the boilerplate `context` parameter
- Type inference improved - method types now match their actual signatures exactly
- Better TypeScript support with more accurate type extraction

### Migration Guide

**Before (v0.x):**
```typescript
@IpcMethod()
someMethod(context: IpcContext, param: string): string {
  const { sender } = context
  return 'result'
}
```

**After (v1.0.0):**
```typescript
@IpcMethod()
someMethod(param: string): string {
  const { sender } = getIpcContext() // Only when needed
  return 'result'
}
```

## [0.2.0] - 2025-12-09

### Added

- Static `groupName` support for service classes
- `createServices` function for automatic service creation with type inference
- Better type safety with `MergeIpcService` and `ExtractServiceMethods` utilities

### Changed

- Recommended approach for defining service groups using static readonly properties

## [0.1.0] - Initial Release

### Added

- Basic IPC decorator functionality
- Service group support
- Client-side proxy generation
- TypeScript type safety
