#!/bin/bash

echo "Stopping development environment..."

# Find and kill the process using port 8000 (Django backend)
BACKEND_PID=$(lsof -t -i:8000)
if [ -n "$BACKEND_PID" ]; then
  echo "Stopping Django backend server (PID: $BACKEND_PID)..."
  kill $BACKEND_PID
else
  echo "Django backend server not found on port 8000."
fi

# Find and kill the process using port 5173 (React frontend)
FRONTEND_PID=$(lsof -t -i:5173)
if [ -n "$FRONTEND_PID" ]; then
  echo "Stopping React frontend server (PID: $FRONTEND_PID)..."
  kill $FRONTEND_PID
else
  echo "React frontend server not found on port 5173."
fi

# Stop the database container
echo "Stopping PostgreSQL database container..."
docker-compose down

echo "All services stopped."
