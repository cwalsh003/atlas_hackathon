import { afterEach, describe, expect, it, vi } from 'vitest'

describe('isDemoMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is true when VITE_DEMO_MODE is "1"', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '1')
    vi.resetModules()
    const { isDemoMode } = await import('./demoMode')
    expect(isDemoMode).toBe(true)
  })

  it('is false when VITE_DEMO_MODE is unset', async () => {
    vi.stubEnv('VITE_DEMO_MODE', undefined)
    vi.resetModules()
    const { isDemoMode } = await import('./demoMode')
    expect(isDemoMode).toBe(false)
  })

  it('is false when VITE_DEMO_MODE is "0"', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '0')
    vi.resetModules()
    const { isDemoMode } = await import('./demoMode')
    expect(isDemoMode).toBe(false)
  })
})
