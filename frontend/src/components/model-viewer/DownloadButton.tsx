import { Download } from 'lucide-react'
import { Button } from '../ui/Button'

interface DownloadButtonProps {
  disabled?: boolean
  onDownload: () => void
  busy?: boolean
  label?: string
}

export function DownloadButton({ disabled = false, onDownload, busy = false, label = 'Download .GLB' }: DownloadButtonProps) {
  return (
    <Button variant="primary" className="w-full" onClick={onDownload} disabled={disabled || busy}>
      <Download size={16} aria-hidden="true" />
      {busy ? 'Preparing download...' : label}
    </Button>
  )
}
