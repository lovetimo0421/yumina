#!/bin/sh

if [ ! -e "config/config.yaml" ]; then
    echo "Resource not found, copying from defaults: config.yaml"
    cp -r "default/config.yaml" "config/config.yaml"
fi

# Create data directory if it doesn't exist (required for cookie secret, settings, etc.)
if [ ! -d "data" ]; then
    echo "Creating data directory..."
    mkdir -p data
fi

# Generate cookie secret if it doesn't exist
if [ ! -e "data/cookie-secret.txt" ]; then
    echo "Generating cookie secret..."
    head -c 64 /dev/urandom | base64 > "data/cookie-secret.txt"
fi

# Execute postinstall to auto-populate config.yaml with missing values
npm run postinstall

# Start the server
# Use PORT env var if set (Railway/cloud platforms inject this)
if [ -n "$PORT" ]; then
    echo "Cloud deployment detected (PORT=$PORT)"

    # Start a lightweight health check proxy immediately so Railway health checks pass
    # while the real server initializes
    echo "Starting health check proxy on port $PORT..."
    node -e "
const http = require('http');
const s = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('OK'); }
  else { res.writeHead(503); res.end('Starting...'); }
});
s.listen(process.env.PORT, () => console.log('Health proxy ready on port ' + process.env.PORT));
process.on('SIGTERM', () => { s.close(); process.exit(0); });
" &
    HEALTH_PID=$!

    # Check if multi-user accounts mode is enabled (preferred for shared deployments)
    if [ "$ST_ENABLE_ACCOUNTS" = "true" ]; then
        echo "Multi-user accounts mode enabled"
        export SILLYTAVERN_ENABLEUSERACCOUNTS=true
        export SILLYTAVERN_ENABLEDISCREETLOGIN=true
        # Initialize default users in the database (fast - no data folders created)
        node init-users.js
        # Don't enable basic auth - user accounts handles authentication
    # Fall back to basic auth if ST_AUTH_USER and ST_AUTH_PASS are set
    elif [ -n "$ST_AUTH_USER" ] && [ -n "$ST_AUTH_PASS" ]; then
        echo "Basic authentication enabled"
        export SILLYTAVERN_BASICAUTHMODE=true
        export SILLYTAVERN_BASICAUTHUSER_USERNAME="$ST_AUTH_USER"
        export SILLYTAVERN_BASICAUTHUSER_PASSWORD="$ST_AUTH_PASS"
    else
        echo "WARNING: No authentication configured!"
        echo "Set ST_ENABLE_ACCOUNTS=true for multi-user login, or"
        echo "Set ST_AUTH_USER and ST_AUTH_PASS for basic auth."
        export SILLYTAVERN_SECURITYOVERRIDE=true
    fi

    # Kill the health check proxy before starting the real server
    echo "Stopping health check proxy..."
    kill $HEALTH_PID 2>/dev/null
    wait $HEALTH_PID 2>/dev/null

    exec node server.js --listen --port "$PORT" --no-whitelist "$@"
else
    exec node server.js --listen "$@"
fi
