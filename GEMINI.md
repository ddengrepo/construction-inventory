# Gemini Project Context: Construction Inventory System

This file provides context and instructions for the Gemini AI assistant to effectively work on this project.

## 1. Project Overview

This document outlines the setup and operation of the Construction Inventory System, which consists of a Django backend and a React frontend.

## 2. Project Structure

The project is organized into `backend` and `frontend` directories, managed by `uv` for Python dependencies and `npm` for Node.js/React dependencies.

```
construction-db/
├── backend/
│   ├── inventory_backend/  # Django project settings
│   │   ├── settings.py
│   │   └── urls.py
│   ├── inventory/          # Django app
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── manage.py
│   └── .env                # Environment variables for Django/PostgreSQL
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml      # Docker setup for PostgreSQL and pgAdmin
├── init_inventory.sql      # PostgreSQL schema and initial data
├── pyproject.toml          # Python dependency management (uv)
└── README.md
```

## 3. Docker & PostgreSQL Setup

This section details how to set up your PostgreSQL database and pgAdmin using Docker.

### `docker-compose.yml` Overview

The `docker-compose.yml` defines two services:

*   **db:** A PostgreSQL 16 database.
    *   Uses `postgres:16-alpine` for a lightweight image.
    *   Maps host port `5433` to container port `5432` (`"5433:5432"`).
    *   Uses a persistent volume `pg_inventory_data` for data.
    *   Mounts `init_inventory.sql` to initialize the database schema and populate initial data.
    *   Database credentials (DB name, user, password) are set via environment variables, with the password sourced from your `.env` file.
*   **pgadmin:** A web-based interface for managing PostgreSQL.
    *   Maps host port `8080` to container port `80` (`"8080:80"`).
    *   Login credentials are set via environment variables, sourced from your `.env` file.
    *   Uses a persistent volume `pgadmin_inventory_data` for its configuration.

### `init_inventory.sql` Overview

This SQL script creates the star schema for your inventory database:

*   **Dimension Tables:** `DimDate`, `DimDiscipline`, `DimMaterial`, `DimTool`.
*   **Fact Table:** `FactInventoryTransactions`.
*   Includes `DROP TABLE IF EXISTS` statements for clean restarts.
*   Populates all tables with sample data, including foreign key relationships and ensuring non-negative stock levels.

### Setup Steps

1.  **Create `.env` file:** In your `construction-db/backend` directory, create a `.env` file with your PostgreSQL and pgAdmin credentials:

    ```
    POSTGRES_PASSWORD=your_db_password
    PGADMIN_EMAIL=admin@example.com
    PGADMIN_PASSWORD=admin_password
    ```

2.  **Ensure `init_inventory.sql` is in the root directory:** Make sure the `init_inventory.sql` file (provided in the `inventory_init_sql` immersive) is directly in your `construction-db/` directory.

3.  **Start Docker containers:** From the `construction-db/` root directory, run:

    ```bash
    docker compose up -d
    ```

    This will build and start the `db` and `pgadmin` services.

4.  **Access pgAdmin:** Once started, you can access pgAdmin in your browser at `http://localhost:8080`. Log in with the credentials from your `.env` file.

## 4. Django Backend Setup

This section details the Python environment, Django project configuration, and API setup.

### Python Dependencies (`pyproject.toml`)

Your `pyproject.toml` should list the following key dependencies:

*   `django`
*   `djangorestframework`
*   `mongoengine` (for MongoDB ORM)
*   `corsheaders` (for handling Cross-Origin Resource Sharing)
*   `python-dotenv` (for loading environment variables)

**Important:** We have removed `django-rest-framework-mongoengine` and `django-filter` due to compatibility issues, and now handle their functionalities manually.

### Django Configuration (`backend/inventory_backend/settings.py`)

*   **Load Environment Variables:** Ensure `os` and `python-dotenv` are imported and `load_dotenv()` is called at the top.
*   **Database Connection:** The `DATABASES` setting points to your PostgreSQL database.

    ```python
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3', # For Django's internal needs
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    ```

*   **MongoDB Connection (using MongoEngine):**

    ```python
    mongoengine.connect(
        db=os.environ.get('MONGO_INITDB_DATABASE'), # Ensure this matches your docker-compose.yml
        host='mongodb://localhost:27017/', # Connect to localhost
        username=os.environ.get('MONGO_INITDB_ROOT_USERNAME'),
        password=os.environ.get('MONGO_INITDB_ROOT_PASSWORD'),
        authentication_source='admin'
    )
    ```

*   **`INSTALLED_APPS`:**

    ```python
    INSTALLED_APPS = [
        # ... default Django apps ...
        'corsheaders',
        'inventory', # Your Django app
        'rest_framework',
        'rest_framework.authtoken', # For token authentication
    ]
    ```

*   **`REST_FRAMEWORK` Settings:**

    ```python
    REST_FRAMEWORK = {
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'rest_framework.authentication.TokenAuthentication',
        ],
        'DEFAULT_PERMISSION_CLASSES': [
            'rest_framework.permissions.AllowAny', # Adjust for production
        ],
        'DEFAULT_RENDERER_CLASSES': [
            'rest_framework.renderers.JSONRenderer',
            'rest_framework.renderers.BrowsableAPIRenderer',
        ],
    }
    ```

*   **CORS Configuration:**

    ```python
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173", # Allow your React dev server
        "http://127.0.0.1:5173",
    ]
    CORS_ALLOW_CREDENTIALS = True
    ```

### Django Models (`backend/inventory/models.py`)

All models (`DimDate`, `DimDiscipline`, `DimMaterial`, `DimTool`, `FactInventoryTransactions`) are defined using Django's ORM.

*   Crucially, `class Meta: managed = False` is set for each model, indicating that Django should not manage the database schema for these tables (as they are managed by PostgreSQL and `init_inventory.sql`).
*   `material_name` in `DimMaterial` is set to `unique=True`.

### Django REST Framework Serializers (`backend/inventory/serializers.py`)

All serializers (`DisciplineSerializer`, `MaterialSerializer`, `ToolSerializer`, `DateSerializer`, `FactInventoryTransactionsSerializer`) now inherit from `rest_framework.serializers.Serializer`.

*   They include explicit `create` and `update` methods to manually handle saving data to MongoEngine documents, bypassing `django-rest-framework-mongoengine`.
*   Foreign key relationships are handled by defining `read_only=True` nested serializers for display and `write_only=True` integer fields for input (e.g., `discipline_id` in `MaterialSerializer`).

### Django REST Framework Views (`backend/inventory/views.py`)

All viewsets (`DisciplineViewSet`, `MaterialViewSet`, `ToolViewSet`, `FactInventoryTransactionsViewSet`) inherit from `rest_framework.viewsets.ModelViewSet`.

*   **Manual Filtering, Searching, and Ordering:** `filter_backends`, `filterset_fields`, `search_fields`, and `ordering_fields` have been removed. Instead, `get_queryset` methods in each viewset now implement manual filtering, searching (using `__raw__` for regex in MongoEngine), and ordering based on query parameters.
*   **Optimized `current_stock` Calculation:** The `MaterialViewSet`'s `get_queryset` now calculates `current_stock` by iterating through materials and summing related `FactInventoryTransactions`, then dynamically adding this attribute to each material object before serialization.

### Setup Steps

1.  **Navigate to `construction-db/`:**
    ```bash
    cd construction-db/
    ```

2.  **Create/Update `.env`:** Ensure your `.env` file in `backend/` is correctly configured as described above.

3.  **Install Python Dependencies:**
    ```bash
    uv add django djangorestframework mongoengine corsheaders python-dotenv
    uv remove django-rest-framework-mongoengine django-filter # Ensure these are removed
    uv sync
    ```

4.  **Navigate to `backend/`:**
    ```bash
    cd backend/
    ```

5.  **Apply Django Migrations:** This sets up Django's internal tables (like auth and sessions) in your SQLite database.
    ```bash
    python manage.py migrate
    ```

6.  **Create a Django Superuser:**
    ```bash
    python manage.py createsuperuser
    ```
    Follow the prompts to create your admin user.

7.  **Start Django Development Server:**
    ```bash
    uv run python manage.py runserver
    ```
    Your API should now be accessible at `http://127.0.0.1:8000/api/`.

## 5. React Frontend Setup

This section details the React application setup and its interaction with the Django API.

### Project Creation

The React project was scaffolded using Vite.

### `frontend/src/App.jsx` Overview

*   **State Management:** Uses `useState` for managing UI state (items, filters, form data, loading, errors, authentication token).
*   **Authentication:**
    *   `token` is stored in `localStorage`.
    *   `handleLogin` sends a `POST` request to `http://127.0.0.1:8000/api/token-auth/` to obtain a token.
    *   `fetchWithAuth` is a wrapper around `fetch` that automatically includes the `Authorization: Token <token>` header for all authenticated requests.
    *   A login form is displayed if no token is present.
*   **Data Fetching:** `useEffect` hooks are used to fetch `disciplinesList` and `materials` from the Django API. `fetchMaterials` now includes logic for applying manual filters (`discipline__discipline_id`, `material_type`) and dynamically calculates `current_stock` based on the fetched data (since backend now returns full material data).
*   **CRUD Operations:** `handleAddItem`, `handleEditItem`, `handleUpdateItem`, and `handleDeleteItem` functions interact with the Django API for managing materials.
*   **UI Components:** Implements search, category/type filters, a table to display materials, and a modal for adding/editing materials.
*   **Error Handling:** Displays user-friendly messages for API errors and form validation issues.

### `frontend/src/App.css` Overview

*   Provides basic styling for the overall layout, header, stats cards, filter section, and the main data table.
*   Includes responsive design considerations using media queries to adapt the layout for smaller screens.
*   Defines styles for the login form and modal overlay.

### Setup Steps

1.  **Navigate to `construction-db/frontend`:**
    ```bash
    cd frontend/
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

3.  **Start React Development Server:**
    ```bash
    npm run dev
    ```
    Your React app should now be running, typically at `http://localhost:5173/`.

## 6. Running the Full Stack

To get the entire application running:

1.  **Start Docker containers** (from `construction-db/` root):
    ```bash
    docker compose up -d
    ```

2.  **Start Django Backend** (from `construction-db/backend/`):
    ```bash
    uv run python manage.py runserver
    ```

3.  **Start React Frontend** (from `construction-db/frontend/`):
    ```bash
    npm run dev
    ```

Now, open your browser to `http://localhost:5173/`, log in with your Django superuser credentials, and you should see the inventory dashboard.

## 7. Troubleshooting Tips

*   **Port Conflicts:** If you encounter "Address already in use" errors, ensure no other applications are using ports `5433`, `8080`, `8000`, or `5173`. You can change the Django server port with `uv run python manage.py runserver <PORT>`.
*   **Database Issues:** If Docker containers don't start or the database seems empty, try:
    ```bash
    docker compose down -v # Stops and removes containers and volumes
    docker compose up -d   # Recreates everything from scratch
    ```
*   **Django Migrations:** If you change your Django models, remember to run `python backend/manage.py makemigrations inventory` and `python backend/manage.py migrate`. If you get `relation "table_name" already exists` errors after a fresh Docker setup, you might need to run `python backend/manage.py migrate --fake-initial`.
*   **Frontend Errors:** For `SyntaxError` or `ModuleNotFoundError` in the frontend, ensure all `npm install` and `uv sync` commands were run successfully. Clear your browser cache if UI issues persist after code changes.
*   **Authentication Errors:** If login fails, double-check your superuser username and password, and ensure `python backend/manage.py migrate` was run after adding `rest_framework.authtoken` to `INSTALLED_APPS`.
