import { WebSocketServer } from 'ws';
import url from 'url';

const wss = new WebSocketServer({ port: 8080 });

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
      let consumers;
      if (consumers = (clients.get("consumers"))) {
         for (let consumer of consumers) {
            // Send data to all the consumers
            consumer.send(data.buffer);
         }
      }
   });

   ws.on('close', function close() {
      if (is_producer) {
         clients.set("producer", undefined);
      }

   });
});
