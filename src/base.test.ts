import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createServices,
  getIpcContext,
  IpcHandler,
  IpcMethod,
  IpcService,
  type IpcContext,
} from './base'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

describe('getIpcContext', () => {
  it('should throw error when context is not available', () => {
    expect(() => getIpcContext()).toThrow(
      'IPC context is not available. Make sure this is called within an IPC handler.',
    )
  })
})

describe('IpcMethod', () => {
  it('should register method metadata', () => {
    class TestService {
      @IpcMethod()
      testMethod() {
        return 'test'
      }
    }

    const instance = new TestService()
    expect(instance.testMethod()).toBe('test')
  })

  it('should register multiple methods', () => {
    class TestService {
      @IpcMethod()
      method1() {
        return 'method1'
      }

      @IpcMethod()
      method2() {
        return 'method2'
      }
    }

    const instance = new TestService()
    expect(instance.method1()).toBe('method1')
    expect(instance.method2()).toBe('method2')
  })

  it('should add metadata to constructor when first method is decorated', () => {
    class NewService {
      @IpcMethod()
      firstMethod() {
        return 'first'
      }
    }

    const instance = new NewService()
    expect(instance.firstMethod()).toBe('first')
  })

  it('should reuse existing metadata map when decorating multiple methods', () => {
    class ServiceWithMultiple {
      @IpcMethod()
      method1() {
        return 'one'
      }

      @IpcMethod()
      method2() {
        return 'two'
      }

      @IpcMethod()
      method3() {
        return 'three'
      }
    }

    const instance = new ServiceWithMultiple()
    expect(instance.method1()).toBe('one')
    expect(instance.method2()).toBe('two')
    expect(instance.method3()).toBe('three')
  })
})

describe('IpcHandler', () => {
  let handler: IpcHandler
  const mockIpcMain = vi.hoisted(() => ({
    handle: vi.fn(),
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton
    ;(IpcHandler as any).instance = undefined
    handler = IpcHandler.getInstance()
  })

  it('should be a singleton', () => {
    const handler1 = IpcHandler.getInstance()
    const handler2 = IpcHandler.getInstance()
    expect(handler1).toBe(handler2)
  })

  it('should register method and handle IPC call', async () => {
    const { ipcMain } = await import('electron')
    const mockHandler = vi.fn().mockResolvedValue('result')

    handler.registerMethod('test.method', mockHandler)

    expect(ipcMain.handle).toHaveBeenCalledWith(
      'test.method',
      expect.any(Function),
    )

    // Get the registered handler
    const registeredHandler = (ipcMain.handle as any).mock.calls[0][1]
    const mockEvent = {
      sender: { send: vi.fn() },
    }

    const result = await registeredHandler(mockEvent, 'arg1', 'arg2')
    expect(result).toBe('result')
    expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should not register the same channel twice', async () => {
    const { ipcMain } = await import('electron')
    const mockHandler = vi.fn()

    const result1 = handler.registerMethod('test.method', mockHandler)
    const result2 = handler.registerMethod('test.method', mockHandler)

    expect(ipcMain.handle).toHaveBeenCalledTimes(1)
    expect(result1).toBeUndefined()
    expect(result2).toBeUndefined()
  })

  it('should handle errors in IPC method', async () => {
    const { ipcMain } = await import('electron')
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const error = new Error('Test error')
    const mockHandler = vi.fn().mockRejectedValue(error)

    handler.registerMethod('test.error', mockHandler)

    const registeredHandler = (ipcMain.handle as any).mock.calls[0][1]
    const mockEvent = {
      sender: { send: vi.fn() },
    }

    await expect(registeredHandler(mockEvent)).rejects.toThrow('Test error')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in IPC method test.error:',
      error,
    )

    consoleErrorSpy.mockRestore()
  })

  it('should provide context through AsyncLocalStorage', async () => {
    const { ipcMain } = await import('electron')
    let capturedContext: IpcContext = null!

    const mockHandler = vi.fn(() => {
      capturedContext = getIpcContext()
      return 'result'
    })

    handler.registerMethod('test.context', mockHandler)

    const registeredHandler = (ipcMain.handle as any).mock.calls[0][1]
    const mockEvent = {
      sender: { send: vi.fn() },
      someProperty: 'test',
    }

    await registeredHandler(mockEvent, 'arg1')

    expect(capturedContext).not.toBeNull()
    expect(capturedContext?.sender).toBe(mockEvent.sender)
    expect(capturedContext?.event).toBe(mockEvent)
  })

  it('should handle synchronous handlers', async () => {
    const { ipcMain } = await import('electron')
    const mockHandler = vi.fn().mockReturnValue('sync-result')

    handler.registerMethod('test.sync', mockHandler)

    const registeredHandler = (ipcMain.handle as any).mock.calls[0][1]
    const mockEvent = {
      sender: { send: vi.fn() },
    }

    const result = await registeredHandler(mockEvent, 'arg1')
    expect(result).toBe('sync-result')
  })

  it('should send to renderer', () => {
    const mockWebContents = {
      send: vi.fn(),
    }

    handler.sendToRenderer(mockWebContents as any, 'test-channel', {
      data: 'test',
    })

    expect(mockWebContents.send).toHaveBeenCalledWith('test-channel', {
      data: 'test',
    })
  })
})

describe('IpcService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton
    ;(IpcHandler as any).instance = undefined
  })

  it('should register methods on construction', async () => {
    const { ipcMain } = await import('electron')

    class TestService extends IpcService {
      static readonly groupName = 'test'

      @IpcMethod()
      testMethod() {
        return 'result'
      }
    }

    new TestService()

    expect(ipcMain.handle).toHaveBeenCalledWith(
      'test.testMethod',
      expect.any(Function),
    )
  })

  it('should bind methods correctly', async () => {
    const { ipcMain } = await import('electron')

    class TestService extends IpcService {
      static readonly groupName = 'test'
      private value = 'instance-value'

      @IpcMethod()
      getValue() {
        return this.value
      }
    }

    new TestService()

    const registeredHandler = (ipcMain.handle as any).mock.calls[0][1]
    const mockEvent = {
      sender: { send: vi.fn() },
    }

    const result = await registeredHandler(mockEvent)
    expect(result).toBe('instance-value')
  })

  it('should handle multiple methods', async () => {
    const { ipcMain } = await import('electron')

    class TestService extends IpcService {
      static readonly groupName = 'test'

      @IpcMethod()
      method1() {
        return 'result1'
      }

      @IpcMethod()
      method2() {
        return 'result2'
      }
    }

    new TestService()

    expect(ipcMain.handle).toHaveBeenCalledWith(
      'test.method1',
      expect.any(Function),
    )
    expect(ipcMain.handle).toHaveBeenCalledWith(
      'test.method2',
      expect.any(Function),
    )
  })

  it('should skip non-function properties', async () => {
    const { ipcMain } = await import('electron')

    class TestService extends IpcService {
      static readonly groupName = 'test'

      @IpcMethod()
      testMethod() {
        return 'result'
      }

      // This won't be registered because it's not a function
      notAMethod = 'value'
    }

    new TestService()

    // Should only register testMethod
    expect(ipcMain.handle).toHaveBeenCalledTimes(1)
    expect(ipcMain.handle).toHaveBeenCalledWith(
      'test.testMethod',
      expect.any(Function),
    )
  })

  it('should skip properties that are in metadata but not functions', async () => {
    const { ipcMain } = await import('electron')

    // Create a service and manually manipulate its prototype
    class TestService extends IpcService {
      static readonly groupName = 'test'

      @IpcMethod()
      validMethod() {
        return 'valid'
      }
    }

    // Before creating instance, replace a method with a non-function value
    const originalMethod = TestService.prototype.validMethod
    Object.defineProperty(TestService.prototype, 'validMethod', {
      value: 'not a function anymore',
      writable: true,
      configurable: true,
    })

    new TestService()

    // Should not register since validMethod is now a string
    expect(ipcMain.handle).not.toHaveBeenCalled()

    // Restore for other tests
    Object.defineProperty(TestService.prototype, 'validMethod', {
      value: originalMethod,
      writable: true,
      configurable: true,
    })
  })

  it('should handle service with no decorated methods', async () => {
    const { ipcMain } = await import('electron')

    class EmptyService extends IpcService {
      static readonly groupName = 'empty'
    }

    new EmptyService()

    expect(ipcMain.handle).not.toHaveBeenCalled()
  })
})

describe('createServices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton
    ;(IpcHandler as any).instance = undefined
  })

  it('should create services from constructors', () => {
    class Service1 extends IpcService {
      static readonly groupName = 'service1'

      @IpcMethod()
      method1() {
        return 'result1'
      }
    }

    class Service2 extends IpcService {
      static readonly groupName = 'service2'

      @IpcMethod()
      method2() {
        return 'result2'
      }
    }

    const services = createServices([Service1, Service2])

    expect(services).toHaveProperty('service1')
    expect(services).toHaveProperty('service2')
    expect(services.service1).toBeInstanceOf(Service1)
    expect(services.service2).toBeInstanceOf(Service2)
  })

  it('should throw error if groupName is missing', () => {
    class InvalidService extends IpcService {
      // Missing static readonly groupName
    }

    expect(() => createServices([InvalidService as any])).toThrow(
      'Service InvalidService must define a static readonly groupName property',
    )
  })

  it('should create single service', () => {
    class TestService extends IpcService {
      static readonly groupName = 'test'
    }

    const services = createServices([TestService])

    expect(services).toHaveProperty('test')
    expect(services.test).toBeInstanceOf(TestService)
  })

  it('should create empty services object from empty array', () => {
    const services = createServices([])

    expect(services).toEqual({})
  })

  it('should maintain type safety with groupName', () => {
    class AppService extends IpcService {
      static readonly groupName = 'app' as const

      @IpcMethod()
      getVersion() {
        return '1.0.0'
      }
    }

    class UserService extends IpcService {
      static readonly groupName = 'user' as const

      @IpcMethod()
      getName() {
        return 'John'
      }
    }

    const services = createServices([AppService, UserService])

    // Type checking (won't run but ensures type safety)
    expect(services.app).toBeInstanceOf(AppService)
    expect(services.user).toBeInstanceOf(UserService)
  })
})
