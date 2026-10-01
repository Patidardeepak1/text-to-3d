import { motion, useReducedMotion } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { GenerationHistory } from '../components/generation/GenerationHistory'
import { GenerationStatus } from '../components/generation/GenerationStatus'
import { PromptComposer } from '../components/generation/PromptComposer'
import { Background } from '../components/layout/Background'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { EmptyState } from '../components/model-viewer/EmptyState'
import { ErrorState } from '../components/model-viewer/ErrorState'
import { LoadingState } from '../components/model-viewer/LoadingState'
import { ModelInfo } from '../components/model-viewer/ModelInfo'
import { useGeneration } from '../hooks/useGeneration'
import { api, assetUrl } from '../services/api'
import { useToast } from '../components/ui/Toast'
import { useState } from 'react'

const ModelViewer = lazy(() => import('../components/model-viewer/ModelViewer'))

export function HomePage() {
  const reduce = useReducedMotion()
  const toast = useToast()
  const generation = useGeneration()
  const [downloading, setDownloading] = useState(false)
  const modelUrl = assetUrl(generation.current?.status === 'completed' ? generation.current.modelUrl : null)

  const copyPrompt = async () => {
    if (!generation.current) return
    await navigator.clipboard.writeText(generation.current.prompt)
    toast('Prompt copied', 'success')
  }

  const share = async () => {
    if (!generation.current) return
    const url = `${window.location.origin}${window.location.pathname}#model=${generation.current.id}`
    await navigator.clipboard.writeText(url)
    toast('Share link copied', 'success')
  }

  const download = async () => {
    if (!generation.current?.downloadUrl) return
    setDownloading(true)
    try {
      await api.download(generation.current.downloadUrl, generation.current.filename)
      toast('Download started', 'success')
    } catch {
      toast('The model could not be downloaded.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div id="top" className="min-h-screen">
      <Background />
      <Navbar />
      <main>
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 sm:pt-24">
          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="text-sm tracking-[0.22em] text-muted uppercase">3DForge AI</p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-none text-ink sm:text-7xl">
              Turn imagination into <span className="text-gradient">3D.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Describe anything. Generate it in 3D. Explore it from every angle.
            </p>
          </motion.div>
          <div className="mt-10">
            {generation.apiOnline === false ? (
              <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100" role="status">
                The API is not reachable. Start the backend, then refresh this page.
              </p>
            ) : null}
            {generation.configured === false ? (
              <p className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100" role="status">
                The server does not have a text-to-3D API key yet. Add FAL_KEY to the backend environment, or set AI_PROVIDER=demo for a labeled sample model.
              </p>
            ) : null}
            {generation.demoMode ? (
              <p className="mb-4 rounded-2xl border border-border bg-white/5 px-4 py-3 text-sm text-muted" role="status">
                Development mode is on. Generations use a sample GLB and are labeled Development Demo Model.
              </p>
            ) : (
              <p className="mb-4 text-sm text-muted">Powered by {generation.modelLabel} through fal.ai. Each generation uses your API account.</p>
            )}
            <PromptComposer
              value={generation.prompt}
              onChange={generation.setPrompt}
              onSubmit={(prompt) => {
                void generation.start(prompt)
              }}
              isSubmitting={generation.phase === 'generating'}
              serverError={generation.phase === 'error' ? generation.error : null}
            />
          </div>
        </section>

        <section id="generator" className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <motion.div
            className="overflow-hidden rounded-[28px] border border-border bg-card"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {generation.phase === 'generating' ? (
              <GenerationStatus
                step={generation.current?.step ?? 'Preparing prompt'}
                queuePosition={generation.current?.queuePosition ?? null}
                detail={generation.current?.detail ?? null}
                isDemo={generation.current?.isDemo || generation.demoMode}
                canCancel={Boolean(generation.current?.cancellable)}
                onCancel={() => {
                  void generation.cancel()
                }}
              />
            ) : generation.phase === 'error' ? (
              <ErrorState message={generation.error ?? 'Model generation failed. Please try again.'} />
            ) : modelUrl ? (
              <Suspense fallback={<LoadingState label="Loading 3D viewer..." />}>
                <ModelViewer url={modelUrl} />
              </Suspense>
            ) : (
              <EmptyState />
            )}
          </motion.div>
          {generation.current && generation.phase === 'completed' ? (
            <ModelInfo
              generation={generation.current}
              downloading={downloading}
              regenerating={false}
              onDownload={() => {
                void download()
              }}
              onRegenerate={() => {
                void generation.regenerate()
              }}
              onCopy={() => {
                void copyPrompt()
              }}
              onShare={() => {
                void share()
              }}
            />
          ) : (
            <aside className="glass hidden rounded-[28px] p-5 text-sm leading-6 text-muted lg:block">
              <p className="text-xs tracking-[0.16em] uppercase">Studio</p>
              <p className="mt-3 text-ink">Rotate, zoom, and pan the result in the browser, then download the GLB.</p>
              <ul className="mt-4 space-y-2">
                <li>Drag to rotate</li>
                <li>Scroll to zoom</li>
                <li>Right-click to pan</li>
              </ul>
            </aside>
          )}
        </section>

        <section id="gallery" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-4xl">Gallery</h2>
          <p className="mt-3 max-w-xl text-sm text-muted">This session’s generations stay in this browser. Selecting one loads it again if the server still has the file.</p>
          <div className="mt-8">
            <GenerationHistory items={generation.history} activeId={generation.current?.id} onSelect={(item) => void generation.restore(item)} />
          </div>
        </section>

        <section id="about" className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6">
          <h2 className="font-serif text-4xl">About</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <AboutCard title="Describe" body="A prompt is checked in the browser and again on the server before it ever reaches the model." />
            <AboutCard title="Generate" body="The API queues Tripo H3.1 on fal.ai, waits for the real GLB, and stores it for viewing and download." />
            <AboutCard title="Explore" body="React Three Fiber frames the mesh, centers it, and lets you orbit it with a resettable camera." />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function AboutCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[24px] border border-border bg-card p-5">
      <h3 className="text-lg text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </article>
  )
}
