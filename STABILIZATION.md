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
  - `blender.py:168` - Transformation matrix multiplication (for world-space coordinates)

- [x] Remove unused code
  - [x] `src/schema.py` - deleted (was not imported anywhere)
  - [x] Removed unused imports in blender.py (`struct`, `Struct`, `array`, `Sequence`)
  - [x] Removed empty `clear_invalid_objects()` function

- [x] Clean up empty directories
  - [ ] `src/engine/` is empty - remove or add placeholder

- [ ] Add documentation
  - [ ] README with setup/usage instructions
  - [ ] Inline comments for binary format parsing
  - [ ] Docstrings on key functions

- [x] Code organization (blender.py)
  - [x] Reorganized imports (removed unused)
  - [x] Formatted with 3-space indentation (ruff)
  - [x] Removed empty function
  - [x] Removed redundant `bytearray()` wrapper (lines 135, 196) — now using `b"".join()` directly
  - [ ] Address global mutable state (`MESH_OBJECTS` at module level) - optional refactor

- [ ] Standardize binary payload construction
  - `serialize_edit_mesh()` uses ctypes arrays
  - `serialize_object()` uses numpy arrays with `.flatten()`
  - [ ] Pick one approach for consistency (recommend numpy)
  - Consider pre-allocating buffer for large meshes (optional optimization)

- [x] JavaScript cleanup (main.js)
  - [x] Removed dead code block (old lines 75-89)
  - [x] Fixed duplicated buffer attribute setting code
  - [x] Optimized updates: pre-allocated BufferAttributes, update in place with `needsUpdate`
  - [x] Extracted magic numbers to constants (BYTES_PER_FLOAT, HEADER_LEN, colors, camera settings)
  - [x] Cleaned up unused constants (removed positionNumComponents, etc.)
  - [x] Removed redundant camera position overwrite
  - [x] Removed unnecessary `geoBuffers` variable
  - [x] Extracted parsing logic into `parseGeoData()` function
  - [x] Extracted header parsing into `parseHeader()` function
  - [x] Extracted update logic into `updateGeometry()` function with destructuring
  - [x] Converted header object to camelCase (nameLen, positionsLen, etc.)
  - [ ] Add overflow check for large meshes:
    ```javascript
    if (header.positions_len > MAX_VERTICES * 3) {
       console.warn("Mesh exceeds MAX_VERTICES");
       return;
    }
    ```
  - [ ] Consider dynamic buffer sizing (resize when needed instead of fixed MAX_VERTICES)
  - [ ] Add error handling for WebSocket and parsing

- [ ] JavaScript cleanup (server.js)
  - [ ] Fix consumer cleanup on disconnect (remove from consumers array)
  - [ ] Fix confusing assignment in conditional (line 44: `if (consumers = ...)`)
  - [ ] Add message validation before broadcasting
  - [ ] Prevent memory leak from disconnected clients

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