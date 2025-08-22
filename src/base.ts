import type { IpcMainInvokeEvent, WebContents } from 'electron'
import { ipcMain } from 'electron'

// Base context for IPC methods
export interface IpcContext {
  sender: WebContents
  event: IpcMainInvokeEvent
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
    handler: (
      context: IpcContext,
      ...args: any[]
    ) => Promise<TOutput> | TOutput,
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
          return await handler(context, ...args)
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

  constructor(protected groupName: string) {
    this.registerMethods()
  }

  protected registerMethods(): void {
    const { constructor } = this
    const methods = methodMetadata.get(constructor)

    if (methods) {
      for (const [propertyKey, methodName] of methods) {
        const method = (this as any)[propertyKey]
        if (typeof method === 'function') {
          this.registerMethod(methodName, method.bind(this))
        }
      }
    }
  }

  protected registerMethod<TOutput>(
    methodName: string,
    handler: (
      context: IpcContext,
      ...args: any[]
    ) => Promise<TOutput> | TOutput,
  ) {
    const channel = `${this.groupName}.${methodName}`
    this.handler.registerMethod(channel, handler)
  }
}
