import * as THREE from 'three';


const MAX_VERTICES = 100000;
const positionAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3);
const normalAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3);
const uvAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 2), 2);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const buffer_geo = new THREE.BufferGeometry()
buffer_geo.setAttribute("position", positionAttr);
buffer_geo.setAttribute("normal", normalAttr);
buffer_geo.setAttribute("uv", uvAttr);

const buffer_mat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const buffer_wire_mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

const positionNumComponents = 3;
const normalNumComponents = 3;
const uvNumComponents = 2;

const geo = new THREE.Mesh(buffer_geo, buffer_mat);
const wire_geo = new THREE.Mesh(buffer_geo, buffer_wire_mat)

// Build a gridline
const gridHelper = new THREE.GridHelper(10, 10, new THREE.Color(0x000000), new THREE.Color(0x000000));

scene.add(geo);
scene.add(wire_geo);
scene.add(gridHelper);


const wsURI = "ws://localhost:8080?type=auth&role=consumer";
const websocket = new WebSocket(wsURI);
websocket.binaryType = "arraybuffer";

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

   const BYTES_PER_FLOAT = 4;
   const positionsStart = nameEnd;
   const positionsEnd = positionsStart + header.positions_len * BYTES_PER_FLOAT;
   const positions_array = new Float32Array(fullBuffer, positionsStart, header.positions_len);

   const normalsStart = positionsEnd;
   const normalsEnd = normalsStart + header.normals_len * BYTES_PER_FLOAT;
   const normals_array = new Float32Array(fullBuffer, normalsStart, header.normals_len);

   const uvsStart = normalsEnd;
   const uvs_array = new Float32Array(fullBuffer, uvsStart, header.uvs_len);


   geoBuffers = {
      positions: positions_array,
      normals: normals_array,
      uvs: uvs_array
   };

   positionAttr.array.set(geoBuffers.positions);
   positionAttr.needsUpdate = true;
   positionAttr.updateRange = { offset: 0, count: geoBuffers.positions.length };

   normalAttr.array.set(geoBuffers.normals);
   normalAttr.needsUpdate = true;

   uvAttr.array.set(geoBuffers.uvs);
   uvAttr.needsUpdate = true;
});


camera.position.z = 5;
function animate() {
   renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
