### 1. Project Setup & Database (PostgreSQL in Docker)

* **Docker & PostgreSQL Initialization:**
    * Configured `docker-compose.yml` to define services for a PostgreSQL database (`db`) and pgAdmin (`pgadmin`).
    * Set up environment variables for PostgreSQL (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`) and pgAdmin (`PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`) in a `.env` file.
    * Mapped PostgreSQL port `5432:5432` (corrected from an earlier `5433:5432` discussion).
    * Mapped pgAdmin port `8080:80`.
    * Utilized persistent Docker volumes (`pg_inventory_data`, `pgadmin_inventory_data`) for data persistence.
    * Started Docker containers using `docker compose up -d`.

* **Database Schema Creation (`init_inventory.sql`):**
    * Designed and implemented the star schema for the `construction_inventory_db`.
    * Created dimension tables: `DimDate`, `DimDiscipline`, `DimMaterial`, `DimTool`.
    * Created the fact table: `FactInventoryTransactions`.
    * Defined primary key, foreign key relationships, and the `CHECK` constraint for `FactInventoryTransactions` (ensuring either `material_id` or `tool_id` is present, but not both).

* **Sample Data Loading (into PostgreSQL):**
    * Populated all dimension and fact tables with initial sample data directly via pgAdmin.
    * **Troubleshooting:** Addressed `null value in column "date_id"` errors by ensuring all `full_date` entries referenced in `FactInventoryTransactions` existed in `DimDate`.
    * **Troubleshooting:** Addressed initial negative `current_stock` values (e.g., for 2x4 Lumber) by providing and applying a new set of sample data that guarantees positive or zero stock levels.
    * Learned to `DELETE FROM` tables and `ALTER SEQUENCE ... RESTART WITH 1` for a clean data reset.

---

### 2. Django Backend Setup (Python)

* **Python Virtual Environment Setup (`uv`):**
    * Used `uv init` within the `construction-db` directory to create a virtual environment (`venv`) and initialize `pyproject.toml` for robust dependency management.
    * Activated the virtual environment (`source venv/bin/activate` on macOS/Linux).
    * **Troubleshooting:** Resolved `venv/bin/activate: No such file` errors by explicitly running `uv venv` and confirming the `venv` directory name.
    * **Troubleshooting:** Resolved `dyld` errors (related to Node.js/icu4c on macOS) by force-uninstalling and reinstalling Node.js via Homebrew, including using `--ignore-dependencies` for `mongosh`.

* **Django Project & App Creation:**
    * Created a `backend` subdirectory within the `construction-db` project.
    * Used `django-admin startproject inventory_backend .` to create the main Django project files inside `backend`.
    * Used `python manage.py startapp inventory` to create the `inventory` app within the Django project.

* **Django Configuration (`settings.py`):**
    * Installed `python-dotenv` using `uv add`.
    * Added `import os` and `from dotenv import load_dotenv; load_dotenv()` at the top of `backend/inventory_backend/settings.py` to load environment variables.
    * Configured the `DATABASES` setting to connect to PostgreSQL (`construction_inventory_db`, `localhost:5432`, using `os.environ.get('POSTGRES_PASSWORD')`).
    * Added `'inventory'` (your app) and `'rest_framework'` (for DRF) to `INSTALLED_APPS`.
    * Installed `django-cors-headers` using `uv add` and configured it in `settings.py` by adding `'corsheaders'` to `INSTALLED_APPS` and `CorsMiddleware` to `MIDDLEWARE`.
    * Set `CORS_ALLOWED_ORIGINS` to `["http://localhost:5173", "http://127.0.0.1:5173"]` (or `CORS_ALLOW_ALL_ORIGINS = True` for development) and `CORS_ALLOW_CREDENTIALS = True`.

* **Django Models (`models.py`):**
    * Defined Django models (`DimDate`, `DimDiscipline`, `DimMaterial`, `DimTool`, `FactInventoryTransactions`) in `backend/inventory/models.py`, mirroring the PostgreSQL schema.
    * **Crucially, set `managed = False` in the `Meta` class for each model** to indicate that Django should not manage their creation/alteration, as they already exist in the database.

* **Django Migrations & Admin:**
    * Used `python manage.py makemigrations inventory` to generate initial migration files.
    * **Troubleshooting:** Addressed `relation "dimdate" already exists` errors by ensuring `managed = False` was set, deleting old migration files, and then running `python manage.py migrate --fake-initial`.
    * Created a superuser using `python manage.py createsuperuser`.
    * **Troubleshooting:** Addressed "port already in use" errors for the Django dev server by running on a different port (e.g., `python manage.py runserver 8001`).
    * Registered all custom models in `backend/inventory/admin.py` to make them visible and manageable in the Django admin interface (`http://127.0.0.1:8000/admin/`).

---

### 3. Django REST Framework (DRF) API

* **DRF Installation & Configuration:**
    * Installed `djangorestframework` and `django-filter` using `uv add`.
    * Added `'rest_framework'` and `'django_filters'` to `INSTALLED_APPS`.

* **Serializers (`serializers.py`):**
    * Created `backend/inventory/serializers.py` to define `ModelSerializer` classes (`MaterialSerializer`, `DisciplineSerializer`, `ToolSerializer`, `FactInventoryTransactionsSerializer`, `DateSerializer`) for converting Django models to JSON and handling data validation.

* **API Views (`views.py`):**
    * Created `ModelViewSet` classes (`MaterialViewSet`, `DisciplineViewSet`, `ToolViewSet`, `FactInventoryTransactionsViewSet`) to provide standard CRUD operations for models.
    * Configured `filter_backends` and `filterset_fields` in `MaterialViewSet` (and others) to enable filtering via URL query parameters (e.g., `?discipline__discipline_id=X`).
    * Added a custom `@action(detail=True, methods=['get'])` called `current_stock` to `MaterialViewSet` to calculate and return the aggregated current stock for a specific material ID.

* **URL Routing (`urls.py`):**
    * Created `backend/inventory/urls.py` to define API routes using DRF's `DefaultRouter` (e.g., `/api/materials/`, `/api/disciplines/`).
    * Included these app-specific URLs in the main `backend/inventory_backend/urls.py` (`path('api/', include('inventory.urls'))`).

---

### 4. React Frontend Setup

* **React Project Creation (with Vite):**
    * Created a `frontend` subdirectory *within* the main `construction-db` project directory.
    * Used `npm create vite@latest frontend -- --template react` to scaffold the React project.
    * Installed frontend dependencies with `npm install`.
    * Started the React development server with `npm run dev` (typically on `http://localhost:5173/`).

* **API Communication & Data Display (`App.jsx`):**
    * Modified `frontend/src/App.jsx` to use `useState` and `useEffect` hooks to fetch data from the Django API.
    * Implemented logic to fetch the list of disciplines for the dropdown.
    * Implemented logic to fetch materials based on selected filter criteria (Discipline, Material Type, Brand).
    * Added a nested `fetchCurrentStock` function to make a separate API call for each material's current stock (using the custom Django action).
    * Displayed the fetched material data, including the `current_stock` value.

* **Frontend Functionality & Styling (`App.jsx` & `App.css`):**
    * Added interactive filter dropdowns for Discipline, Material Type, and Brand.
    * Updated the display from a simple list (`<ul>`) to a `<table>` for better organization and vertical alignment of columns.
    * Added table headers (`<th>`) for "Material Name," "Type," "Brand," "Discipline," and "Current Stock."
    * Created `frontend/src/App.css` to provide basic styling for the overall layout, filter section, and the new table structure, ensuring readability and responsiveness.




# Project Startup Checklist: Construction Inventory System

## 1. Start PostgreSQL Database

```bash
# Navigate to your main project directory (where docker-compose.yml is)
cd /path/to/your/construction-db

# Bring up the Docker containers (PostgreSQL and pgAdmin)
docker compose up -d
```
## database access url 
http://localhost:8080/



## 2. Start Django Backend 
```bash
# Activate your Python virtual environment
source venv/bin/activate

# Navigate into your Django backend directory
cd backend

# Start the Django development server
# Note: If port 8000 is in use, Django will suggest another port (e.g., 8001)
python manage.py runserver
```
## Django backend urls
# default url
http://127.0.0.1:8000/ 
# admin url
http://127.0.0.1:8000/admin/
# api endpoint
http://127.0.0.1:8000/api/materials/



## 3. Start React Frontend
```bash
# Open a NEW terminal window (keep Django server running in its own terminal)

# Navigate to your main project directory
cd /path/to/your/construction-db

# Navigate into your React frontend directory
cd frontend

# Install dependencies (only if you've deleted node_modules or on a new setup)
# npm install

# Start the React development server
npm run dev
```

## run react app in browser
http://localhost:5173/




## next steps
dockerize