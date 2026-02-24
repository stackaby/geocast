# Geocast Development Notes

## Project Overview

Streaming live geometry updates from Blender to a web browser via WebSockets for real-time 3D visualization using three.js.

## Documentation

- **ROADMAP.md** - Feature roadmap, future vision, performance optimization
- **STABILIZATION.md** - Current stabilization work and code cleanup tasks

## Architecture

- **Producer**: Blender addon (`src/exporters/blender.py`) - runs on 60fps timer, extracts mesh data
- **Relay**: Node.js WebSocket server (`assets/scripts/server.js`) - broadcasts from producer to consumers
- **Consumer**: Browser three.js app (`assets/scripts/main.js`) - renders geometry

## Current Status

### In Progress

See STABILIZATION.md for detailed task tracking.

- Phase 1: Add up-axis metadata to binary payload
- Phase 2: Fix orientation bug (Z-up to Y-up conversion)

### Completed

- Phase 4: Code Cleanup
  - Removed unused code (schema.py, engine/, unused imports)
  - Optimized BufferAttribute updates (pre-allocate, update in place)
  - Refactored main.js (extracted functions, constants at top)
  - Refactored server.js (consumer cleanup, extracted functions)
  - Formatted blender.py with ruff (3-space indentation)

## Design Decisions

### Binary Format

- **Custom binary** for real-time streaming (minimal overhead)
- **glb** for snapshots and exports (standard format, shareable)
- **No versioning** until needed (prototype phase, no users yet)

### Orientation

- Send raw DCC data with up-axis metadata
- Consumer handles transformation
- Z-up (Blender) to Y-up (three.js) via rotation

### Performance

- Pre-allocate BufferAttributes, update in place with `needsUpdate`
- Avoid creating new objects per frame in render loop
- Use numpy for efficient serialization in Python

### Protocol

```
Payload:
  [up_axis: uint8('X' | 'Y' | 'Z')]  -- Phase 1 addition
  [header: 16 bytes]
  [name: 32 bytes]
  [positions: float32 array]
  [normals: float32 array]
  [uvs: float32 array]
```

### Code Style

- Python: 3-space indentation (ruff formatter)
- JavaScript: camelCase for variables, SCREAMING_SNAKE_CASE for constants
- Constants at top of file

## Future

See ROADMAP.md for full details.

- Snapshots & glb export
- Materials and animation support
- Multi-object streaming
- Collaboration features
- Additional DCC support (Maya, Houdini)