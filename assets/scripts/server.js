import { WebSocketServer } from 'ws';
import url from 'url';

const wss = new WebSocketServer({ port: 8080 });
let count = 0;

let clients = new Map();

wss.on('connection', function connection(ws, request) {

   let is_producer = request.headers?.type === "auth" && request.headers?.role === "producer";
   let is_consumer = request.headers?.type === "auth" && request.headers?.role === "consumer";

   if (!is_consumer) {
      // Check query parameters
      const query = url.parse(request.url, true).query;
      is_consumer = query.role === "consumer";
   }

   if (is_producer) {

      if (clients.get("producer")) {
         ws.send("Error: Producer already registered");
         ws.close();
      }

      clients.set("producer", ws);
   }

   if (is_consumer) {
      // There can be many consumers
      const consumers = clients.get("consumers");
      if (!consumers) {
         clients.set("consumers", [ws]);
      }
      else {
         consumers.push(ws);
      }
   }

   ws.on('error', console.error);

   ws.on('message', function message(data) {
      // Size of header is 16 bytes
      /*
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

      */
      //console.log('Count: %d', count);
      //count++;

      let consumers;
      if (consumers = (clients.get("consumers"))) {
         //console.log(consumers);
         for (let consumer of consumers) {
            // Send data to all the consumers
            console.log("length: %d", data.buffer.byteLength);
            consumer.send(data.buffer);
         }
      }
   });

   ws.on('close', function close() {
      if (is_producer) {
         clients.set("producer", undefined);
      }

   });

   ws.send('something');

});
