from __future__ import annotations

import asyncio
import ctypes
import logging
import sys
from collections.abc import Callable, Generator
from typing import cast

import bmesh
import bpy
import numpy
import websockets
from websockets import State
from websockets.asyncio.client import ClientConnection, connect

logging.basicConfig(stream=sys.stdout, level=logging.INFO)

HOST = "ws://localhost:3000"

ID_t = bpy.types.ID
Object_t = bpy.types.Object
Mesh_t = bpy.types.Mesh

BLENDER_HANDEDNESS = ord("R")
BLENDER_UP_AXIS = ord("Z")


class GeometryBufferHeader(ctypes.LittleEndianStructure):
   _fields_ = [
      ("name_len", ctypes.c_uint32),
      ("metadata", ctypes.c_uint32),  # handedness | up_axis | - | -
      ("vert_pos_len", ctypes.c_uint32),
      ("norm_len", ctypes.c_uint32),
      ("uv_len", ctypes.c_uint32),
   ]


MESH_OBJECTS: list[Mesh_t] = []


def set_active_objects(*objs: ID_t) -> None:
   """If no objects are set, fallback to selection."""
   global MESH_OBJECTS

   MESH_OBJECTS.clear()

   MESH_OBJECTS.extend(
      cast(Mesh_t, obj.data)
      for obj in (objs or bpy.context.selected_objects)
      if obj not in MESH_OBJECTS and isinstance(obj, Object_t) and obj.type == "MESH"
   )


def is_valid(obj: ID_t | None, *, obj_type: str = "") -> bool:
   if obj is None:
      return False

   try:
      if obj.as_pointer() == 0:
         return False
   except ReferenceError:
      return False

   if bpy.data.objects.find(obj.name) == -1:
      return False

   return not (obj_type and obj.id_type != obj_type)


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
         return b""
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
            (
               vertices_arr[vn_idx],
               vertices_arr[vn_idx + 1],
               vertices_arr[vn_idx + 2],
            ) = loop.vert.co
            (
               normals_arr[vn_idx],
               normals_arr[vn_idx + 1],
               normals_arr[vn_idx + 2],
            ) = loop.vert.normal
            uvs_arr[uv_idx], uvs_arr[uv_idx + 1] = loop[uv_layer].uv

            vn_idx += 3
            uv_idx += 2

      header = GeometryBufferHeader()
      name_bytes = mesh.name.encode("utf-8").ljust(32, b"\00")

      header.name_len = 32
      header.metadata = (BLENDER_HANDEDNESS << 24) | (BLENDER_UP_AXIS << 16)
      header.vert_pos_len = len(vertices_arr)
      header.norm_len = len(normals_arr)
      header.uv_len = len(uvs_arr)

      payload_parts = [
         bytes(header),
         name_bytes,
         bytes(vertices_arr),
         bytes(normals_arr),
         bytes(uvs_arr),
      ]

      return b"".join(payload_parts)
   return b""


def serialize_object():
   set_active_objects()

   for mesh in get_active_objects():
      depsgraph = bpy.context.evaluated_depsgraph_get()
      mesh_eval = mesh.evaluated_get(depsgraph)

      mesh_eval.calc_loop_triangles()

      tris = mesh_eval.loop_triangles
      num_tris = len(tris)

      if not (uv_layer := mesh_eval.uv_layers.active) or num_tris == 0:
         return b""

      # Get the vertex order so that three.js knows how to draw the mesh
      # Should have a length of all the triangles multiplied by 3
      vertex_order_arr = numpy.zeros(num_tris * 3, dtype=numpy.uint32)
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
      name_bytes = mesh_eval.name.encode("utf-8").ljust(32, b"\00")

      header.name_len = 32
      header.metadata = (BLENDER_HANDEDNESS << 24) | (BLENDER_UP_AXIS << 16)
      header.vert_pos_len = len(final_vertices.flatten())
      header.norm_len = len(normals_arr.flatten())
      header.uv_len = len(uvs_arr.flatten())

      payload_parts = [
         bytes(header),
         name_bytes,
         bytes(final_vertices.flatten()),
         bytes(normals_arr.flatten()),
         bytes(uvs_arr.flatten()),
      ]

      return b"".join(payload_parts)
   return b""


async def client_connect(server_host: str = "", room_code: str = ""):
   return await connect(
      server_host or HOST, additional_headers={"type": "auth", "role": "producer", "roomCode": room_code}
   )


async def client_send(
   websocket: ClientConnection, blob: bytes, expect_response: bool = False
) -> tuple[int, bytes | None]:
   try:
      await websocket.send(blob)
   except websockets.ConnectionClosed:
      # Try to recover
      return 1, None

   if expect_response:
      try:
         return 0, cast(bytes, await websocket.recv())
      except websockets.ConnectionClosed:
         # Try to recover
         return 1, None
   return 0, None


async def client_close(websocket: ClientConnection):
   await websocket.close()


class ClientConnectionHandler:
   def __init__(self, handler: Callable[[ClientConnectionHandler], None]):
      self._handler = handler
      self._active = True
      self._client_connection: ClientConnection | None = None
      self._loop = None
      self._server_host: str = ""

   @property
   def loop(self):
      return self._loop

   @property
   def is_active(self) -> bool:
      return self._active

   @property
   def ws(self) -> ClientConnection | None:
      return self._client_connection

   def start(self, server_host: str = "", room_code: str = ""):
      if server_host != self._server_host:
         self.close()

      if not self._client_connection or self._client_connection.state == State.CLOSED:
         self._loop = asyncio.new_event_loop()
         self._client_connection = self._loop.run_until_complete(client_connect(server_host, room_code))

      self._active = True

   def stop(self):
      self._active = False

   def close(self):
      self.stop()

      if self._client_connection and self._loop:
         self._loop.run_until_complete(client_close(self._client_connection))
         self._loop.close()
         self._loop = None
         self._client_connection = None

   def __call__(self):
      if self._client_connection and self._client_connection.state == State.CLOSED:
         return 0.0

      if self._active and self._client_connection:
         return self._handler(self)
      return 1.0


def persistent_geometry_updater(handler: ClientConnectionHandler):
   if handler.is_active and handler.ws:
      blob = serialize_edit_mesh() if bpy.context.mode == "EDIT_MESH" else serialize_object()
      if blob:
         result = handler.loop.run_until_complete(client_send(handler.ws, blob))
         # If the result shows a closed connection, attempt to open it up again
         if result[0] == 1:  # There was an error
            try:
               handler.start()
            except (OSError, TimeoutError, RuntimeError):
               # Log messages here
               ...

   return 1.0 / 60


HANDLER = ClientConnectionHandler(persistent_geometry_updater)

# Add a string property to the Scene
bpy.types.Scene.server_host = bpy.props.StringProperty(
   name="Server Host", description="Enter server host path", default=HOST
)
bpy.types.Scene.room_code = bpy.props.StringProperty(name="Room Code", description="Enter room code")


class ConnectOperator(bpy.types.Operator):
   bl_idname = "geocast.connect"
   bl_label = "Connect"

   def execute(self, context):
      # For testing purposes, separate room code by forward slash

      # Get the value of the room code from the scene property
      server_host = context.scene.server_host
      room_code = context.scene.room_code
      HANDLER.start(server_host, room_code)
      return {"FINISHED"}


class DisconnectOperator(bpy.types.Operator):
   bl_idname = "geocast.disconnect"
   bl_label = "Disconnect"

   def execute(self, context):
      HANDLER.close()
      return {"FINISHED"}


class GeocastPanel(bpy.types.Panel):
   bl_idname = "GEOCAST_PT_connection_settings"
   bl_label = "Settings"
   bl_space_type = "PROPERTIES"
   bl_region_type = "WINDOW"
   bl_options = {"DEFAULT_CLOSED"}

   @classmethod
   def poll(cls, context):
      return context.object is not None

   def draw_header(self, context):
      layout = self.layout
      layout.label(text="Connection Settings")

   def draw(self, context):
      layout = self.layout

      box = layout.box()
      box.alignment = "LEFT"
      box.label(text="Server Settings:")
      box.prop(context.scene, "server_host")
      box.prop(context.scene, "room_code")
      box.operator("geocast.connect")
      box.operator("geocast.disconnect")


class GeocastMenu(bpy.types.Menu):
   bl_idname = "TOPBAR_MT_geocast"
   bl_label = "Geocast"
   bl_description = "Geocast menu. Handle websocket connection to server."

   def draw(self, context) -> None:
      layout = self.layout

      layout.label(text="Geocast Options:")

      box = layout.box()

      # Fake context with the box as layout
      class Container:
         pass

      container = Container()
      container.layout = box

      GeocastPanel.draw(container, context)


def draw_item(self, context):
   layout = self.layout
   layout.menu(GeocastMenu.bl_idname)


def register():
   bpy.utils.register_class(ConnectOperator)
   bpy.utils.register_class(DisconnectOperator)
   bpy.utils.register_class(GeocastPanel)
   bpy.utils.register_class(GeocastMenu)
   bpy.types.TOPBAR_MT_editor_menus.append(draw_item)


def unregister():
   bpy.utils.unregister_class(DisconnectOperator)
   bpy.utils.unregister_class(GeocastMenu)
   bpy.utils.unregister_class(GeocastPanel)
   bpy.utils.unregister_class(ConnectOperator)
   bpy.types.TOPBAR_MT_editor_menus.remove(draw_item)


def main():
   bpy.app.timers.register(HANDLER, persistent=True)
   register()


if __name__ == "__main__":
   main()
