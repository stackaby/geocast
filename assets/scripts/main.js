import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MAX_VERTICES = 100000;
const POS_NUM_COMPONENTS = 3;
const NORM_NUM_COMPONENTS = 3;
const UV_NUM_COMPONENTS = 2;

const BLACK = 0x000000;
const WHITE = 0xffffff;
const BLUE = 0x0000ff;
const GREEN = 0x00ff00;

const FOV = 75;
const NEAR = 0.1;
const FAR = 1000;

const BYTES_PER_FLOAT = 4;
const HEADER_LEN = 20;

const scene = new THREE.Scene();
scene.background = new THREE.Color(WHITE);

const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, NEAR, FAR);
camera.position.set(8, 5, 8);
camera.lookAt(0, 0, 0);  // Look at the center origin

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

const bufferGeo = new THREE.BufferGeometry()

const positionAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * POS_NUM_COMPONENTS), POS_NUM_COMPONENTS);
const normalAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * NORM_NUM_COMPONENTS), NORM_NUM_COMPONENTS);
const uvAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * UV_NUM_COMPONENTS), UV_NUM_COMPONENTS);

bufferGeo.setAttribute("position", positionAttr);
bufferGeo.setAttribute("normal", normalAttr);
bufferGeo.setAttribute("uv", uvAttr);

const bufferMat = new THREE.MeshBasicMaterial({ color: BLUE });
const bufferWireMat = new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true });

const geo = new THREE.Mesh(bufferGeo, bufferMat);
const wireGeo = new THREE.Mesh(bufferGeo, bufferWireMat)

// Build a gridline
const gridHelper = new THREE.GridHelper(10, 10, new THREE.Color(BLACK), new THREE.Color(BLACK));

scene.add(geo);
scene.add(wireGeo);
scene.add(gridHelper);


function parseGeoData(buffer) {
   const view = new DataView(buffer);

   const header = parseHeader(view);

   const handedness = String.fromCharCode(header.metadata >> 24 & 0xFF);
   const upAxis = String.fromCharCode(header.metadata >> 16 & 0xFF);

   // Get the name
   const nameStart = HEADER_LEN;
   const nameEnd = nameStart + header.nameLen;

   const nameBytes = buffer.slice(nameStart, nameEnd);

   const decoder = new TextDecoder()
   const name = decoder.decode(nameBytes);

   const positionsStart = nameEnd;
   const positionsEnd = positionsStart + header.positionsLen * BYTES_PER_FLOAT;
   const positions = new Float32Array(buffer, positionsStart, header.positionsLen);

   const normalsStart = positionsEnd;
   const normalsEnd = normalsStart + header.normalsLen * BYTES_PER_FLOAT;
   const normals = new Float32Array(buffer, normalsStart, header.normalsLen);

   const uvsStart = normalsEnd;
   const uvs = new Float32Array(buffer, uvsStart, header.uvsLen);

   let rotation = new THREE.Matrix4().identity();
   // three.js is Y up so do nothing
   // Just test the up axis for now
   if (upAxis === 'Z') {
      // Rotate -90 in X
      rotation = rotation.makeRotationX(-Math.PI / 2);
   }


   return { positions, normals, uvs, rotation };
}

function parseHeader(view) {
   return {
      nameLen: view.getInt32(0, true),
      metadata: view.getInt32(4, true),
      positionsLen: view.getInt32(8, true),
      normalsLen: view.getInt32(12, true),
      uvsLen: view.getInt32(16, true),
   }

}

function updateGeometry({ positions, normals, uvs, rotation }) {
   positionAttr.array.set(positions);
   positionAttr.needsUpdate = true;
   positionAttr.updateRange = { offset: 0, count: positions.length };

   normalAttr.array.set(normals);
   normalAttr.needsUpdate = true;

   uvAttr.array.set(uvs);
   uvAttr.needsUpdate = true;

   // Apply the rotation to the buffer geo as a whole
   geo.setRotationFromMatrix(rotation);
   wireGeo.setRotationFromMatrix(rotation);
}


// Set up the consumer client
const hostname = window.__BACKEND_URL__?.trim() || window.location.hostname;
const WS_URI = `wss://${hostname}?type=auth&role=consumer`;
const websocket = new WebSocket(WS_URI);
websocket.binaryType = "arraybuffer";  // Expecting an array buffer from the server

websocket.addEventListener("message", (e) => {
   // Skip the data if we receive anything other than an array buffer
   if (e.data instanceof ArrayBuffer === false) {
      console.debug(`Skip ${e.data}`);
      return;
   }

   updateGeometry(parseGeoData(e.data));
});


function animate() {
   controls.update();
   renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
