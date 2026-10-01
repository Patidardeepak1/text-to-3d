import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('shows a friendly generation error', () => {
    render(<ErrorState message="Model generation failed. Please try again." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Model generation failed. Please try again.')
    expect(screen.getByRole('alert').textContent).not.toMatch(/at \//)
  })
})
