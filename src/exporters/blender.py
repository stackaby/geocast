from __future__ import annotations
from typing import Sequence, cast, Generator

import bpy
import struct
from struct import Struct
from array import array
import site
import os
import sys
from functools import partial
import bmesh
import ctypes
import numpy

ID_t = bpy.types.ID
Object_t = bpy.types.Object
Mesh_t = bpy.types.Mesh


class GeometryBufferHeader(ctypes.LittleEndianStructure):
    _fields_ = [
        ("name_len", ctypes.c_uint32), 
        ("vert_pos_len", ctypes.c_uint32),
        ("norm_len", ctypes.c_uint32),
        ("uv_len", ctypes.c_uint32),
    ]


MESH_OBJECTS: list[Mesh_t] = []

def set_active_objects(*objs: ID_t) -> None:
    """If no objects are set, fallback to selection."""
    global MESH_OBJECTS

    MESH_OBJECTS.clear()

    MESH_OBJECTS.extend(cast(Mesh_t, obj.data) for obj in (objs or bpy.context.selected_objects) if obj not in MESH_OBJECTS and isinstance(obj, Object_t) and obj.type == "MESH")


def clear_invalid_objects():
    """If an object is invalid, remove from the list."""



def is_valid(obj: ID_t | None, *, obj_type: str = "") -> bool:
    if obj is None:
        return False
    
    if not isinstance(obj, ID_t):
        return False

    try:
        if obj.as_pointer() == 0:
            return False
    except ReferenceError:
        return False

    if bpy.data.objects.find(obj.name) == -1:
        return False

    if obj_type and obj.id_type != obj_type:
        return False

    return True


def get_active_objects() -> Generator[Mesh_t, None, None]:
    for idx in range(len(MESH_OBJECTS) - 1, -1, -1):
        obj = MESH_OBJECTS[idx]
        if is_valid(obj, obj_type="MESH"):
            yield obj
        else:
            # Remove from the list
            MESH_OBJECTS.pop(idx)


def get_mesh_stats(mesh_obj: Mesh_t):
    if bpy.context.mode == "EDIT_MESH":
        bm = bmesh.from_edit_mesh(mesh_obj)
        return len(bm.calc_loop_triangles()), bm.loops.layers.uv.verify()
    else:
        return len(mesh_obj.loop_triangles), mesh_obj.uv_layers.active is not None


def serialize_edit_mesh():
    set_active_objects()

    for mesh in get_active_objects():

        bm = bmesh.from_edit_mesh(mesh)
        bm.faces.ensure_lookup_table()
        bm.verts.ensure_lookup_table()
        bm.edges.ensure_lookup_table()

        num_tris, has_uv = get_mesh_stats(mesh)
        if num_tris == 0 or not has_uv:
            return b''
        tris = bm.calc_loop_triangles()

        uv_layer = bm.loops.layers.uv.verify()
         
        vertices_arr = (ctypes.c_float * (num_tris * 9))()
        normals_arr = (ctypes.c_float * (num_tris * 9))()
        uvs_arr = (ctypes.c_float * (num_tris * 6))()

        vn_idx = 0
        uv_idx = 0
        for tri in tris:
            for loop in tri:
                # Build arrays
                vertices_arr[vn_idx], vertices_arr[vn_idx + 1], vertices_arr[vn_idx + 2] = loop.vert.co
                normals_arr[vn_idx], normals_arr[vn_idx + 1], normals_arr[vn_idx + 2] = loop.vert.normal
                uvs_arr[uv_idx], uvs_arr[uv_idx + 1] = loop[uv_layer].uv

                vn_idx += 3
                uv_idx += 2

        header = GeometryBufferHeader()
        name_bytes = mesh.name.encode("utf-8").ljust(32, b'\00')

        header.name_len = 32
        header.vert_pos_len = len(vertices_arr)
        header.norm_len = len(normals_arr)
        header.uv_len = len(uvs_arr)
        
        payload_parts = [
            bytes(header),
            name_bytes,
            bytes(vertices_arr),
            bytes(normals_arr),
            bytes(uvs_arr)
        ]

        return bytearray(b''.join(payload_parts))
    return bytearray()


def serialize_object():
    set_active_objects()

    for mesh in get_active_objects():
        depsgraph = bpy.context.evaluated_depsgraph_get()
        mesh_eval = mesh.evaluated_get(depsgraph)

        mesh_eval.calc_loop_triangles()

        tris = mesh_eval.loop_triangles
        num_tris = len(tris)
        
        if not (uv_layer := mesh_eval.uv_layers.active) or num_tris == 0:
            return b''

        # Get the vertex order so that three.js knows how to draw the mesh
        # Should have a length of all the triangles multiplied by 3
        vertex_order_arr = numpy.zeros(num_tris * 3,  dtype=numpy.uint32)
        tris.foreach_get("vertices", vertex_order_arr)

        # Create an array of all of the individual vertices on the mesh
        # This will be expanded using the index order above
        vertex_arr = numpy.zeros(len(mesh_eval.vertices) * 3, dtype=numpy.float32)
        mesh_eval.vertices.foreach_get("co", vertex_arr)
        vertex_arr = vertex_arr.reshape((len(mesh_eval.vertices), 3))

        # Now perform the numpy reordering
        final_vertices = vertex_arr[vertex_order_arr]

        # TODO: Multiply the verts by a transformation matrix
        
        # Get the normals
        normals_arr = numpy.zeros(num_tris * 9, dtype=numpy.float32)
        tris.foreach_get("split_normals", normals_arr)
        normals_arr = normals_arr.reshape(num_tris * 3, 3)

        # Get the uvs
        uvs_arr = numpy.zeros(num_tris * 6, dtype=numpy.float32)
        uv_layer.data.foreach_get("uv", uvs_arr)
        uvs_arr = uvs_arr.reshape(num_tris * 3, 2)

        header = GeometryBufferHeader()
        name_bytes = mesh_eval.name.encode("utf-8").ljust(32, b'\00')

        header.name_len = 32
        header.vert_pos_len = len(final_vertices.flatten())
        header.norm_len = len(normals_arr.flatten())
        header.uv_len = len(uvs_arr.flatten())

        payload_parts = [
            bytes(header),
            name_bytes,
            bytes(final_vertices.flatten()),
            bytes(normals_arr.flatten()),
            bytes(uvs_arr.flatten())
        ]

        return bytearray(b''.join(payload_parts))
    return bytearray()


if __name__ == "__main__":
    
    # Set up the site packages of the virtual environment
    if virtual_env := os.environ.get("VIRTUAL_ENV"):
        site.addsitedir(os.path.join(virtual_env, "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages"))


    # Send the blob to the server
    from websockets.asyncio.client import connect
    import asyncio
   
    async def geometry_update(blob: bytearray):
        async with connect("ws://localhost:8080", additional_headers={"type":"auth","role":"producer"}) as websocket:
            await websocket.send(blob)

            #message_return = await websocket.recv()

            #print(message_return)  # Convert to log

    # Run a function every so often
    def persistent_updater():
        if bpy.context.mode == "EDIT_MESH":
            blob = serialize_edit_mesh()
        else:
            blob = serialize_object()
        if blob:
            asyncio.run(partial(geometry_update, blob)())
        return 1.0/60

    bpy.app.timers.register(persistent_updater, persistent = True)

