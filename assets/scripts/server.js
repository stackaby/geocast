import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
   ws.on('error', console.error);

   ws.on('message', function message(data) {
      // Size of header is 16 bytes
      const header = {
         name_len: data.readInt32LE(0),
         positions_len: data.readInt32LE(4),
         normals_len: data.readInt32LE(8),
         uvs_len: data.readInt32LE(12)
      }

      let headerLen = 16;
      let nameStart = headerLen;
      let nameEnd = nameStart + header.name_len;
      // Print the name
      const nameBytes = data.subarray(nameStart, nameEnd);

      const positionsStart = nameEnd;
      const positionsEnd = positionsStart + header.positions_len * 4;
      console.log(header.positions_len * 4);
      const positions_array = new Float32Array(data.subarray(positionsStart, positionsEnd), 4, header.positions_len);

      const normalsStart = positionsEnd;
      const normalsEnd = normalsStart + header.normals_len * 4;
      console.log(header.normals_len * 4);
      const normals_array = new Float32Array(data.subarray(normalsStart, normalsEnd), 4, header.normals_len);

      const uvsStart = normalsEnd;
      const uvsEnd = uvsStart + header.uvs_len * 4;
      console.log(header.uvs_len * 4);
      const uvs_array = new Float32Array(data.subarray(uvsStart, uvsEnd), 4, header.uvs_len);

      console.log(positions_array, positions_array.length);
      console.log(normals_array, normals_array.length);
      console.log(uvs_array, uvs_array.length);
      //console.log('received: %s', data);
   });

   ws.send('something');
});
