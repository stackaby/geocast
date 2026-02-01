from __future__ import annotations

import bpy
from dataclasses import dataclass, field, asdict
import json

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
    


def export_selection():
    # Based on user selection, only grab the mesh objects
    # This can later be extended to the whole scene as a feature
    objects = Objects()
    for obj in bpy.context.selected_objects:
        if obj.type == "MESH":
            mesh = Mesh(obj.name)
            
            vertices = obj.data.vertices
            for tri in obj.data.loop_triangles:
                
                for i in range(3):
                    loop_idx = tri.loops[i]
                    loop = obj.data.loops[loop_idx]
                    
                    mesh.vertices.extend(vertices[loop.vertex_index].co)
                    mesh.normals.extend(loop.normal)
                    mesh.uvs.extend(obj.data.uv_layers.active.data[loop_idx].uv)
            
            mesh.gen_color_red()
            objects.objs.append(mesh)
    
    with open(r"/Users/nick/workspace/github.com/stackaby/geocast/data.json", "w", encoding="utf-8") as fp:
        json.dump(asdict(objects), fp, separators=(",", ":"))


if __name__ == "__main__":
    # Select Suzanne
    bpy.data.objects.get("Suzanne").select_set(True)
    export_selection()
