import * as THREE from 'three';


const wsURI = "ws://localhost:8080?type=auth&role=consumer";
const websocket = new WebSocket(wsURI);
websocket.binaryType = "arraybuffer";

websocket.addEventListener("open", () => {
   const authMessage = {
      type: "auth",
      role: "consumer"
   };

   websocket.send(JSON.stringify(authMessage));
});


let geoBuffers = undefined;
websocket.addEventListener("message", (e) => {
   if (e.data instanceof ArrayBuffer === false) {
      console.log(`Skip ${e.data}`);
      return;
   }

   const fullBuffer = e.data;
   const view = new DataView(fullBuffer);

   const header = {
      name_len: view.getInt32(0, true),
      positions_len: view.getInt32(4, true),
      normals_len: view.getInt32(8, true),
      uvs_len: view.getInt32(12, true)
   }

   let headerLen = 16;
   let nameStart = headerLen;
   let nameEnd = nameStart + header.name_len;

   // Print the name
   const nameBytes = fullBuffer.slice(nameStart, nameEnd);

   const decoder = new TextDecoder()
   const name = decoder.decode(nameBytes);

   const positionsStart = nameEnd;
   const positionsEnd = positionsStart + header.positions_len * 4;
   const positions_array = new Float32Array(fullBuffer, positionsStart, header.positions_len);

   const normalsStart = positionsEnd;
   const normalsEnd = normalsStart + header.normals_len * 4;
   const normals_array = new Float32Array(fullBuffer, normalsStart, header.normals_len);

   const uvsStart = normalsEnd;
   const uvs_array = new Float32Array(fullBuffer, uvsStart, header.uvs_len);


   geoBuffers = {
      positions: positions_array,
      normals: normals_array,
      uvs: uvs_array
   };
});



const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const buffer_geo = new THREE.BufferGeometry()
const buffer_mat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const buffer_wire_mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

const positionNumComponents = 3;
const normalNumComponents = 3;
const uvNumComponents = 2;

if (geoBuffers) {
   buffer_geo.setAttribute(
      "position",
      new THREE.BufferAttribute(geoBuffers.positions, positionNumComponents)
   );

   buffer_geo.setAttribute(
      "normal",
      new THREE.BufferAttribute(geoBuffers.normals, normalNumComponents)
   );
   buffer_geo.setAttribute(
      "uv",
      new THREE.BufferAttribute(geoBuffers.uvs, uvNumComponents)
   );
}

const geo = new THREE.Mesh(buffer_geo, buffer_mat);
const wire_geo = new THREE.Mesh(buffer_geo, buffer_wire_mat)

scene.add(geo);
scene.add(wire_geo)

camera.position.z = 5;
function animate() {
   renderer.render(scene, camera);

   if (geoBuffers) {
      buffer_geo.setAttribute(
         "position",
         new THREE.BufferAttribute(geoBuffers.positions, positionNumComponents)
      );

      buffer_geo.setAttribute(
         "normal",
         new THREE.BufferAttribute(geoBuffers.normals, normalNumComponents)
      );
      buffer_geo.setAttribute(
         "uv",
         new THREE.BufferAttribute(geoBuffers.uvs, uvNumComponents)
      );
   }

   geo.rotation.x += 0.01;
   geo.rotation.y += 0.01;
   wire_geo.rotation.x += 0.01;
   wire_geo.rotation.y += 0.01;
}

renderer.setAnimationLoop(animate);
