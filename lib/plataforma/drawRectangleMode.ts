/**
 * Custom rectangle drawing mode for @mapbox/mapbox-gl-draw.
 *
 * mapbox-gl-draw ships with draw_point, draw_line_string, and draw_polygon
 * out of the box, but not rectangle. This is a minimal click-click rectangle
 * implementation: first click anchors one corner, mouse moves preview the
 * opposite corner, second click finalizes.
 *
 * Typed loosely because mapbox-gl-draw's mode API isn't well-typed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const DrawRectangleMode: any = {
  onSetup(this: any) {
    const rectangle = this.newFeature({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[]],
      },
    })
    this.addFeature(rectangle)
    this.clearSelectedFeatures()
    this.updateUIClasses({ mouse: 'add' })
    this.setActionableState({ trash: true })
    return { rectangle, startPoint: null }
  },

  onClick(this: any, state: any, e: any) {
    if (!state.startPoint) {
      // First click, anchor one corner and begin live preview
      state.startPoint = [e.lngLat.lng, e.lngLat.lat]
      return
    }
    // Second click, finalize and hand off to simple_select
    this.updateUIClasses({ mouse: 'pointer' })
    this.changeMode('simple_select', { featureIds: [state.rectangle.id] })
  },

  onMouseMove(this: any, state: any, e: any) {
    if (!state.startPoint) return
    const [x1, y1] = state.startPoint
    const x2 = e.lngLat.lng
    const y2 = e.lngLat.lat
    // Update the live rectangle: 5 corners (closing back to start)
    state.rectangle.updateCoordinate('0.0', x1, y1)
    state.rectangle.updateCoordinate('0.1', x2, y1)
    state.rectangle.updateCoordinate('0.2', x2, y2)
    state.rectangle.updateCoordinate('0.3', x1, y2)
    state.rectangle.updateCoordinate('0.4', x1, y1)
  },

  onKeyUp(this: any, state: any, e: any) {
    if (e.keyCode === 27) {
      // Escape -> cancel draw and drop the partial feature
      this.deleteFeature([state.rectangle.id], { silent: true })
      this.changeMode('simple_select')
    }
  },

  onStop(this: any, state: any) {
    this.updateUIClasses({ mouse: 'none' })
    const feature = this.getFeature(state.rectangle.id)
    if (feature === undefined) return

    // Strip the redundant closing coordinate before validity check
    state.rectangle.removeCoordinate('0.4')

    if (state.rectangle.isValid()) {
      this.map.fire('draw.create', {
        features: [state.rectangle.toGeoJSON()],
      })
    } else {
      this.deleteFeature([state.rectangle.id], { silent: true })
      this.changeMode('simple_select', {}, { silent: true })
    }
  },

  toDisplayFeatures(state: any, geojson: any, display: any) {
    const isActive = geojson.properties.id === state.rectangle.id
    geojson.properties.active = isActive ? 'true' : 'false'
    if (!isActive) return display(geojson)
    // Don't try to render the in-progress rectangle until it has a start
    // point, the feature is initialized with empty coordinates and would
    // otherwise crash downstream ("Cannot read properties of undefined").
    if (!state.startPoint) return
    return display(geojson)
  },
}

export default DrawRectangleMode
