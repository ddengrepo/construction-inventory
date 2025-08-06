from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaterialViewSet, DisciplineViewSet, ToolViewSet, FactInventoryTransactionsViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
# Explicitly provide basename for all ViewSets using MongoEngine
router.register(r'materials', MaterialViewSet, basename='material')
router.register(r'disciplines', DisciplineViewSet, basename='discipline') # ADDED basename
router.register(r'tools', ToolViewSet, basename='tool') # ADDED basename
router.register(r'transactions', FactInventoryTransactionsViewSet, basename='transaction') # ADDED basename

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
    # path('token/', obtain_auth_token, name='api_token_auth'),
]
