import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'
import App from '../src/App'

const mount = () => { window.location.hash = '#/'; return render(<HashRouter><App /></HashRouter>) }
const skipLock = async (user) => { await user.click(await screen.findByRole('button', { name: /continue without a lock/i })) }

describe('app flows', () => {
  it('starts on the setup screen and can continue without a lock', async () => {
    const user = userEvent.setup(); mount()
    expect(await screen.findByRole('heading', { name: /protect your tracker/i })).toBeInTheDocument()
    await skipLock(user)
    expect(await screen.findByText(/day streak/i)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('lt_meta')).mode).toBe('plain')
  })

  it('marks a chapter done, updates the dashboard and persists it', async () => {
    const user = userEvent.setup(); mount(); await skipLock(user)
    await user.click(screen.getAllByRole('link', { name: /curriculum/i })[0])
    const first = (await screen.findAllByRole('button', { name: /not started/i }))[0]
    await user.click(first); await user.click(screen.getAllByRole('button', { name: /in progress\. click/i })[0])
    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('lt_plain'))
      expect(s.status.e1c1).toBe(2)
      expect(s.revs.e1c1.step).toBe(0)
    }, { timeout: 2000 })
    await user.click(screen.getAllByRole('link', { name: /dashboard/i })[0])
    const done = (await screen.findAllByText('done')).find((el) => el.className.includes('lbl'))
    expect(within(done.parentElement).getByText('1')).toBeInTheDocument()
  })

  it('earns the first badge and shows a toast', async () => {
    const user = userEvent.setup(); mount(); await skipLock(user)
    await user.click(screen.getAllByRole('link', { name: /curriculum/i })[0])
    const b = (await screen.findAllByRole('button', { name: /not started/i }))[0]
    await user.click(b); await user.click(screen.getAllByRole('button', { name: /in progress\. click/i })[0])
    expect(await screen.findByText(/badge earned: first step/i)).toBeInTheDocument()
  })

  it('opens the command palette with Ctrl+K and jumps to a page', async () => {
    const user = userEvent.setup(); mount(); await skipLock(user)
    await screen.findByText(/day streak/i)
    await user.keyboard('{Control>}k{/Control}')
    const box = await screen.findByRole('textbox', { name: /search/i })
    await user.type(box, 'go to focus')
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: /focus timer/i })).toBeInTheDocument()
  })

  it('encrypts with a passcode, locks, rejects a wrong code and restores data on unlock', async () => {
    const user = userEvent.setup(); mount()
    await user.type(await screen.findByLabelText(/choose a passcode/i), 'secret99')
    await user.type(screen.getByLabelText(/repeat passcode/i), 'secret99')
    await user.click(screen.getByRole('button', { name: /set passcode and start/i }))
    await screen.findByText(/day streak/i)
    expect(localStorage.getItem('lt_plain')).toBeNull()
    expect(JSON.parse(localStorage.getItem('lt_vault'))).toHaveProperty('d')

    // mark something so we can see it after unlock
    await user.click(screen.getAllByRole('link', { name: /curriculum/i })[0])
    await user.click((await screen.findAllByRole('button', { name: /not started/i }))[0])
    await new Promise((r) => setTimeout(r, 600)) // let the debounced save run

    await user.click(screen.getAllByRole('button', { name: /lock now/i })[0])
    expect(await screen.findByRole('heading', { name: /enter your passcode/i })).toBeInTheDocument()
    expect(screen.queryByText(/day streak/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/^passcode$/i), 'nope')
    await user.click(screen.getByRole('button', { name: /^unlock$/i }))
    expect(await screen.findByText(/did not work/i)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('lt_audit')).n).toBe(1)

    await user.type(screen.getByLabelText(/^passcode$/i), 'secret99')
    await user.click(screen.getByRole('button', { name: /^unlock$/i }))
    expect(await screen.findByText(/failed unlock attempt/i)).toBeInTheDocument()
    // unlocking returns to the page you were on
    expect(await screen.findByRole('heading', { name: /fundamentals/i })).toBeInTheDocument()
    expect((await screen.findAllByRole('button', { name: /in progress\. click/i })).length).toBeGreaterThan(0)
  }, 20000)

  it('restores a plain backup from pasted text', async () => {
    const user = userEvent.setup(); mount(); await skipLock(user)
    await user.click(screen.getAllByRole('link', { name: /settings/i })[0])
    const ta = await screen.findByLabelText(/backup text/i)
    const bad = JSON.stringify({ status: { e1c1: 2, e1c2: 2 }, goal: 90 })
    await user.click(ta); await user.paste(bad)
    const btn = screen.getByRole('button', { name: /restore from pasted backup/i })
    await user.click(btn); await user.click(screen.getByRole('button', { name: /click again to confirm/i }))
    expect(await screen.findByText(/backup restored/i)).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(localStorage.getItem('lt_plain')).goal).toBe(90), { timeout: 2000 })
  })

  it('fires the test alarm toast from the routine page', async () => {
    const user = userEvent.setup(); mount(); await skipLock(user)
    await user.click(screen.getAllByRole('link', { name: /daily routine/i })[0])
    await user.click(await screen.findByRole('button', { name: /test the alarm/i }))
    expect(await screen.findByText('Test alarm')).toBeInTheDocument()
  })
})
