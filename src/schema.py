from __future__ import annotations

from dataclasses import dataclass, field

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
    
    # TODO: Replace this
    def gen_color_red(self):
        length = len(self.vertices)
        
        self.color = [0] * length
        
        for i in range(0, length - 1, 3):
            self.color[i] = 1
 
