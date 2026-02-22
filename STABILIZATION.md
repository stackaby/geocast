# Geocast Stabilization Plan

## Overview

Stabilize the codebase before pushing forward with new features. Focus on fixing known bugs, hardening the binary format, and improving code quality for team/studio use.

---

## Phase 1: Add Up-Axis Metadata

**Goal:** Add minimal metadata needed for the orientation fix.

### Tasks

- [ ] Add up-axis to binary payload
  - Single byte: 'X', 'Y', or 'Z' (currently 'Z' for Blender)
  - Minimal change to existing format
  - Prepend before existing header

- [ ] Document the binary format
  - Create `docs/format.md` with current specification
  - Note: versioning deferred until needed (see "When to Add Versioning")

### Updated Binary Format

```
Payload:
  [up_axis: uint8('X' | 'Y' | 'Z')]
  [header: 16 bytes - existing]
  [name: 32 bytes - existing]
  [positions: float32 array - existing]
  [normals: float32 array - existing]
  [uvs: float32 array - existing]
```

### When to Add Versioning

Skip versioning for now since no teams are using it yet. Add versioning when:

1. Someone outside you starts relying on the protocol, OR
2. You've shipped a version you don't want to break, OR
3. The format stabilizes and you need backward compatibility

This keeps the prototype flexible. Breaking changes are free until someone depends on it.

---

## Phase 2: Orientation Fix

**Goal:** Fix rotation using the up-axis metadata.

### Tasks

- [ ] Producer side (blender.py)
  - Prepend up-axis byte ('Z') to payload
  - Send raw data (no transformation)
  - Update GeometryBufferHeader offsets if needed

- [ ] Consumer side (main.js)
  - Parse up-axis byte at start of payload
  - Apply rotation transformation based on value
  - Z-up → Y-up: rotateX(-90°) or equivalent quaternion

- [ ] Test with multiple objects in Blender
  - Verify orientation is correct
  - Test with non-symmetric geometry

- [ ] Update AGENTS.md with implemented solution

### Reference

From AGENTS.md:
> Orientation: Send raw DCC data with up-axis metadata; consumer handles transformation
> Coordinate system: Z-up (Blender) to Y-up (three.js) via mesh.rotation.x = -Math.PI / 2

---

## Phase 3: Error Handling & Robustness

**Goal:** Don't crash on real-world use.

### Tasks

- [ ] Producer validation (blender.py)
  - Check mesh has UVs before serializing
  - Check mesh has triangles (non-empty)
  - Handle missing active UV layer gracefully
  - Log warnings instead of silently returning empty bytes

- [ ] Relay robustness (server.js)
  - Validate message structure before broadcasting
  - Handle malformed messages gracefully
  - Add basic logging for debugging

- [ ] Consumer robustness (main.js)
  - Implement WebSocket reconnection on disconnect
  - Validate buffer sizes before parsing
  - Handle unexpected up-axis values
  - Add error boundary around geometry update

---

## Phase 4: Code Cleanup

**Goal:** Remove friction for team use.

### Tasks

- [ ] Address TODOs in code
  - `blender.py:168` - Transformation matrix multiplication
  - `blender.py:19-26` - Color generation (remove or implement properly)

- [ ] Remove unused code
  - `src/schema.py` appears unused - verify and remove if not needed
  - `clear_invalid_objects()` is empty - implement or remove

- [ ] Clean upempty directories
  - `src/engine/` is empty - remove or add placeholder

- [ ] Add documentation
  - README with setup/usage instructions
  - Inline comments for binary format parsing
  - Docstrings on key functions

- [ ] Code organization (blender.py)
  - Reorganize into clear sections:
    1. Imports (clean up unused: `struct`, `Struct`, `array`, `Sequence`)
    2. Constants & Types
    3. Binary Format (GeometryBufferHeader, payload building)
    4. Mesh Extraction (get_mesh_stats, vertex/normal/uv extraction)
    5. Object Management (selection, validation)
    6. Networking (WebSocket client)
    7. Entry Point (timer registration)
  - Address global mutable state (`MESH_OBJECTS` at module level)
  - If file grows, consider splitting into modules:
    ```
    src/exporters/blender/
    ├── __init__.py      # Entry point, timer
    ├── selection.py     # Object management
    ├── extract.py       # Mesh data extraction
    ├── serialize.py     # Binary format
    └── network.py       # WebSocket client
    ```
  - Ensure consistent code style

- [ ] Standardize binary payload construction
  - `serialize_edit_mesh()` uses ctypes arrays
  - `serialize_object()` uses numpy arrays with `.flatten()`
  - Pick one approach for consistency (recommend numpy)
  - Remove redundant `bytearray()` wrapper — `b''.join()` returns bytes
  - Consider pre-allocating buffer for large meshes (optional optimization)

- [ ] JavaScript cleanup (main.js)
  - Remove dead code (lines 75-89 — `geoBuffers` is undefined when this runs)
  - Fix duplicated buffer attribute setting code
  - Optimize updates: modify existing buffer instead of creating new `BufferAttribute` each frame
  - Extract magic numbers to constants (`BYTES_PER_FLOAT = 4`)
  - Add error handling for WebSocket and parsing
  - Consider extracting parsing logic into separate function

- [ ] JavaScript cleanup (server.js)
  - Fix consumer cleanup on disconnect (remove from consumers array)
  - Fix confusing assignment in conditional (line 44: `if (consumers = ...)`)
  - Add message validation before broadcasting
  - Prevent memory leak from disconnected clients

- [ ] TypeScript readiness
  - Define interfaces for data structures (future TypeScript conversion):
    ```typescript
    interface GeoBuffers {
      positions: Float32Array;
      normals: Float32Array;
      uvs: Float32Array;
    }

    interface PayloadHeader {
      name_len: number;
      positions_len: number;
      normals_len: number;
      uvs_len: number;
    }
    ```
  - Code already uses modern JS patterns (ES modules, const/let, arrow functions)
  - TypeScript conversion should be straightforward when ready

---

## Out of Scope (Future)

These are tracked in AGENTS.md for later:

- Multi-object streaming
- Material palette system
- Lights support
- Animation support

---

## Success Criteria

After stabilization:

1. Geometry streams correctly with proper orientation
2. Binary format is documented with up-axis metadata
3. Connection drops are handled gracefully
4. Code is clean and documented for team use
5. No silent failures or unhandled edge cases