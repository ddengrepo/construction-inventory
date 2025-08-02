# Gemini Project Context: Construction Inventory System

This file provides context and instructions for the Gemini AI assistant to effectively work on this project.

## 1. Project Overview

This is a full-stack construction inventory management system. It consists of:

*   **Backend:** A Django REST Framework API providing CRUD operations for inventory data.
*   **Frontend:** A React single-page application (built with Vite) that consumes the backend API.
*   **Database:** A PostgreSQL database managed with Docker. The schema is a star schema designed for analytics.
*   **Version Control:** The project is a Git repository hosted on GitHub.

## 2. Key Technologies

*   **Backend:** Python, Django, Django REST Framework, `python-dotenv`, `django-cors-headers`, `uv` for package management.
*   **Frontend:** JavaScript, React, Vite, `lucide-react`.
*   **Database:** PostgreSQL, Docker.
*   **Version Control:** Git, GitHub.

## 3. Project Structure

*   `/backend`: Contains the Django project.
*   `/frontend`: Contains the React project.
*   `/docker-compose.yml`: Defines the PostgreSQL and pgAdmin services.
*   `/init_star_schema.sql`: Initializes the database schema and sample data.
*   `/.env`: Stores environment variables (e.g., database credentials, API keys). **This file is in `.gitignore` and should not be committed.**

## 4. Development Workflow & Commands

**Important:** The Python virtual environment (`.venv`) must be activated for backend commands.

**1. Start the Database:**
```bash
docker-compose up -d db
```

**2. Start the Backend Server:**
```bash
# Activate the virtual environment
source .venv/bin/activate

# Run the development server
.venv/bin/python backend/manage.py runserver
```

**3. Start the Frontend Server:**
```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Run the development server
npm run dev
```

**4. Backend Migrations:**
```bash
# Activate the virtual environment
source .venv/bin/activate

# Run database migrations
.venv/bin/python backend/manage.py migrate
```

## 5. API & Security

*   The API is located at `/api/`.
*   All API endpoints require token authentication.
*   To get a token, send a POST request to `/api/token/` with a username and password.
*   Include the token in the `Authorization` header for all API requests: `Authorization: Token YOUR_TOKEN_HERE`.

## 6. Coding Conventions & Preferences

*   Follow existing code style and patterns.
*   Ensure all new API endpoints are authenticated.
*   Do not commit sensitive information to the repository.
