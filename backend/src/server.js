import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';

const PORT = 8080;
const PRODUCER_TYPE = "PRODUCER";
const CONSUMER_TYPE = "CONSUMER";
const PRODUCER_MAP_KEY = "producer";
const CONSUMERS_MAP_KEY = "consumers";

const wss = new WebSocketServer({ port: PORT });

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
