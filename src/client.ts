import type { IpcRenderer } from 'electron'

export function createIpcProxy<IpcServices extends Record<string, any>>(
  ipc: IpcRenderer | null,
): IpcServices | null {
  if (!ipc) {
    return null
  }

  const cache = new Map<string, {}>()

  return new Proxy({} as IpcServices, {
    get(target, groupName: string) {
      let proxy = cache.get(groupName)

      if (!proxy) {
        proxy = new Proxy({}, {
          get(_, methodName: string) {
            return (...args: any[]) => {
              const channel = `${groupName}.${methodName}`
              return ipc.invoke(channel, ...args)
            }
          },
        })
        cache.set(groupName, proxy)
      }

      return proxy
    },
  })
}
