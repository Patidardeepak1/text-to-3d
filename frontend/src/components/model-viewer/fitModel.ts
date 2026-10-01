import * as THREE from 'three'

export interface FittedScene {
  scene: THREE.Group
  floorY: number
}

export function fitModel(source: THREE.Object3D, wireframe: boolean): FittedScene {
  const scene = new THREE.Group()
  const clone = source.clone(true)
  scene.add(clone)

  clone.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const cloned = materials.map((material) => {
      const next = material.clone()
      if ('wireframe' in next) next.wireframe = wireframe
      next.needsUpdate = true
      return next
    })
    const first = cloned[0]
    if (!first) return
    mesh.material = Array.isArray(mesh.material) ? cloned : first
  })

  clone.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(clone)
  if (box.isEmpty()) return { scene, floorY: -0.9 }

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
  clone.scale.setScalar(1.8 / maxDim)
  clone.position.copy(center).multiplyScalar(-1.8 / maxDim)
  clone.updateMatrixWorld(true)

  const fitted = new THREE.Box3().setFromObject(clone)
  return { scene, floorY: Number.isFinite(fitted.min.y) ? fitted.min.y : -0.9 }
}

export function disposeFitted(scene: THREE.Object3D) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((material) => material.dispose())
  })
}
