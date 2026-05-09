#!/bin/sh
PROTOCOL=http
# Open up the config file and run a search and replace using sed
if [ -n "$BACKEND_SERVER" ]; then
   sed -i "s/{{BACKEND_URL}}/$BACKEND_SERVER/g" ./public/frontend/index-*.js;

else
   sed -i "s/{{BACKEND_URL}}//g" ./public/frontend/index-*.js;
fi

if [ -n "$PORT" ]; then
   sed -i "s/{{PORT}}/$PORT/g" ./public/frontend/index-*.js;

else
   sed -i "s/{{PORT}}//g" ./public/frontend/index-*.js;
fi

if [ -n "$PROTOCOL" ]; then
   sed -i "s/{{PROTOCOL}}/$PROTOCOL/g" ./public/frontend/index-*.js;

else
   sed -i "s/{{PROTOCOL}}//g" ./public/frontend/index-*.js;
fi



#
# Run the server
node ./dist/backend/server.js
