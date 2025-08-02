from rest_framework import viewsets, permissions
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, OuterRef, Subquery # NEW IMPORTS
from django.db import models

from .models import DimMaterial, DimDiscipline, DimTool, FactInventoryTransactions, DimDate
from .serializers import MaterialSerializer, DisciplineSerializer, ToolSerializer, FactInventoryTransactionsSerializer, DateSerializer

# ViewSet for DimDiscipline (remains unchanged)
class DisciplineViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DimDiscipline.objects.all()
    serializer_class = DisciplineSerializer
    permission_classes = [permissions.IsAuthenticated]

# ViewSet for DimMaterial (OPTIMIZED FOR CURRENT_STOCK)
class MaterialViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'discipline__discipline_id': ['exact'],
        'material_type': ['exact'],
        'brand': ['exact'],
    }
    search_fields = ['material_name', 'material_type', 'brand']
    ordering_fields = ['material_name', 'material_type', 'brand', 'discipline__discipline_name']

    def get_queryset(self):
        """
        Optimizes the queryset to include the current_stock for each material
        by using a Subquery and Sum annotation.
        """
        stock_subquery = FactInventoryTransactions.objects.filter(
            material=OuterRef('pk')
        ).values('material').annotate(
            total_stock=Sum('quantity_change')
        ).values('total_stock')

        queryset = DimMaterial.objects.annotate(
            current_stock=Subquery(stock_subquery, output_field=models.DecimalField()),
        ).order_by('material_name')

        filtered_queryset = self.filter_queryset(queryset)

        return filtered_queryset

# ViewSet for DimTool (remains unchanged)
class ToolViewSet(viewsets.ModelViewSet):
    queryset = DimTool.objects.all()
    serializer_class = ToolSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'discipline__discipline_id': ['exact'],
        'tool_type': ['exact'],
        'brand': ['exact'],
    }
    search_fields = ['tool_name', 'tool_type', 'brand']
    ordering_fields = ['tool_name', 'tool_type', 'brand', 'discipline__discipline_name']

# ViewSet for FactInventoryTransactions (remains unchanged)
class FactInventoryTransactionsViewSet(viewsets.ModelViewSet):
    queryset = FactInventoryTransactions.objects.all()
    serializer_class = FactInventoryTransactionsSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        'date__date_id': ['exact', 'gte', 'lte'],
        'material__material_id': ['exact'],
        'tool__tool_id': ['exact'],
        'transaction_type': ['exact'],
    }
    ordering_fields = ['date__full_date', 'transaction_id']
