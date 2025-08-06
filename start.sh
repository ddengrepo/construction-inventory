#!/bin/bash

echo "Starting development environment..."

# Start the database
echo "Starting Mongo database container..."
docker-compose up -d db

# Start the backend server
echo "Starting Django backend server..."
./.venv/bin/python backend/manage.py runserver &

# Start the frontend server
echo "Starting React frontend server..."
(cd frontend && npm run dev) &

echo "All services are starting in the background."
echo "Backend will be available at http://127.0.0.1:8000"
echo "Frontend will be available at http://localhost:5173"
