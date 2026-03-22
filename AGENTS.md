# Geocast Development Notes

## Project Overview

Streaming live geometry updates from Blender to a web browser via WebSockets for real-time 3D visualization using three.js.

## Documentation

- **ROADMAP.md** - Feature roadmap, future vision, performance optimization
- **STABILIZATION.md** - Current stabilization work and code cleanup tasks

## Architecture

- **Producer**: Blender addon (`src/geocast/exporters/blender.py`) - runs on 60fps timer, extracts mesh data
  - Bootstrap (`src/geocast/exporters/bootstrap.py`) - sets up virtualenv site-packages before main script
- **Relay**: Node.js WebSocket server (`assets/scripts/server.js`) - broadcasts from producer to consumers
- **Consumer**: Browser three.js app (`assets/scripts/main.js`) - renders geometry

## Current Status

### In Progress

See STABILIZATION.md for detailed task tracking.

- Phase 0: MVP Deployment (Railway + rooms)
- Phase 3: Error handling & robustness
- Phase 4: Code cleanup (remaining documentation tasks)
- Material palette system

### Completed

- Phase 1: Add up-axis metadata to binary payload ✓
- Phase 2: Fix orientation bug (Z-up to Y-up conversion) ✓
- Phase 4: Code Cleanup
  - Removed unused code (schema.py, engine/, unused imports)
  - Optimized BufferAttribute updates (pre-allocate, update in place)
  - Refactored main.js (extracted functions, constants at top)
  - Refactored server.js (consumer cleanup, extracted functions)
  - Formatted blender.py with ruff (3-space indentation)
- Orbit camera controls (OrbitControls)

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
  [header: 20 bytes]
    - name_len: uint32
    - metadata: uint32 (handedness | up_axis | reserved | reserved)
    - positions_len: uint32
    - normals_len: uint32
    - uvs_len: uint32
  [name: 32 bytes]
  [positions: float32 array]
  [normals: float32 array]
  [uvs: float32 array]

Metadata encoding:
  - Byte 3 (MSB): Handedness ('L' or 'R')
  - Byte 2: Up-axis ('X', 'Y', or 'Z')
  - Bytes 0-1: Reserved
```

### Code Style

- Python: 3-space indentation (ruff formatter)
- JavaScript: camelCase for variables, SCREAMING_SNAKE_CASE for constants
- Constants at top of file

### Bootstrap Pattern

- Blender's embedded Python doesn't automatically load `sitecustomize.py` from PYTHONPATH
- `bootstrap.py` explicitly adds virtualenv site-packages to `sys.path` before importing the main module
- Entry point is `bootstrap.py` which calls `main()` from `blender.py`
- Keeps environment setup isolated from business logic

## Future

See ROADMAP.md for full details.

- Railway deployment with rooms support
- Snapshots & glb export
- Materials and animation support
- Multi-object streaming
- Collaboration features
- Additional DCC support (Maya, Houdini)