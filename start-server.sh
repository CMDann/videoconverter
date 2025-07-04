#!/bin/bash

echo "Starting Video Convert Pro Server..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Navigate to server directory
cd server

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in server directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing server dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies."
        exit 1
    fi
fi

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "Error: server.js not found."
    exit 1
fi

# Kill any existing process on port 5001
echo "Checking for existing processes on port 5001..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Start the server
echo "Starting server on port 5001..."
node server.js