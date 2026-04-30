#!/bin/sh

# Open up the config file and run a search and replace using sed
if [ -n "$BACKEND_SERVER" ]; then
   sed -i "s/{{BACKEND_URL}}/$BACKEND_SERVER/g" ./public/frontend/index-*.js;
else
   sed -i "s/{{BACKEND_URL}}//g" ./public/frontend/index-*.js;
fi

#
# Run the server
node ./dist/backend/server.js
