# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Failed to fetch" / "ERR_CONNECTION_RESET" Error

**Problem**: The frontend can't connect to the backend server.

**Solutions**:

1. **Check if the server is running**:
   ```bash
   cd server
   node server.js
   ```
   You should see: `Server running on port 5000`

2. **Check if port 5000 is available**:
   ```bash
   lsof -i :5000
   ```
   If something else is using port 5000, kill it or change the port.

3. **Install server dependencies**:
   ```bash
   cd server
   npm install
   ```

4. **Test the server directly**:
   Open `http://localhost:5000` in your browser. You should see:
   ```json
   {"message": "Video Convert API is running"}
   ```

### 2. Frame Extraction "ERR_EMPTY_RESPONSE" Error

**Problem**: Frame extraction fails with empty response or server crash.

**Solutions**:

1. **Test FFmpeg installation**:
   Visit `http://localhost:5001/api/test-ffmpeg` to check if FFmpeg is properly installed.

2. **Check server logs**:
   Look at the terminal where you started the server for detailed error messages.

3. **Try smaller video files**:
   Start with small video files (under 50MB) to test if it's a memory issue.

4. **Check video format**:
   Try with MP4 files first, as they're most compatible.

5. **Restart the server**:
   ```bash
   cd server
   npm start
   ```

### 3. FFmpeg Related Errors

**Problem**: Video processing fails with FFmpeg errors.

**Solutions**:

1. **Check FFmpeg installation**:
   The app uses `ffmpeg-static` which should install automatically.
   Test with: `http://localhost:5001/api/test-ffmpeg`

2. **Check file permissions**:
   Make sure the `uploads` and `output` directories have write permissions.

3. **Supported formats**:
   - Video: MP4, AVI, MOV, WMV, FLV, MKV
   - Images: JPG, PNG, GIF, BMP, TIFF

4. **Memory issues**:
   Large video files may cause memory issues. Try smaller files first.

### 3. Server Won't Start

**Problem**: Server fails to start or crashes immediately.

**Solutions**:

1. **Check Node.js version**:
   ```bash
   node --version
   ```
   Requires Node.js 14 or higher.

2. **Clear node_modules and reinstall**:
   ```bash
   cd server
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for port conflicts**:
   ```bash
   lsof -i :5000
   kill -9 <PID>  # Replace <PID> with the actual process ID
   ```

4. **Run with debugging**:
   ```bash
   DEBUG=* node server.js
   ```

### 4. File Upload Issues

**Problem**: Files won't upload or processing fails.

**Solutions**:

1. **Check file size limits**:
   Default limit is usually 100MB. For larger files, increase in server.js:
   ```javascript
   const upload = multer({ 
     storage: storage,
     limits: { fileSize: 500 * 1024 * 1024 } // 500MB
   });
   ```

2. **Check file format**:
   Make sure you're uploading supported formats.

3. **Browser console errors**:
   Open Developer Tools (F12) and check for JavaScript errors.

### 5. CORS Issues

**Problem**: Cross-origin request blocked.

**Solutions**:

1. **Check CORS configuration**:
   The server should have CORS enabled for all origins.

2. **Use correct URLs**:
   Frontend: `http://localhost:3000`
   Backend: `http://localhost:5000`

### 6. Development vs Production

**Development**:
```bash
# Terminal 1 - Backend
cd server
npm run dev  # or npm start

# Terminal 2 - Frontend
cd client
npm start
```

**Production**:
```bash
# Build frontend
cd client
npm run build

# Serve with backend
cd ../server
npm start
```

## Getting Help

1. **Check server logs**: Look at the terminal where you started the server
2. **Check browser console**: Press F12 and look for errors
3. **Test API endpoints**: Use tools like Postman or curl to test the API directly
4. **File an issue**: Include error messages and steps to reproduce

## Quick Start Script

Use the provided startup script:
```bash
./start-server.sh
```

This will:
- Check dependencies
- Install missing packages
- Kill conflicting processes
- Start the server with proper logging