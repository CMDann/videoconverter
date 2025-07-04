# Connection Refused - Quick Fix Guide

## Step 1: Test Basic Server
```bash
cd /Users/dannblair/Development/BSD/videoconvert/server
node test-server.js
```

If this works, you should see:
```
✓ Test server running on port 5001
✓ Local: http://localhost:5001
```

Visit `http://localhost:5001` in your browser.

## Step 2: Check Dependencies
```bash
cd /Users/dannblair/Development/BSD/videoconvert/server
npm install
```

## Step 3: Start Main Server
```bash
cd /Users/dannblair/Development/BSD/videoconvert/server
node server.js
```

## Step 4: Alternative Startup Method
```bash
cd /Users/dannblair/Development/BSD/videoconvert
./start-server-simple.sh
```

(You may need to make it executable first: `chmod +x start-server-simple.sh`)

## Step 5: Check for Port Conflicts
```bash
# Kill any processes using ports 5001 or 5002
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5002 | xargs kill -9 2>/dev/null

# Or use different port numbers
export PORT=5003
cd server && node server.js
```

## Step 6: Manual Debug
1. Open Terminal
2. Navigate to: `cd /Users/dannblair/Development/BSD/videoconvert/server`
3. Run: `npm list` to check dependencies
4. Run: `node --version` to check Node.js
5. Run: `npm start` or `node server.js`

## Step 7: Update Frontend Port (if using different port)
If you change the server port, update these files:
- `client/src/components/VideoProcessor.tsx`
- `client/src/components/VideoEditor.tsx`
- `client/src/components/ImageProcessor.tsx`
- `client/src/components/CubeMapConverter.tsx`

Change all instances of `localhost:5001` to your new port.

## Common Issues:

### "Module not found"
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### "Permission denied"
```bash
sudo chown -R $(whoami) /Users/dannblair/Development/BSD/videoconvert
```

### "Port already in use"
```bash
lsof -i :5001
kill -9 <PID>
```

### "Command not found: node"
Install Node.js from https://nodejs.org/

## Test Connection:
Once server is running, test these URLs:
- `http://localhost:5001` - Should show "Video Convert API is running"
- `http://localhost:5001/api/test-ffmpeg` - Should show FFmpeg status

## Emergency Fallback:
If nothing works, use this minimal server setup:

1. Create a new file `simple-server.js`:
```javascript
const express = require('express');
const app = express();
app.use(require('cors')());
app.get('/', (req, res) => res.json({status: 'ok'}));
app.listen(5001, () => console.log('Server on 5001'));
```

2. Run: `node simple-server.js`
3. Test: `http://localhost:5001`