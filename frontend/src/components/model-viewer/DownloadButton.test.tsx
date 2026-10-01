import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DownloadButton } from './DownloadButton'

describe('DownloadButton', () => {
  it('downloads when the model is ready', async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()
    render(<DownloadButton onDownload={onDownload} />)
    await user.click(screen.getByRole('button', { name: 'Download .GLB' }))
    expect(onDownload).toHaveBeenCalledOnce()
  })

  it('does not download when disabled', async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()
    render(<DownloadButton onDownload={onDownload} disabled />)
    await user.click(screen.getByRole('button', { name: 'Download .GLB' }))
    expect(onDownload).not.toHaveBeenCalled()
  })
})
