import { describe, expect, it, vi } from 'vitest'
import { createIpcProxy } from './client'

describe('createIpcProxy', () => {
  it('should return null when ipc is null', () => {
    const proxy = createIpcProxy(null)
    expect(proxy).toBeNull()
  })

  it('should create proxy for IPC services', () => {
    const mockIpc = {
      invoke: vi.fn().mockResolvedValue('result'),
    }

    const proxy = createIpcProxy<{
      app: {
        getVersion: () => Promise<string>
      }
    }>(mockIpc as any)

    expect(proxy).not.toBeNull()
  })

  it('should invoke IPC method with correct channel', async () => {
    const mockIpc = {
      invoke: vi.fn().mockResolvedValue('1.0.0'),
    }

    const proxy = createIpcProxy<{
      app: {
        getVersion: () => Promise<string>
      }
    }>(mockIpc as any)

    const result = await proxy!.app.getVersion()

    expect(mockIpc.invoke).toHaveBeenCalledWith('app.getVersion')
    expect(result).toBe('1.0.0')
  })

  it('should pass arguments to IPC method', async () => {
    const mockIpc = {
      invoke: vi.fn().mockResolvedValue('success'),
    }

    const proxy = createIpcProxy<{
      app: {
        switchLocale: (locale: string) => Promise<string>
      }
    }>(mockIpc as any)

    const result = await proxy!.app.switchLocale('en')

    expect(mockIpc.invoke).toHaveBeenCalledWith('app.switchLocale', 'en')
    expect(result).toBe('success')
  })

  it('should pass multiple arguments', async () => {
    const mockIpc = {
      invoke: vi.fn().mockResolvedValue('calculated'),
    }

    const proxy = createIpcProxy<{
      math: {
        calculate: (a: number, b: number, op: string) => Promise<string>
      }
    }>(mockIpc as any)

    const result = await proxy!.math.calculate(5, 3, 'add')

    expect(mockIpc.invoke).toHaveBeenCalledWith('math.calculate', 5, 3, 'add')
    expect(result).toBe('calculated')
  })

  it('should work with multiple service groups', async () => {
    const mockIpc = {
      invoke: vi
        .fn()
        .mockResolvedValueOnce('app-result')
        .mockResolvedValueOnce('user-result'),
    }

    const proxy = createIpcProxy<{
      app: {
        getVersion: () => Promise<string>
      }
      user: {
        getName: () => Promise<string>
      }
    }>(mockIpc as any)

    const appResult = await proxy!.app.getVersion()
    const userResult = await proxy!.user.getName()

    expect(mockIpc.invoke).toHaveBeenCalledWith('app.getVersion')
    expect(mockIpc.invoke).toHaveBeenCalledWith('user.getName')
    expect(appResult).toBe('app-result')
    expect(userResult).toBe('user-result')
  })

  it('should work with multiple methods in same group', async () => {
    const mockIpc = {
      invoke: vi
        .fn()
        .mockResolvedValueOnce('version')
        .mockResolvedValueOnce('locale'),
    }

    const proxy = createIpcProxy<{
      app: {
        getVersion: () => Promise<string>
        getLocale: () => Promise<string>
      }
    }>(mockIpc as any)

    const version = await proxy!.app.getVersion()
    const locale = await proxy!.app.getLocale()

    expect(mockIpc.invoke).toHaveBeenCalledWith('app.getVersion')
    expect(mockIpc.invoke).toHaveBeenCalledWith('app.getLocale')
    expect(version).toBe('version')
    expect(locale).toBe('locale')
  })

  it('should handle errors from IPC', async () => {
    const mockIpc = {
      invoke: vi.fn().mockRejectedValue(new Error('IPC Error')),
    }

    const proxy = createIpcProxy<{
      app: {
        riskyMethod: () => Promise<string>
      }
    }>(mockIpc as any)

    await expect(proxy!.app.riskyMethod()).rejects.toThrow('IPC Error')
  })

  it('should handle complex argument types', async () => {
    const mockIpc = {
      invoke: vi.fn().mockResolvedValue({ success: true }),
    }

    interface SearchInput {
      text: string
      options: {
        caseSensitive: boolean
        wholeWord: boolean
      }
    }

    const proxy = createIpcProxy<{
      app: {
        search: (input: SearchInput) => Promise<{ success: boolean }>
      }
    }>(mockIpc as any)

    const input: SearchInput = {
      text: 'test',
      options: {
        caseSensitive: true,
        wholeWord: false,
      },
    }

    const result = await proxy!.app.search(input)

    expect(mockIpc.invoke).toHaveBeenCalledWith('app.search', input)
    expect(result).toEqual({ success: true })
  })

  it('should handle void return methods', async () => {
    const mockIpc = {
      invoke: vi.fn().mockResolvedValue(undefined),
    }

    const proxy = createIpcProxy<{
      app: {
        doSomething: () => Promise<void>
      }
    }>(mockIpc as any)

    await proxy!.app.doSomething()

    expect(mockIpc.invoke).toHaveBeenCalledWith('app.doSomething')
  })

  it('should dynamically create method proxies', async () => {
    const mockIpc = {
      invoke: vi.fn().mockResolvedValue('dynamic'),
    }

    const proxy = createIpcProxy<Record<string, any>>(mockIpc as any)

    // Access any group and method dynamically
    const result = await proxy!.anyGroup.anyMethod('arg')

    expect(mockIpc.invoke).toHaveBeenCalledWith('anyGroup.anyMethod', 'arg')
    expect(result).toBe('dynamic')
  })
})
