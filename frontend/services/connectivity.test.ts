import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkConnection } from './connectivity'

const API_URL = 'https://oracle.test/'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('checkConnection', () => {
  it('204 означает достижимо', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    )
    await expect(checkConnection(API_URL, 1000)).resolves.toBe(true)
  })

  it('даже 502 означает достижимо — сеть пропускает', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 502 })),
    )
    await expect(checkConnection(API_URL, 1000)).resolves.toBe(true)
  })

  it('сетевой throw означает глушат', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down')
      }),
    )
    await expect(checkConnection(API_URL, 1000)).resolves.toBe(false)
  })

  it('тишина дольше таймаута означает глушат', async () => {
    // Мок висит, но честно реджектится по abort — как настоящий fetch.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          }),
      ),
    )
    await expect(checkConnection(API_URL, 30)).resolves.toBe(false)
  })

  it('пустой URL проверять нечем', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(checkConnection('', 1000)).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('шлёт именно OPTIONS', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await checkConnection(API_URL, 1000)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(API_URL)
    expect(init?.method).toBe('OPTIONS')
  })
})
