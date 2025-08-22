import type { IpcRenderer } from 'electron'

export function createIpcProxy<IpcServices extends Record<string, any>>(
  ipc: IpcRenderer,
): IpcServices | null {
  return new Proxy({} as IpcServices, {
    get(target, groupName: string) {
      return new Proxy(
        {},
        {
          get(_, methodName: string) {
            return (...args: any[]) => {
              const channel = `${groupName}.${methodName}`
              return ipc.invoke(channel, ...args)
            }
          },
        },
      )
    },
  })
}
