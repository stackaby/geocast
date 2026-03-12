# Geocast Binary Format Specification

## Overview

Geocast uses a custom binary format for real-time streaming of geometry data from DCC applications (currently Blender) to a web-based three.js viewer. The format is designed for minimal parse overhead and low-latency transmission over WebSocket.

## Version

Current version: **0.1** (unversioned)

This format is in prototype phase. No version field is included in the payload. Versioning will be added when:
1. External users start relying on the protocol, OR
2. A shipped version needs backward compatibility

## Payload Structure

```
┌─────────────────────────────────────────────────────┐
│                    Header (20 bytes)                │
├─────────────────────────────────────────────────────┤
│ name_len      │ uint32   │ Length of name field     │
│ metadata      │ uint32   │ Handedness + up-axis     │
│ positions_len │ uint32   │ Number of position floats│
│ normals_len   │ uint32   │ Number of normal floats  │
│ uvs_len       │ uint32   │ Number of UV floats      │
├─────────────────────────────────────────────────────┤
│                    Name (32 bytes)                  │
├─────────────────────────────────────────────────────┤
│ name          │ bytes    │ Null-padded mesh name    │
├─────────────────────────────────────────────────────┤
│                 Positions (float32[])               │
├─────────────────────────────────────────────────────┤
│ positions     │ float32  │ XYZ per vertex           │
├─────────────────────────────────────────────────────┤
│                  Normals (float32[])                │
├─────────────────────────────────────────────────────┤
│ normals       │ float32  │ XYZ per vertex           │
├─────────────────────────────────────────────────────┤
│                     UVs (float32[])                 │
├─────────────────────────────────────────────────────┤
│ uvs           │ float32  │ UV per vertex            │
└─────────────────────────────────────────────────────┘
```

All multi-byte values are **little-endian**.

## Header Fields

| Field | Type | Offset | Description |
|-------|------|--------|-------------|
| name_len | uint32 | 0 | Length of name field in bytes (typically 32) |
| metadata | uint32 | 4 | Encoded metadata (see below) |
| positions_len | uint32 | 8 | Number of float32 values in positions array |
| normals_len | uint32 | 12 | Number of float32 values in normals array |
| uvs_len | uint32 | 16 | Number of float32 values in UVs array |

## Metadata Encoding

The `metadata` field encodes coordinate system information in a 32-bit unsigned integer:

```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│  Byte 3 (MSB) │    Byte 2     │    Byte 1     │    Byte 0     │
├───────────────┼───────────────┼───────────────┼───────────────┤
│  Handedness   │   Up-Axis     │   Reserved    │   Reserved    │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

### Handedness (Byte 3)

Encoded as ASCII character value:
- `'L'` (76) = Left-handed coordinate system
- `'R'` (82) = Right-handed coordinate system

### Up-Axis (Byte 2)

Encoded as ASCII character value:
- `'X'` (88) = X-axis is up
- `'Y'` (89) = Y-axis is up
- `'Z'` (90) = Z-axis is up

### Reserved (Bytes 0-1)

Reserved for future use. Should be set to 0.

### Example

Blender's coordinate system (right-handed, Z-up):
```python
metadata = (ord('R') << 24) | (ord('Z') << 16)
# = 0x525A0000
```

## Name Field

Fixed 32-byte field containing the mesh name as UTF-8 encoded bytes, null-padded if shorter than 32 bytes.

## Geometry Data

### Positions

- Type: `float32` array
- Length: `positions_len` values
- Layout: `[x0, y0, z0, x1, y1, z1, ...]`
- Coordinate system: Raw DCC coordinates (see metadata for transformation)

### Normals

- Type: `float32` array
- Length: `normals_len` values
- Layout: `[nx0, ny0, nz0, nx1, ny1, nz1, ...]`
- Normalized: Yes (unit vectors)

### UVs

- Type: `float32` array
- Length: `uvs_len` values
- Layout: `[u0, v0, u1, v1, ...]`
- Range: Typically [0.0, 1.0] but can exceed for tiling

## Geometry Representation

Geometry is sent as **triangle soup** (non-indexed):
- Each triangle is represented as 3 vertices
- Vertices are not deduplicated
- Total vertices = `positions_len / 3`

Example: A quad (2 triangles) = 6 vertices = 18 position floats

## Coordinate Transformation

The consumer (three.js) is responsible for transforming DCC coordinates to its coordinate system:

| DCC Up-Axis | three.js Transformation |
|-------------|-------------------------|
| X | Rotate Z by -90° |
| Y | None (native) |
| Z | Rotate X by -90° |

Example for Z-up (Blender):
```javascript
if (upAxis === 'Z') {
    rotation.makeRotationX(-Math.PI / 2);
}
mesh.setRotationFromMatrix(rotation);
```

## Parsing Example (JavaScript)

```javascript
const BYTES_PER_FLOAT = 4;
const HEADER_LEN = 20;

function parsePayload(buffer) {
    const view = new DataView(buffer);
    
    // Parse header
    const header = {
        nameLen: view.getInt32(0, true),
        metadata: view.getInt32(4, true),
        positionsLen: view.getInt32(8, true),
        normalsLen: view.getInt32(12, true),
        uvsLen: view.getInt32(16, true),
    };
    
    // Extract metadata
    const handedness = String.fromCharCode(header.metadata >> 24 & 0xFF);
    const upAxis = String.fromCharCode(header.metadata >> 16 & 0xFF);
    
    // Parse name
    const nameBytes = buffer.slice(HEADER_LEN, HEADER_LEN + header.nameLen);
    const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    
    // Parse geometry arrays
    const positionsStart = HEADER_LEN + header.nameLen;
    const positions = new Float32Array(buffer, positionsStart, header.positionsLen);
    
    const normalsStart = positionsStart + header.positionsLen * BYTES_PER_FLOAT;
    const normals = new Float32Array(buffer, normalsStart, header.normalsLen);
    
    const uvsStart = normalsStart + header.normalsLen * BYTES_PER_FLOAT;
    const uvs = new Float32Array(buffer, uvsStart, header.uvsLen);
    
    return { name, handedness, upAxis, positions, normals, uvs };
}
```

## Future Considerations

The following may be added in future versions:

1. **Version field** - When backward compatibility is needed
2. **Index buffer** - For indexed geometry (reduces vertex duplication)
3. **Material IDs** - For multi-material meshes
4. **Bounding box** - For frustum culling without parsing geometry
5. **Compression** - Float16 quantization, delta encoding for animation
6. **Multiple objects** - Currently one mesh per payload

## References

- Producer implementation: `src/exporters/blender.py`
- Consumer implementation: `assets/scripts/main.js`