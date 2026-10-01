import { ContactShadows, Grid, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MOUSE, TOUCH } from 'three'
import * as THREE from 'three'
import { disposeFitted, fitModel } from './fitModel'
import { ViewerToolbar } from './ViewerToolbar'

interface ModelViewerProps {
  url: string
}

export default function ModelViewer({ url }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [resetSignal, setResetSignal] = useState(0)
  const [background, setBackground] = useState('#101116')
  const [floorY, setFloorY] = useState(-0.9)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    setLoadError(null)
    setWireframe(false)
  }, [url])

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = () => {
    const element = containerRef.current
    if (!element) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    void element.requestFullscreen()
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[420px]" style={{ background }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [2.6, 1.55, 2.9], fov: 42, near: 0.01, far: 100 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05
        }}
      >
        <color attach="background" args={[background]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#e7ecff', '#1a1b22', 0.5]} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#9aa7ff" />
        <Suspense fallback={null}>
          <ModelErrorBoundary key={url} onError={() => setLoadError('Generated model could not be loaded.')}>
            <FittedModel url={url} wireframe={wireframe} onFloor={setFloorY} />
          </ModelErrorBoundary>
        </Suspense>
        {showGrid ? (
          <Grid
            position={[0, floorY, 0]}
            args={[12, 12]}
            cellSize={0.25}
            cellThickness={0.6}
            cellColor="#2c2e3a"
            sectionSize={1}
            sectionThickness={1.1}
            sectionColor="#3d4154"
            fadeDistance={14}
            infiniteGrid
          />
        ) : null}
        <ContactShadows position={[0, floorY, 0]} opacity={0.4} scale={8} blur={2.2} far={4} />
        <CameraRig resetSignal={resetSignal} autoRotate={autoRotate} />
      </Canvas>
      <LoadProgress />
      {loadError ? (
        <div className="absolute inset-0 grid place-items-center bg-background/85 px-6 text-center text-sm" role="alert">
          <p>{loadError}</p>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3 sm:p-4">
        <p className="text-xs text-muted">Drag to rotate · Scroll to zoom · Right-click to pan</p>
        <div className="pointer-events-auto">
        <ViewerToolbar
          autoRotate={autoRotate}
          wireframe={wireframe}
          showGrid={showGrid}
          fullscreen={fullscreen}
          background={background}
          onReset={() => setResetSignal((value) => value + 1)}
          onToggleRotate={() => setAutoRotate((value) => !value)}
          onToggleWireframe={() => setWireframe((value) => !value)}
          onToggleGrid={() => setShowGrid((value) => !value)}
          onToggleFullscreen={toggleFullscreen}
          onBackground={setBackground}
        />
        </div>
      </div>
    </div>
  )
}

function FittedModel({ url, wireframe, onFloor }: { url: string; wireframe: boolean; onFloor: (y: number) => void }) {
  const gltf = useGLTF(url)
  const fitted = useMemo(() => fitModel(gltf.scene, wireframe), [gltf.scene, wireframe])

  useEffect(() => {
    onFloor(fitted.floorY)
    return () => disposeFitted(fitted.scene)
  }, [fitted, onFloor])

  useEffect(() => {
    return () => {
      useGLTF.clear(url)
    }
  }, [url])

  return <primitive object={fitted.scene} />
}

function CameraRig({ resetSignal, autoRotate }: { resetSignal: number; autoRotate: boolean }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3; update: () => void } | null

  useEffect(() => {
    camera.position.set(2.6, 1.55, 2.9)
    camera.lookAt(0, 0, 0)
    if (controls) {
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }, [camera, controls, resetSignal])

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={0.85}
      enablePan
      minDistance={0.7}
      maxDistance={12}
      mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
    />
  )
}

function LoadProgress() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="absolute top-4 left-4 rounded-full border border-border bg-black/50 px-3 py-1 text-xs text-muted" role="status">
      Loading model {Math.round(progress)}%
    </div>
  )
}

class ModelErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}
