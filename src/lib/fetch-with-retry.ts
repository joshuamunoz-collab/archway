/**
 * Fetch wrapper with timeout and retry logic.
 * Addresses: API timeout after 30s, and provides consistent error handling.
 */

interface FetchWithRetryOptions extends RequestInit {
  /** Timeout in milliseconds (default: 15000) */
  timeout?: number
  /** Number of retries on failure (default: 2) */
  retries?: number
  /** Delay between retries in ms — doubles each attempt (default: 1000) */
  retryDelay?: number
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 15_000,
    retries = 2,
    retryDelay = 1_000,
    signal: externalSignal,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()

    // Link external signal (e.g. from useEffect cleanup)
    if (externalSignal) {
      if (externalSignal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
      clearTimeout(timer)

      // Don't retry client errors (4xx), only server errors (5xx)
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res
      }

      lastError = new Error(`Server error: ${res.status}`)
    } catch (err) {
      clearTimeout(timer)

      // Don't retry if intentionally aborted by the caller
      if (externalSignal?.aborted) {
        throw err
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`)
      } else {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }

    // Wait before retry (with exponential backoff)
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)))
    }
  }

  throw lastError ?? new Error('Fetch failed')
}
