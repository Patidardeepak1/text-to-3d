import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HomePage } from './pages/HomePage'
import { GenerationProvider } from './hooks/useGeneration'
import { ToastProvider } from './components/ui/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <GenerationProvider>
          <HomePage />
        </GenerationProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
