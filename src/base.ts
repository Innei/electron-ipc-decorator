import { AsyncLocalStorage } from 'node:async_hooks'
import type { IpcMainInvokeEvent, WebContents } from 'electron'
import { ipcMain } from 'electron'

// Base context for IPC methods
export interface IpcContext {
  sender: WebContents
  event: IpcMainInvokeEvent
}

// AsyncLocalStorage for context management
const contextStorage = new AsyncLocalStorage<IpcContext>()

// Get current IPC context from AsyncLocalStorage
export function getIpcContext(): IpcContext {
  const context = contextStorage.getStore()
  if (!context) {
    throw new Error(
      'IPC context is not available. Make sure this is called within an IPC handler.',
    )
  }
  return context
}

// Metadata storage for decorated methods
const methodMetadata = new WeakMap<any, Map<string, string>>()

// Decorator for IPC methods
export function IpcMethod() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const { constructor } = target

    if (!methodMetadata.has(constructor)) {
      methodMetadata.set(constructor, new Map())
    }

    const methods = methodMetadata.get(constructor)!
    methods.set(propertyKey, propertyKey)

    return descriptor
  }
}

// Handler registry for IPC methods
export class IpcHandler {
  private static instance: IpcHandler
  private registeredChannels = new Set<string>()

  static getInstance(): IpcHandler {
    if (!IpcHandler.instance) {
      IpcHandler.instance = new IpcHandler()
    }
    return IpcHandler.instance
  }

  registerMethod<TOutput>(
    channel: string,
    handler: (...args: any[]) => Promise<TOutput> | TOutput,
  ) {
    if (this.registeredChannels.has(channel)) {
      return // Already registered
    }

    this.registeredChannels.add(channel)

    ipcMain.handle(
      channel,
      async (event: IpcMainInvokeEvent, ...args: any[]) => {
        const context: IpcContext = {
          sender: event.sender,
          event,
        }

        try {
          return await contextStorage.run(context, () => handler(...args))
        } catch (error) {
          console.error(`Error in IPC method ${channel}:`, error)
          throw error
        }
      },
    )
  }

  // Send events to renderer
  sendToRenderer<T = any>(webContents: WebContents, channel: string, data: T) {
    webContents.send(channel, data)
  }
}

// Base class for IPC service groups
export abstract class IpcService {
  protected handler = IpcHandler.getInstance()
  static readonly groupName: string

  constructor() {
    this.registerMethods()
  }

  protected registerMethods(): void {
    const { constructor } = this
    const methods = methodMetadata.get(constructor)

    if (methods) {
      methods.forEach((methodName, propertyKey) => {
        const method = (this as any)[propertyKey]
        if (typeof method === 'function') {
          this.registerMethod(methodName, method.bind(this))
        }
      })
    }
  }

  protected registerMethod<TOutput>(
    methodName: string,
    handler: (...args: any[]) => Promise<TOutput> | TOutput,
  ) {
    const groupName = (this.constructor as typeof IpcService).groupName
    const channel = `${groupName}.${methodName}`
    this.handler.registerMethod(channel, handler)
  }
}

// Service constructor with groupName
export interface IpcServiceConstructor {
  new (): IpcService
  readonly groupName: string
}

// Create services function that infers types from service constructors
export function createServices<T extends readonly IpcServiceConstructor[]>(
  serviceConstructors: T,
): CreateServicesResult<T> {
  const services = {} as any

  for (const ServiceConstructor of serviceConstructors) {
    const instance = new ServiceConstructor()
    const groupName = ServiceConstructor.groupName

    if (!groupName) {
      throw new Error(
        `Service ${ServiceConstructor.name} must define a static readonly groupName property`,
      )
    }

    services[groupName] = instance
  }

  return services
}

// Helper type for createServices return type
type CreateServicesResult<T extends readonly IpcServiceConstructor[]> = {
  [K in T[number] as K['groupName']]: InstanceType<K>
}
