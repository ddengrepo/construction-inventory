from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter
from .views import MaterialViewSet, DisciplineViewSet, ToolViewSet, FactInventoryTransactionsViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
# Explicitly provide basename for MaterialViewSet because it uses get_queryset()
router.register(r'materials', MaterialViewSet, basename='materials')
router.register(r'disciplines', DisciplineViewSet)
router.register(r'tools', ToolViewSet)
router.register(r'transactions', FactInventoryTransactionsViewSet)

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
    path('token/', obtain_auth_token, name='api_token_auth'),
]
