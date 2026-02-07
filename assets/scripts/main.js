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
let count = 0;
websocket.addEventListener("message", (e) => {
   console.log(e.data instanceof ArrayBuffer);
   if (e.data instanceof ArrayBuffer === false) {
      console.log(`Skip ${e.data}`);
      return;
   }

   const fullBuffer = e.data;
   //console.log(`Received ${fullBuffer}`);

   //console.log(typeof fullBuffer);
   const view = new DataView(fullBuffer);

   const header = {
      name_len: view.getInt32(0, true),
      positions_len: view.getInt32(4, true),
      normals_len: view.getInt32(8, true),
      uvs_len: view.getInt32(12, true)
   }

   //console.log(header);

   let headerLen = 16;
   let nameStart = headerLen;
   let nameEnd = nameStart + header.name_len;
   //console.log(nameEnd);
   // Print the name
   const nameBytes = fullBuffer.slice(nameStart, nameEnd);

   const decoder = new TextDecoder()
   //console.log("bytes %s", decoder.decode(nameBytes));
   const name = decoder.decode(nameBytes);
   console.log(name);
   //console.log(name);
   const positionsStart = nameEnd;
   const positionsEnd = positionsStart + header.positions_len * 4;
   //console.log(fullBuffer.slice(positionsStart, positionsEnd));
   //console.log(header.positions_len * 4);
   console.log(positionsStart);
   const positions_array = new Float32Array(fullBuffer, positionsStart, header.positions_len);
   //console.log(positions_array)
   //console.log("Length:  %d", fullBuffer.byteLength);

   const normalsStart = positionsEnd;
   const normalsEnd = normalsStart + header.normals_len * 4;
   //console.log(header.normals_len * 4);
   const normals_array = new Float32Array(fullBuffer, normalsStart, header.normals_len);

   const uvsStart = normalsEnd;
   //const uvsEnd = uvsStart + header.uvs_len * 4;
   //console.log(header.uvs_len * 4);
   const uvs_array = new Float32Array(fullBuffer, uvsStart, header.uvs_len);

   //console.log(positions_array, positions_array.length);
   //console.log(normals_array, normals_array.length);
   //console.log(uvs_array, uvs_array.length);

   console.log(positions_array);
   geoBuffers = {
      positions: positions_array,
      normals: normals_array,
      uvs: uvs_array
   };

   console.log(count);
   count++;
});



const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Rotating cube
//const geometry = new THREE.BoxGeometry(1, 1, 1, 1);
//const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
//const cube = new THREE.Mesh(geometry, material);

//const data = JSON.parse("./data.json");

//let json = await fetch("./data.json");
//let t = await json.json();
//console.log(t);



const buffer_geo = new THREE.BufferGeometry()
const buffer_mat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const buffer_wire_mat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });

const positionNumComponents = 3;
const normalNumComponents = 3;
const uvNumComponents = 2;

//let positions = t.objs[0].vertices;
//let normals = t.objs[0].normals;
//let uvs = t.objs[0].uvs;

if (geoBuffers) {
   console.log("updating");
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
//scene.add(cube);

camera.position.z = 5;

//cube.position.y = 2;
function animate() {
   renderer.render(scene, camera);
   if (geoBuffers) {
      console.log("updating");
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
   //cube.rotation.x += 0.01;
   //cube.rotation.y += 0.01;

   geo.rotation.x += 0.01;
   geo.rotation.y += 0.01;
   wire_geo.rotation.x += 0.01;
   wire_geo.rotation.y += 0.01;
}

renderer.setAnimationLoop(animate);
