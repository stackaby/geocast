import { createServer, IncomingMessage } from 'http';
import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import { dirname, join } from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import crypto from 'crypto'

const __fileName = fileURLToPath(import.meta.url);
const __dirName = dirname(__fileName);


const PORT = 3000;
const ROOM_CODE_LEN = 6
const PRODUCER_TYPE = "PRODUCER";
const CONSUMER_TYPE = "CONSUMER";
const PRODUCER_MAP_KEY = "producer";
const CONSUMERS_MAP_KEY = "consumers";
const MAX_ROOMS_ON_SERVER = 1000;
const MAX_OCCUPANCY = 5;

type Room = {
   name?: string, // May not be required, could be a feature I introduce later
   code: string,
   readonly created: number,  // Produced by Date.now()
   lastConnection: number,  // Produced by Date.now()
   producer: WebSocket | null,
   consumers: WebSocket[],
   maxOccupancy: number,
   touch: () => void,
   readonly locked: boolean, // Prevents multiple 'producer' connections to the server (i.e. Blender connection)
   readonly currentOccupancy: number
};

function createRoom(roomCode: string): Room {
   return {
      code: roomCode,
      created: Date.now(),
      lastConnection: Date.now(),
      producer: null,
      consumers: [],
      maxOccupancy: MAX_OCCUPANCY,
      touch() {
         this.lastConnection = Date.now();
      },
      get locked(): boolean {
         return this.producer !== null;
      },
      get currentOccupancy(): number {
         return this.consumers.length;
      },
   }
}


// TODO: ROOMS will be more than just a number. I might want to capture some metadata such as timestamp when creating
// TODO It will also be a good idea to create a timer periodically for each room so that it cleans up the room after a user doesn't use the room for a given time period (try: 5 minutes at first - make this configurable)
let ROOMS = new Set();
const ROOM_MAP: Map<string, Room> = new Map();
const ID_ROOM_MAP: Map<string, string> = new Map();

const app = express();
const server = createServer(app)
const wss = new WebSocketServer({ server: server });

// Add this immediately after creating app
app.use((req, _res, next) => {
   console.log('=== INCOMING ===', req.method, req.url);
   next();
});

// Always present. In dev, never hit (Vite handles routing).
// // In prod, serves built files.
app.use(express.static("/app/public"));


// Generate a random room number
function generateRoomCode() {
   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456793";
   const bytes = crypto.randomBytes(ROOM_CODE_LEN);
   let code = [];
   for (let byte of bytes) {
      code.push(chars[byte % chars.length]);
   }
   return code.join("");
}


app.post('/api/rooms', (req: IncomingMessage, res) => {

   // Users that already have a registered room, will return the one already created
   const userId = url.parse(req.url as string, true).query?.userID as string | undefined;
   if (!userId) {
      return res.status(401).json({ error: "No user id sent to the server." });
   }

   if (ID_ROOM_MAP.has(userId)) {
      return res.json({ "code": ID_ROOM_MAP.get(userId) });
   }

   let code;
   do {
      code = generateRoomCode();
   } while (ROOMS.has(code) && ROOM_MAP.has(code));

   ROOMS.add(code);
   ROOM_MAP.set(code, createRoom(code));
   ID_ROOM_MAP.set(userId, code);

   return res.json({ "code": code });
});

app.get('/api/room', (req, res) => {
   const roomCode = req.query?.code as string;
   console.log(roomCode);
   if (roomCode !== undefined && roomCode !== "") {
      console.log(ROOMS.size);
      if (ROOMS.has(roomCode) && ROOM_MAP.has(roomCode)) {
         return res.status(200).json({ exists: true });
      }
      return res.status(404).json({ exists: false });
   }
   res.status(400).json({ error: "Missing room code" });
});


app.get('*splat', (_req, res) => {
   res.sendFile(join("/app/public", "index.html"));
});


let clients = new Map();

wss.on('connection', function connection(ws: WebSocket, request: IncomingMessage): void {

   const clientType = getClientType(request);
   const roomCode = getRoomCode(request);

   if (!roomCode) {
      ws.send("Error: room code not specified");
      ws.close();
      return;
   }

   const room = ROOM_MAP.get(roomCode);
   if (!room) {
      ws.send("Error: room not found");
      ws.close();
      return;
   }

   switch (clientType) {
      case PRODUCER_TYPE:
         if (room.producer !== null) {
            ws.send("Error: Producer already registered");
            ws.close();
         }

         room.producer = ws;

         break;

      case CONSUMER_TYPE:
         // There can be many consumers
         const consumers = room.consumers;
         consumers.push(ws);
         break;

      default:
         ws.send("Unknown client role specified.");
         ws.close();
   }

   ws.on('error', console.error);

   ws.on('message', function message(data: DataView) {
      // For now, skip if message sent is not a producer type
      if (clientType !== PRODUCER_TYPE) return;

      const consumers = room.consumers;

      wss.clients.forEach(function each(client) {
         if (client !== ws && consumers.includes(client) && client.readyState === WebSocket.OPEN) {
            client.send(data.buffer);
         }
      });
   });

   ws.on('close', function close() {

      switch (clientType) {
         case PRODUCER_TYPE:
            room.producer = null;
            break;

         case CONSUMER_TYPE:
            let consumers = room.consumers;
            const index = consumers.indexOf(ws);
            consumers.splice(index, 1);
            break;
      }
   });
});


function getClientType(request: IncomingMessage): string | undefined {
   const role = request.headers?.role || url.parse(request.url as string, true).query?.role;
   if (role === "producer") return PRODUCER_TYPE;
   if (role === "consumer") return CONSUMER_TYPE;
   return undefined;
}

function getRoomCode(request: IncomingMessage): string | undefined {
   const roomCode = request.headers?.roomcode || url.parse(request.url as string, true).query?.roomCode;
   if (!roomCode) return undefined;
   return Array.isArray(roomCode) ? roomCode[0] : roomCode;
}



server.listen(PORT, () => {
   console.log(`Geocast app listening on port ${PORT}`);
})
