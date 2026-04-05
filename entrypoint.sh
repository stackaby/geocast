#!/bin/sh

# Open up the config file and run a search and replace using sed
echo "Server is $BACKEND_SERVER"
if [ -n "$BACKEND_SERVER" ]; then
   sed -i "s/{{BACKEND_URL}}/$BACKEND_SERVER/g" ./assets/index*.js;
else
   sed -i "s/{{BACKEND_URL}}//g" ./assets/index*.js;
fi

#
# Run the front end
npm run dev -- --host 0.0.0.0 --port 5173
