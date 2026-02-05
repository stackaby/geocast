from __future__ import annotations

import bpy
from dataclasses import dataclass, field, asdict
import json
import struct
from struct import Struct
from array import array
import site
import os
import sys
from functools import partial
import bmesh

# Take each object and write them into their own json object
@dataclass
class Objects:
    objs: list[Mesh] = field(default_factory = list)


@dataclass
class Mesh:
    name: str
    vertices: list[float] = field(default_factory = list)
    normals: list[float] = field(default_factory = list)
    color: list[float] = field(default_factory = list)
    uvs: list[float] = field(default_factory = list)
    
    def gen_color_red(self):
        length = len(self.vertices)
        
        self.color = [0] * length
        
        for i in range(0, length - 1, 3):
            self.color[i] = 1
    


def export_selection(objs: list) -> bytearray:
    # Based on user selection, only grab the mesh objects
    # This can later be extended to the whole scene as a feature

    header_struct = Struct("<iiii")  # Name | Vertices (positions) | normals | uvs
    
    header = b""
    data = bytearray()
    objects = Objects()
    for obj in objs or bpy.context.selected_objects:
        if obj.type == "MESH":

            if bpy.context.mode == "EDIT_MESH":
                bm = bmesh.from_edit_mesh(obj.data)
                bm.faces.ensure_lookup_table()
                bm.verts.ensure_lookup_table()
                #bm.loops.ensure_lookup_table()
            else:
                bm = bmesh.new()
                bm.from_object(obj, bpy.context.evaluated_depsgraph_get())
                bm.faces.ensure_lookup_table()
                #bm.loops.ensure_lookup_table()


            mesh = Mesh(obj.name)

            data.extend(struct.pack(f"<{len(obj.name)}s", obj.name.encode("utf-8")))
            offset = len(obj.name)


            vertices_arr = array("f")
            normals_arr = array("f")
            uvs_arr = array("f")
            
            len_vertices = 0
            len_normals = 0
            len_uvs = 0

            uv_layer = bm.loops.layers.uv.verify()


            vertices = obj.data.vertices
            #for tri in obj.data.loop_triangles:
            for tri in bm.calc_loop_triangles():
                
                for i in range(3):
                    #loop_idx = tri.loops[i]
                    #loop = obj.data.loops[loop_idx]
                    loop = tri[i]
                    

                    len_vertices += 3
                    len_normals += 3
                    len_uvs += 2

                    vertices_arr.extend(loop.vert.co)
                    normals_arr.extend(loop.calc_normal())
                    uvs_arr.extend(loop[uv_layer].uv)


                    #mesh.vertices.extend(vertices[loop.vertex_index].co)
                    #mesh.normals.extend(loop.normal)
                    #mesh.uvs.extend(obj.data.uv_layers.active.uv[loop_idx].vector)
            
            mesh.gen_color_red()
            objects.objs.append(mesh)

            data.extend(vertices_arr.tobytes())
            data.extend(normals_arr.tobytes())
            data.extend(uvs_arr.tobytes())

            header = header_struct.pack(len(obj.name), len_vertices, len_normals, len_uvs)
            
            bm.free()

    #with open(r"/Users/nick/workspace/github.com/stackaby/geocast/data.json", "w", encoding="utf-8") as fp:
    #    json.dump(asdict(objects), fp, separators=(",", ":"))
    return bytearray(header) + data


if __name__ == "__main__":
    
    # Set up the site packages of the virtual environment
    if virtual_env := os.environ.get("VIRTUAL_ENV"):
        site.addsitedir(os.path.join(virtual_env, "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages"))


    # Select Suzanne
    suzanne = bpy.data.objects.get("Suzanne")

    # Send the blob to the server
    from websockets.asyncio.client import connect
    import asyncio
   
    async def geometry_update(blob: bytearray):
        async with connect("ws://localhost:8080") as websocket:
            await websocket.send(blob)

            message_return = await websocket.recv()

            print(message_return)

    #asyncio.run(geometry_update(blob))



    # Run a function every so often
    def persisten_updater():
        blob = export_selection([suzanne])
        asyncio.run(partial(geometry_update, blob)())
        return 1.0/60
    bpy.app.timers.register(persisten_updater, persistent = True)

