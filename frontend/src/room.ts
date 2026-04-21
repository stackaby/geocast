import { showScene } from './scene.js';

// For get room page
// When I do this I need to query the server to create a number for me
function showHome() {
   const url = new URL(window.location.href);
   const button = document.getElementById("button")
   if (button) {
      button.onclick = async function () {
         let response = await fetch(`http://${url.hostname}:${url.port}/api/rooms`, { method: "POST" });
         const data = await response.json();
         const roomUrl = `http://${url.hostname}:${url.port}/room/${data.code}`;
         const roomResponse = document.getElementById("room-response")
         if (roomResponse) {
            roomResponse.innerHTML = `Please visit your room at <a href="${roomUrl}">${roomUrl}</a>`;
         }
      };
   }
}


// Check the path
document.addEventListener("DOMContentLoaded", async () => {
   const url = new URL(window.location.href);
   const app = document.getElementById("app");

   if (url.pathname === "/")  // Load the create room button page
   {
      showHome();
   }
   else if (url.pathname.startsWith("/room/")) {
      const roomCode = url.pathname.split("/room/")[1];
      if (!roomCode) {
         showHome();
         url.pathname = "/";
         return;
      }
      // Check to see if the room exists
      const response = await fetch(`http://${url.hostname}:${url.port}/api/room?code=${roomCode}`, {
         method: "GET",
         mode: "cors",
      });
      if (response.status === 200) {
         showScene(roomCode);
      }
      else {
         // Throw an error here
         if (app) {
            app.innerHTML = `
               <h1>404</h1>
               <p>Page not found</p>
               <a href="/">Go Home</a>
            `;
         }
      }
   }
   else {
      // Throw an error here
      if (app) {
         app.innerHTML = `
            <h1>404</h1>
            <p>Page not found</p>
            <a href="/">Go Home</a>
         `;
      }
   }
});
