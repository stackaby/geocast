# Geocast Development Notes

## Project Overview
Streaming live geometry updates from Blender to a web browser via WebSockets for real-time 3D visualization using three.js.

## Architecture
- Producer: Blender addon (src/exporters/blender.py) - runs on 60fps timer, extracts mesh data
- Relay: Node.js WebSocket server (assets/scripts/server.js) - broadcasts from producer to consumers
- Consumer: Browser three.js app (assets/scripts/main.js) - renders geometry

## Roadmap

### In Progress
- Add up-axis metadata to binary payload
- Fix orientation bug (Z-up to Y-up conversion)
- Add orbital camera controls
- Material palette system

### Future
- Lights support
- Materials support
- Animation support
- Multi-object streaming
- Reconnection handling

## Design Decisions
- Orientation: Send raw DCC data with up-axis metadata; consumer handles transformation
- Coordinate system: Z-up (Blender) to Y-up (three.js) via mesh.rotation.x = -Math.PI / 2
