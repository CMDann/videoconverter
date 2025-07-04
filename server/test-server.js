const express = require('express');
const cors = require('cors');

console.log('Starting minimal test server...');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.json({ 
    message: 'Test server is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/test', (req, res) => {
  console.log('Test route accessed');
  res.json({ status: 'ok', test: 'passed' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Test server running on port ${PORT}`);
  console.log(`✓ Local: http://localhost:${PORT}`);
  console.log(`✓ Test: http://localhost:${PORT}/test`);
});

server.on('error', (err) => {
  console.error('Server startup error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    console.log('Trying port 5002...');
    
    const server2 = app.listen(5002, '0.0.0.0', () => {
      console.log(`✓ Test server running on port 5002`);
      console.log(`✓ Local: http://localhost:5002`);
    });
    
    server2.on('error', (err2) => {
      console.error('Server error on port 5002:', err2);
    });
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});