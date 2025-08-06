# backend/inventory_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from rest_framework.authtoken import views # Import DRF's built-in token views

urlpatterns = [
    # Redirect the root URL to the API root
    path('', lambda request: redirect('api/', permanent=False)), # ADDED: Redirect for root path
    path('admin/', admin.site.urls),
    path('api/', include('inventory.urls')), # Include the inventory app's URLs
    # Add DRF's built-in token authentication endpoint
    # This provides a simple endpoint to get a token for a user
    path('api/token-auth/', views.obtain_auth_token),
]
