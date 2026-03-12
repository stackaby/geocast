# Geocast Stabilization Plan

## Overview

Stabilize the codebase before pushing forward with new features. Focus on fixing known bugs, hardening the binary format, and improving code quality for team/studio use.

---

## Phase 1: Add Up-Axis Metadata ✓

**Goal:** Add minimal metadata needed for the orientation fix.

### Tasks

- [x] Add metadata field to binary payload header
  - Added `metadata` uint32 field to GeometryBufferHeader
  - Encodes handedness ('R'/'L') and up-axis ('X'/'Y'/'Z') in byte 3 and 2
  - Blender sends 'R' (right-handed) and 'Z' (Z-up)

- [x] Document the binary format
  - Created `docs/format.md` with current specification
  - Note: versioning deferred until needed (see "When to Add Versioning")

### Implemented Binary Format

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

### Cleanup Needed

- [ ] Remove orphaned code in `blender.py` lines 131-132 (header.handedness/up_axis don't exist)

---

## Phase 2: Orientation Fix ✓

**Goal:** Fix rotation using the up-axis metadata.

### Tasks

- [x] Producer side (blender.py)
  - Added metadata field with handedness and up-axis
  - Sends raw data (no transformation)
  - `BLENDER_HANDEDNESS = ord('R')`, `BLENDER_UP_AXIS = ord('Z')`

- [x] Consumer side (main.js)
  - Parse metadata field from header
  - Extract handedness and up-axis from bytes
  - Apply rotation transformation: Z-up → Y-up via `rotation.makeRotationX(-Math.PI / 2)`

- [ ] Test with multiple objects in Blender
  - Verify orientation is correct
  - Test with non-symmetric geometry

- [x] Update AGENTS.md with implemented solution

### Reference

From main.js:
```javascript
const handedness = String.fromCharCode(header.metadata >> 24 & 0xFF);
const upAxis = String.fromCharCode(header.metadata >> 16 & 0xFF);

if (upAxis === 'Z') {
   rotation = rotation.makeRotationX(-Math.PI / 2);
}
```

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
  - [x] `src/engine/` removed

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

- [x] JavaScript cleanup (server.js)
  - [x] Fix consumer cleanup on disconnect (remove from consumers array)
  - [x] Fix confusing assignment in conditional
  - [x] Extract constants to top (PORT, PRODUCER_TYPE, etc.)
  - [x] Extract getClientType() function
  - [x] Use switch statements for client type handling
  - [ ] Add message validation before broadcasting (optional)
  - [ ] Prevent memory leak from disconnected clients (partially done)

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

1. Geometry streams correctly with proper orientation ✓
2. Binary format is documented with up-axis metadata ✓
3. Connection drops are handled gracefully
4. Code is clean and documented for team use
5. No silent failures or unhandled edge cases