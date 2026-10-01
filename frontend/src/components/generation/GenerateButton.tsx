import { LoaderCircle } from 'lucide-react'
import { Button } from '../ui/Button'

interface GenerateButtonProps {
  isSubmitting: boolean
  disabled?: boolean
}

export function GenerateButton({ isSubmitting, disabled = false }: GenerateButtonProps) {
  return (
    <Button type="submit" variant="primary" className="min-h-12 px-5" disabled={disabled || isSubmitting} aria-busy={isSubmitting}>
      {isSubmitting ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
      {isSubmitting ? 'Generating...' : 'Generate 3D Model'}
    </Button>
  )
}
