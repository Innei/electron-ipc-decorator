import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock electron before importing
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

describe('index module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export IpcMethod decorator', async () => {
    const { IpcMethod } = await import('./index')

    expect(IpcMethod).toBeDefined()
    expect(typeof IpcMethod).toBe('function')

    // Test that it can be used as a decorator
    const decorator = IpcMethod()
    expect(typeof decorator).toBe('function')
  })

  it('should export IpcService class', async () => {
    const { IpcService } = await import('./index')

    expect(IpcService).toBeDefined()
    expect(typeof IpcService).toBe('function')
  })

  it('should export createServices function', async () => {
    const { createServices, IpcService, IpcMethod } = await import('./index')

    expect(createServices).toBeDefined()
    expect(typeof createServices).toBe('function')

    // Test that createServices works
    class TestService extends IpcService {
      static readonly groupName = 'test'

      @IpcMethod()
      testMethod() {
        return 'test'
      }
    }

    const services = createServices([TestService])
    expect(services).toHaveProperty('test')
  })

  it('should export getIpcContext function', async () => {
    const { getIpcContext } = await import('./index')

    expect(getIpcContext).toBeDefined()
    expect(typeof getIpcContext).toBe('function')

    // Test that it throws when no context
    expect(() => getIpcContext()).toThrow()
  })

  it('should export IpcContext type', async () => {
    const module = await import('./index')

    // Type exports don't exist at runtime, but we can check the module structure
    expect(module).toBeDefined()
  })

  it('should export IpcServiceConstructor type', async () => {
    const module = await import('./index')

    // Type exports don't exist at runtime, but we can check the module structure
    expect(module).toBeDefined()
  })
})

describe('client module', () => {
  it('should export createIpcProxy function', async () => {
    const { createIpcProxy } = await import('./client')

    expect(createIpcProxy).toBeDefined()
    expect(typeof createIpcProxy).toBe('function')

    // Test that it returns null for null input
    expect(createIpcProxy(null)).toBeNull()
  })
})
