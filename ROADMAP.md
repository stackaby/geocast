# Geocast Roadmap

## Vision

A DCC-agnostic platform for streaming and reviewing 3D content in the browser. Enable remote dailies, asset review, and collaboration without requiring software installation on the viewing device.

## Core Principles

- **DCC agnostic** — Works with Blender, Maya, Houdini, and future DCCs
- **Unified serialization** — Common format across all producers
- **Flexible delivery** — Real-time streaming and static snapshots
- **Accessible** — View on any device with a browser (desktop, tablet, phone)
- **Collaborative** — Support for multi-user sessions and annotations

---

## Format Strategy

Two formats for two purposes:

### Custom Binary — Real-time Streaming

Custom binary format for live DCC-to-browser streaming.

| Advantage | Why it matters |
|-----------|----------------|
| Minimal parse overhead | Read bytes directly, no JSON decode |
| Small payload size | No schema metadata, just data |
| Incremental updates | Send only changed vertices/frames |
| Low latency | Designed for 60fps streaming |

Used for: Live DCC connection, real-time modeling feedback, animation playback.

### glb — Snapshots & Exports

Standard glTF binary format for static captures.

| Advantage | Why it matters |
|-----------|----------------|
| Universal support | three.js loads natively, any 3D tool can open |
| Self-contained | Geometry + materials + textures in one file |
| Shareable | Easy to store, share, load without DCC connection |
| Future-proof | Industry standard, well-documented |

glb = glTF packed into a single binary file (JSON header + geometry + textures).

Used for: Snapshots, dailies review, cloud storage, asset library, sharing with non-DCC users.

### Summary

| Use case | Format |
|----------|--------|
| Real-time streaming | Custom binary |
| Snapshots / exports | glb |
| Cloud storage | glb |
| File interchange | glb |

---

## Current State (v0.1)

- Single DCC: Blender only
- Single content type: Geometry (vertices, normals, UVs)
- Delivery: Real-time streaming via WebSocket
- Platform: Desktop browser
- Collaboration: None
- Features:
  - ✓ Orbit camera controls (OrbitControls)
  - ✓ Z-up to Y-up orientation handling
  - ✓ Metadata in binary payload (handedness, up-axis)

---

## Phase 0: MVP Deployment

**Goal:** Deploy to Railway with rooms support for easy demos.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│               Docker Container (Railway)            │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │  Static Server  │    │   WebSocket Server      │ │
│  │  (frontend)     │    │   (relay)               │ │
│  └─────────────────┘    └─────────────────────────┘ │
│                        rooms: { A, B, C, ... }       │
└─────────────────────────────────────────────────────┘
         │                              │
    Browser opens              Blender connects
    ?room=ABC123               with room=ABC123
```

### URL Scheme (Query Params)

```
Producer: wss://geocast.app?room=ABC123&role=producer
Consumer: wss://geocast.app?room=ABC123&role=consumer
Browser:  https://geocast.app?room=ABC123
```

### Tasks

- [ ] Server changes (`server.js`)
  - Parse `room` from query string alongside `role`
  - Store clients by room: `Map<roomId, { producer, consumers[] }>`
  - Route messages only within same room
  - Add static file serving for frontend
  - Add `/health` endpoint for Railway

- [ ] Frontend changes (`main.js`)
  - Parse `?room=ABC123` from URL on page load
  - Generate random room ID (6 chars) if no param
  - Display room ID with copy-to-clipboard button
  - Update WebSocket URL for production

- [ ] Blender add-on changes (`blender.py`)
  - Configurable or hardcoded server URL
  - Add room ID input field in Blender UI
  - Pass room ID in WebSocket connection

- [ ] Docker setup
  - Create Dockerfile (node:18-alpine)
  - Serve static files + WebSocket on single port
  - Bundle `dist/` directory

- [ ] Deployment
  - Railway account setup
  - `railway init` and `railway up`
  - Test end-to-end

### Things to Handle

- **Environment:** `PORT` set by Railway, `NODE_ENV=production`
- **WebSocket origin:** May need origin checking for WSS upgrades
- **Reconnection:** Producer and consumer reconnection logic
- **Room ID generation:** 6-char alphanumeric (~1.9B combinations)
- **Memory cleanup:** When to flush empty rooms?

### Platform Choice: Railway

- Free tier: 512MB RAM, 1GB disk, $5/month credits
- Automatic HTTPS/WSS
- WebSocket support out of the box
- Single port deployment

---

## Phase 1: Stabilization

See [STABILIZATION.md](./STABILIZATION.md) for detailed tasks.

- Fix orientation bug
- Harden error handling
- Improve code quality

---

## Phase 2: Serialization Unification

**Goal:** Establish a DCC-agnostic serialization format.

### Tasks

- [ ] Define unified binary format specification
  - Versioned, extensible header
  - Metadata block (DCC source, up-axis, coordinate system, frame info)
  - Geometry data (positions, normals, UVs, indices)
  - Future-proof for materials, animation, lights

- [ ] Create serialization library (Python)
  - Standalone package, DCC-agnostic
  - Used by all DCC plugins
  - Handles format versioning and validation

- [ ] Update Blender exporter
  - Use unified serialization library
  - Maintain real-time streaming capability

- [ ] Add Maya exporter
  - First additional DCC support
  - Proves serialization is DCC-agnostic

### Unified Binary Format (Proposed)

```
Payload:
  [magic: uint32]              # "GEOC" for identification
  [version: uint16]            # Format version
  [metadata_len: uint32]       # Metadata block length
  [metadata: bytes]            # JSON or MessagePack
  [geometry_count: uint32]     # Number of geometry objects
  [geometry blocks...]         # Per-object data

Metadata (JSON):
  {
    "source_dcc": "blender",
    "up_axis": "Z",
    "handedness": "right",
    "frame": 1,
    "fps": 24,
    "timestamp": "2025-02-21T00:00:00Z"
  }

Geometry Block:
  [name_len: uint16]
  [name: bytes]
  [vertex_count: uint32]
  [index_count: uint32]        # 0 if non-indexed
  [positions: float32 array]   # xyz per vertex
  [normals: float32 array]     # xyz per vertex
  [uvs: float32 array]         # uv per vertex
  [indices: uint32 array]      # optional, for indexed geometry
```

---

## Phase 3: Snapshots & Persistence

**Goal:** Support static capture and cloud storage using glb format.

### Tasks

- [ ] Snapshot capture
  - Capture current state from DCC
  - Export as glb (standard format, three.js native support)
  - Include materials and textures in glb
  - Load snapshot in viewer without DCC connection

- [ ] Binary-to-glb conversion
  - Convert streamed binary data to glb in browser
  - Or export directly from DCC plugin as glb

- [ ] Cloud storage integration
  - Upload glb snapshots to cloud storage
  - Generate shareable links
  - Version history for assets

- [ ] Snapshot viewer
  - Load and display glb files
  - Offline viewing capability
  - Playback controls for animation snapshots (if embedded)

### Use Cases

- **Remote dailies** — Capture snapshots, share links with reviewers
- **Asset library** — Build a library of glb assets
- **Version comparison** — Compare snapshots over time
- **Client review** — Share glb via link, no DCC required

---

## Phase 4: Materials & Animation

**Goal:** Stream and capture more than geometry.

### Tasks

- [ ] Materials support
  - PBR material properties (albedo, roughness, metallic, normal)
  - Texture embedding or referencing
  - Material assignment per geometry

- [ ] Animation support
  - Frame-by-frame streaming
  - Playback controls in viewer
  - Timeline scrubbing

- [ ] Lights support
  - Light types (point, spot, directional)
  - Light properties (color, intensity, shadows)

---

## Phase 5: Collaboration

**Goal:** Multi-user review and annotation.

### Tasks

- [ ] Session management
  - Create/join review sessions
  - Unique session URLs
  - Host controls (who can view, annotate)

- [ ] Annotations
  - Draw on 3D surface (mesh attachment points)
  - 2D overlay notes (screen-space)
  - Voice/text comments

- [ ] Synchronized viewing
  - All users see same camera position
  - Follow host or free-roam mode
  - Pointer sharing

### Use Cases

- **Dailies review** — Director and artists in different locations
- **Client presentations** — Share work-in-progress without sending files
- **Team collaboration** — Annotate issues directly on model

---

## Phase 6: Additional DCC Support

**Goal:** Broad DCC compatibility.

### Tasks

- [ ] Houdini exporter
- [ ] Cinema 4D exporter
- [ ] 3ds Max exporter
- [ ] Generic FBX/Alembic importer
  - For DCCs without native plugins
  - File-based import into viewer

---

## Infrastructure Considerations

### Storage

- **Short-term:** Local file system, ephemeral WebSocket relay
- **Medium-term:** Cloud storage (S3, GCS, Azure Blob)for snapshots
- **Long-term:** Asset management database, version history

### Networking

- **Current:** WebSocket relay (local network)
- **Future:** 
  - WebRTC for peer-to-peer streaming
  - Cloud relay for remote access
  - Authentication and access control

### Deployment

- **Development:** Local WebSocket server, local browser
- **Production:**
  - Containerized relay server
  - Static web hosting for viewer (Vercel, Netlify, S3)
  - Cloud storage for snapshots

---

## Performance Optimization

### Current Bottlenecks

| Stage | Current State | Bottleneck Level |
|-------|---------------|------------------|
| Blender mesh extraction | Python + NumPy | Moderate (Blender API overhead) |
| Serialization | ctypes/NumPy | Low |
| Network transfer | WebSocket | High (bandwidth) |
| Browser parsing | DataView | Low |
| Three.js update | Pre-allocated BufferAttribute with `needsUpdate` | **Low** ✓ |

### Optimization Strategies

#### High Impact (No C Required)

| Optimization | Benefit | Effort |
|--------------|---------|--------|
| **Reuse BufferAttribute** | Eliminates object creation per frame | Low |
| **Indexed geometry** | Send vertices once + indices (reduces duplicates) | Medium |
| **Float16 quantization** | 50% bandwidth reduction | Medium |
| **Delta compression** | Send only changed vertices (80-99% for animation) | High |

#### BufferAttribute Fix ✓

Implemented:
```javascript
// Pre-allocate, update in place
const MAX_VERTICES = 100000;
const positionAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3);
bufferGeo.setAttribute('position', positionAttr);

// On receive:
positionAttr.array.set(incomingPositions);
positionAttr.needsUpdate = true;
positionAttr.updateRange = { offset: 0, count: incomingPositions.length };
```

#### Bandwidth Reduction

| Technique | Use Case | Savings |
|-----------|----------|---------|
| Float16 instead of Float32 | Precision acceptable for display | 50% |
| Quantize to uint16 + scale | Normals, positions (with bounds) | 75% |
| zstd compression | Network transfer | 50-70% |
| Delta encoding | Animation, sculpting | 80-99% |

#### Indexed Geometry

Current: Triangle soup (vertices duplicated per triangle)
```
[ v1, v2, v3, v2, v4, v3, ... ] // duplicates shared vertices
```

Better: Unique vertices + indices
```
vertices: [ v1, v2, v3, v4, ... ]
indices: [ 0, 1, 2, 1, 3, 2, ... ]
```

### When C Integration Might Help

| Scenario | Verdict |
|----------|---------|
| Serialization | Not worth it — NumPy is C under the hood |
| Mesh extraction | Limited — Blender Python API is the bottleneck |
| Compression | Maybe — use existing zstd bindings |
| Custom binary packing | Not needed — struct/ctypes sufficient |

**Conclusion:** C integration adds complexity for marginal gains. Focus on architectural optimizations first.

---

## Portfolio Positioning

### Standout Features

| Feature | Why it matters |
|---------|----------------|
| **Real-time DCC → browser streaming** | Solves a real industry problem (remote dailies, collaboration) |
| **Full-stack breadth** | Python/Blender API, Node.js/WebSocket, JavaScript/Three.js |
| **Binary protocol design** | Shows understanding of serialization, memory layout, performance |
| **Cross-domain integration** | 3D graphics + networking + real-time systems |
| **DCC expertise** | Blender API, mesh data structures — specialized skill |

### Employer Perspective

**Strong signals:**
- End-to-end ownership — built the whole stack
- Practical problem solving — remote review is a real pain point in studios
- Technical depth — binary formats, WebSocket streaming, 3D pipelines
- Self-direction — identified a problem and built a solution

**Likely interview questions:**
- "Why not use existing tools?" (glTF Viewer, Sketchfab, Logic)
- "How does it scale?" (Multiple users, large meshes)
- "What would you change for production?" (Security, persistence)
- "Walk me through the architecture"

### Portfolio Amplifiers

| Addition | Status |
|----------|--------|
| Demo video/GIF | Todo |
| Architecture diagram | Todo |
| Performance benchmarks | Todo |
| Comparison to existing tools | Todo |
| Tech choices rationale | Todo |

### Role Targeting

| Role | Emphasize |
|------|-----------|
| Pipeline TD / Tools Developer | DCC integration, artist workflow, studio tools |
| Graphics Programmer | Three.js, binary formats, performance optimization |
| Full-stack Engineer | End-to-end system, WebSocket, real-time data |
| Technical Artist | Bridge between art and engineering, practical tool |

---

## Considerations

### Performance & Scale

| Topic | Question | Status |
|-------|----------|--------|
| Large meshes | How to handle 1M+ poly models? LOD? Decimation? | Unaddressed |
| Multiple objects | Current code streams one mesh — how to handle scenes with 100+ objects? | Unaddressed |
| Bandwidth | 60fps × vertex data = significant throughput. Compression? | Unaddressed |
| Browser memory | Three.js buffers accumulate. Memory management strategy? | Unaddressed |

### Security

| Topic | Question | Status |
|-------|----------|--------|
| Access control | Public links vs. private sessions? | Unaddressed |
| Asset protection | Is proprietary work being streamed? Need encryption? | Unaddressed |
| Transport security | WebSocket over TLS (wss)? | Unaddressed |

### User Experience

| Topic | Question | Status |
|-------|----------|--------|
| Connection states | Loading indicator, reconnection UI, offline mode? | Unaddressed |
| Camera controls | Orbital controls (OrbitControls) — touch support for iPad? | ✓ Implemented (touch support untested) |
| Responsive layout | Phone vs. tablet vs. desktop viewing? | Unaddressed |
| Feedback | How does user know streaming is working? FPS counter? | Unaddressed |

### Technical Edge Cases

| Topic | Question | Status |
|-------|----------|--------|
| Deforming geometry | Animated characters with changing topology? | Unaddressed |
| Instancing | Hundreds of identical objects — stream once or each? | Unaddressed |
| Texture streaming | Currently geometry only. When do textures come in? | Phase 4 |
| Units | Blender meters vs. Maya centimeters — who handles conversion? | Unaddressed |

### Infrastructure

| Topic | Question | Status |
|-------|----------|--------|
| Concurrent sessions | One relay handles N producers + M consumers? Scalability limits? | Unaddressed |
| Cloud costs | Storage, bandwidth, compute for relay — pricing model? | Unaddressed |
| Session persistence | What happens if relay restarts mid-session? | Unaddressed |

---

## Open Questions

- **Authentication:** How to handle access control for shared sessions?
- **Mobile:** Touch controls, performance optimization for mobile devices
- **Recording:** Record streaming sessions for playback later?
- **Comparison:** Side-by-side comparison of different asset versions?
- **Incremental updates:** Send full mesh each frame, or only changed vertices?