# Geocast

Real-time geometry streaming from DCC applications to the browser.

## What it does

Stream live mesh data from Blender (and future DCCs) to any web browser via WebSockets. Enables remote dailies, asset review, and collaboration without requiring software installation on the viewing device.

```
Blender → WebSocket → Browser (Three.js)
  60fps     relay       real-time render
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Producer  │────▶│    Relay    │────▶│   Consumer  │
│  (Blender)  │     │  (Node.js)  │     │  (Browser)  │
│   Python    │     │  WebSocket  │     │   Three.js  │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Producer**: Blender addon extracts mesh data, serializes to binary, streams via WebSocket
- **Relay**: Node.js WebSocket server broadcasts from producer to multiple consumers
- **Consumer**: Browser app receives binary payload, renders with Three.js

## Features

- Real-time streaming at 60fps
- Custom binary protocol (minimal overhead)
- Edit mode and object mode support
- Live mesh updates as you model

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features:
- DCC-agnostic serialization (Blender, Maya, Houdini)
- Snapshot export (glb)
- Collaboration features
- Materials and animation

## Status

Early prototype. See [STABILIZATION.md](./STABILIZATION.md) for current work.

## Quick Start

```bash
# Terminal 1: Start the relay server
cd assets/scripts
node server.js

# Terminal 2: Start the browser client
npm run dev

# Terminal 3: In Blender, run the addon
# (see src/exporters/blender.py)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| DCC Integration | Python, Blender API (bpy, bmesh) |
| Serialization | NumPy, ctypes binary structs |
| Transport | WebSocket (ws, websockets) |
| Frontend | Three.js, Vite |

## Why this exists

Remote asset review typically requires:
- Sending large files
- Recipients having the same DCC software
- Screen sharing with poor quality

Geocast enables lightweight, real-time viewing in any browser — no software required on the viewing device.

## Portfolio Context

This project demonstrates:
- **Full-stack development**: Python, Node.js, JavaScript
- **3D graphics**: Mesh data structures, Three.js, real-time rendering
- **Systems design**: Binary protocols, WebSocket streaming, performance optimization
- **DCC integration**: Blender API, artist tool development

---

## Project Planning

- [ROADMAP.md](./ROADMAP.md) — Feature roadmap and future vision
- [STABILIZATION.md](./STABILIZATION.md) — Current stabilization work
- [AGENTS.md](./AGENTS.md) — Development notes