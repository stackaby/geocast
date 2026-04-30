import { showScene } from './scene.js';

// For get room page
// When I do this I need to query the server to create a number for me
function showHome() {
   const url = new URL(window.location.href);
   const button = document.getElementById("button")
   console.log(url.protocol);
   if (button) {
      button.onclick = async function () {
         const userId = getOrCreateUUID();
         const host = url.port === "" ? url.hostname : `${url.hostname}:${url.port}`;
         let response = await fetch(`${url.protocol}//${host}/api/rooms?userID=${userId}`, { method: "POST" });
         const data = await response.json();
         const roomUrl = `${url.protocol}//${host}/room/${data.code}`;
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
      const userId = getOrCreateUUID();
      // Check to see if the room exists
      const host = url.port === "" ? url.hostname : `${url.hostname}:${url.port}`;
      const response = await fetch(`${url.protocol}//${host}/api/room?userID=${userId}&code=${roomCode}`, {
         method: "GET",
         mode: "cors",
      });
      console.log("hmm");
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


// Create a unique identifier for the user and store in local storage
function getOrCreateUUID(): string {
   let userId = localStorage.getItem("userID");
   if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("userID", userId);
   }
   return userId;
}
