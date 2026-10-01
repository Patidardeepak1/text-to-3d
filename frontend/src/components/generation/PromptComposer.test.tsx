import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PromptComposer } from './PromptComposer'

function Harness({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [value, setValue] = useState('')
  return <PromptComposer value={value} onChange={setValue} onSubmit={onSubmit} isSubmitting={false} />
}

describe('PromptComposer', () => {
  it('shows a validation error for a short prompt and does not submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Describe a 3D object'), 'chair')
    await user.click(screen.getByRole('button', { name: 'Generate 3D Model' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your prompt is too short.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a valid prompt and can clear it', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    const field = screen.getByLabelText('Describe a 3D object')
    await user.type(field, 'A wooden chair with visible grain')
    await user.click(screen.getByRole('button', { name: 'Generate 3D Model' }))
    expect(onSubmit).toHaveBeenCalledWith('A wooden chair with visible grain')

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(field).toHaveValue('')
  })

  it('fills the prompt from an example', async () => {
    const user = userEvent.setup()
    render(<Harness onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Wooden chair' }))
    expect(screen.getByLabelText('Describe a 3D object')).toHaveValue(
      'A handcrafted wooden chair with a curved backrest and visible wood grain',
    )
  })

  it('disables generation while a request is active', () => {
    render(
      <PromptComposer value="A medieval castle with stone towers" onChange={() => undefined} onSubmit={() => undefined} isSubmitting />,
    )
    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled()
  })
})
