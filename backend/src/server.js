import { createServer } from 'http';
import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import crypto from 'crypto'

const __fileName = fileURLToPath(import.meta.url);
const __dirName = path.dirname(__fileName);


const PORT = 3000;
const ROOM_CODE_LEN = 6
const PRODUCER_TYPE = "PRODUCER";
const CONSUMER_TYPE = "CONSUMER";
const PRODUCER_MAP_KEY = "producer";
const CONSUMERS_MAP_KEY = "consumers";

// TODO: ROOMS will be more than just a number. I might want to capture some metadata such as timestamp when creating
// TODO It will also be a good idea to create a timer periodically for each room so that it cleans up the room after a user doesn't use the room for a given time period (try: 5 minutes at first - make this configurable)
let ROOMS = new Set();

const app = express();
const server = createServer(app)
const wss = new WebSocketServer({ server: server });



// Generate a random room number
function generateRoomCode() {
   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
   const bytes = crypto.randomBytes(ROOM_CODE_LEN);
   let code = [];
   for (let byte of bytes) {
      code.push(chars[byte % chars.length]);
   }
   return code.join("");
}



app.get('/', (req, res) => {
   res.send("Hello, World!");
   //res.sendFile(path.join(__dirName, "index.html"));
});

app.post('/api/rooms', (req, res) => {

   let code;
   do {
      code = generateRoomCode();
   } while (ROOMS.has(code));

   ROOMS.add(code);

   res.json({ "code": code });
});

app.get('/api/room', (req, res) => {
   const roomCode = req.query?.code;
   if (roomCode !== undefined || roomCode !== "") {
      if (ROOMS.has(roomCode))
         res.status(200).json({ exists: true });
   }

   res.status(404).json({ exists: false });
});


let clients = new Map();

wss.on('connection', function connection(ws, request) {

   const clientType = getClientType(request);

   switch (clientType) {
      case PRODUCER_TYPE:
         if (clients.get(PRODUCER_MAP_KEY) !== undefined) {
            ws.send("Error: Producer already registered");
            ws.close();
         }

         clients.set(PRODUCER_MAP_KEY, ws);
         break;

      case CONSUMER_TYPE:
         // There can be many consumers
         const consumers = clients.get(CONSUMERS_MAP_KEY);
         if (!consumers) {
            clients.set(CONSUMERS_MAP_KEY, [ws]);
         }
         else {
            consumers.push(ws);
         }
         break;

      default:
         ws.send("Unknown client role specified.");
         ws.close();
   }

   ws.on('error', console.error);

   ws.on('message', function message(data) {
      const consumers = clients.get(CONSUMERS_MAP_KEY);

      wss.clients.forEach(function each(client) {
         if (client !== ws && consumers.includes(client) && client.readyState === WebSocket.OPEN) {
            client.send(data.buffer);
         }
      });
   });

   ws.on('close', function close() {

      switch (clientType) {
         case PRODUCER_TYPE:
            clients.set(PRODUCER_MAP_KEY, undefined);
            break;

         case CONSUMER_TYPE:
            let consumers = clients.get(CONSUMERS_MAP_KEY);
            const index = consumers.indexOf(ws);
            consumers.splice(index, 1);
            break;
      }
   });
});


function getClientType(request) {

   const role = request.headers?.role || url.parse(request.url, true).query?.role;
   if (role === "producer") return PRODUCER_TYPE;
   if (role === "consumer") return CONSUMER_TYPE;
   return undefined;
}

server.listen(PORT, () => {
   console.log(`Example app listening on port ${PORT}`);
})
