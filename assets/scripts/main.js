import * as THREE from 'three';


const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Rotating cube
const geometry = new THREE.BoxGeometry(1, 1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

//const data = JSON.parse("./data.json");

let json = await fetch("./data.json");
let t = await json.json();
console.log(t);



const buffer_geo = new THREE.BufferGeometry()
const buffer_mat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const buffer_wire_mat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });

const positionNumComponents = 3;
const normalNumComponents = 3;
const uvNumComponents = 2;

let positions = t.objs[0].vertices;
let normals = t.objs[0].normals;
let uvs = t.objs[0].uvs;
buffer_geo.setAttribute(
   "position",
   new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents)
);

buffer_geo.setAttribute(
   "normal",
   new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
);
buffer_geo.setAttribute(
   "uv",
   new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents)
);


const geo = new THREE.Mesh(buffer_geo, buffer_mat);
const wire_geo = new THREE.Mesh(buffer_geo, buffer_wire_mat)

scene.add(geo);
scene.add(wire_geo)
scene.add(cube);

camera.position.z = 5;

cube.position.y = 2;
function animate() {
   renderer.render(scene, camera);

   cube.rotation.x += 0.01;
   cube.rotation.y += 0.01;

   geo.rotation.x += 0.01;
   geo.rotation.y += 0.01;
   wire_geo.rotation.x += 0.01;
   wire_geo.rotation.y += 0.01;
}

renderer.setAnimationLoop(animate);
