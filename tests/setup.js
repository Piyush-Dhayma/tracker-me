import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { resetMemory } from '../src/lib/storage'

// jsdom has no WebCrypto subtle, canvas, scrollIntoView or scrollTo
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
window.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}
HTMLCanvasElement.prototype.getContext = () => null
window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))

beforeEach(() => { localStorage.clear(); resetMemory() })
afterEach(() => { cleanup() })
