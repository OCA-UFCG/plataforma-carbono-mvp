// A glTF model standing on every point of a vector layer (the flux towers of
// "Áreas de Monitoramento"), drawn by three.js inside a MapLibre custom layer.
//
// three.js is imported here and nowhere else, and MapView loads this module
// with a dynamic import only when such a layer is switched on, so the ~600 kB
// library stays out of the bundle everyone downloads.

import maplibregl from 'maplibre-gl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { VectorLayerConfig } from '@/types/mapa'

// Below this zoom a tower is a pixel or two: the pulsing point says more.
const MIN_ZOOM = 14

interface Placement {
  lngLat: [number, number]
  /** Scene units to meters, so the model stands at the configured height. */
  metersPerUnit: number
  scene: THREE.Scene
}

export async function createPointModelLayer(
  layer: VectorLayerConfig,
  points: GeoJSON.Feature<GeoJSON.Point>[],
): Promise<maplibregl.CustomLayerInterface> {
  const model = layer.model!
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync(model.url)
  const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3())

  const placements: Placement[] = points.map((f) => {
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 2.2))
    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(-1, 2, 1)
    scene.add(sun)
    scene.add(gltf.scene.clone())
    return {
      lngLat: f.geometry.coordinates as [number, number],
      metersPerUnit: model.height / size.y,
      scene,
    }
  })

  let map: maplibregl.Map
  let renderer: THREE.WebGLRenderer
  const camera = new THREE.Camera()
  // glTF is Y-up; the map's mercator frame is Z-up.
  const yUpToZUp = new THREE.Matrix4().makeRotationX(Math.PI / 2)

  return {
    id: `${layer.id}-model`,
    type: 'custom',
    renderingMode: '3d',
    onAdd(m, gl) {
      map = m
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
    },
    render(_gl, args) {
      if (map.getZoom() < MIN_ZOOM) return
      const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix)
      for (const p of placements) {
        // On the 3D terrain the base follows the ground; flat, it sits at 0.
        const ground = map.getTerrain() ? map.queryTerrainElevation(p.lngLat) ?? 0 : 0
        const origin = maplibregl.MercatorCoordinate.fromLngLat(p.lngLat, ground)
        const s = origin.meterInMercatorCoordinateUnits() * p.metersPerUnit
        const placement = new THREE.Matrix4()
          .makeTranslation(origin.x, origin.y, origin.z)
          .scale(new THREE.Vector3(s, -s, s))
          .multiply(yUpToZUp)
        camera.projectionMatrix = projection.clone().multiply(placement)
        renderer.resetState()
        renderer.render(p.scene, camera)
      }
    },
  }
}
