import url from 'url';
import { showScene } from './scene.js';

// For get room page
// When I do this I need to query the server to create a number for me
function showHome() {
   document.getElementById("button").onclick = async function() {
      console.log("Clicked");
      let response = await fetch("http://localhost:5173/api/rooms", { method: "POST" });
      const data = await response.json();
      const url = `http://localhost:5173/room/${data.code}`;
      document.getElementById("room-response").innerHTML = `Please visit your room at <a href="${url}">${url}</a>`;
   };
}


// Check the path
window.onload = () => {
   const url = new URL(window.location.href);

   if (url.pathname === "/")  // Load the create room button page
   {
      showHome();
   }
   else if (url.pathname.startsWith("/room/")) {
      const roomCode = url.pathname.split("/room/")[1];
      console.log(`Room code: ${roomCode}`);
      showScene();
   }
   else {
      // Throw an error here
      document.getElementById("app").innerHTML = `
         <h1>404</h1>
         <p>Page not found</p>
         <a href="/">Go Home</a>
      `;

   }
}

