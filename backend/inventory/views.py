# backend/inventory/views.py
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet # Standard DRF ModelViewSet

# Removed DjangoFilterBackend as we are implementing manual filtering
# from django_filters.rest_framework import DjangoFilterBackend
# Removed these as they are for Django ORM Subquery, not MongoEngine
# from django.db.models import Sum, OuterRef, Subquery

from .models import DimMaterial, DimDiscipline, DimTool, FactInventoryTransactions, DimDate
from .serializers import MaterialSerializer, DisciplineSerializer, ToolSerializer, FactInventoryTransactionsSerializer, DateSerializer

# ViewSet for DimDiscipline
class DisciplineViewSet(ModelViewSet):
    queryset = DimDiscipline.objects.all()
    serializer_class = DisciplineSerializer
    lookup_field = 'discipline_id'

    # Manual filtering and ordering for Discipline
    def get_queryset(self):
        queryset = DimDiscipline.objects.all()
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                __raw__={'$or': [
                    {'discipline_name': {'$regex': search_term, '$options': 'i'}},
                    {'discipline_description': {'$regex': search_term, '$options': 'i'}},
                ]}
            )
        ordering = self.request.query_params.get('ordering', None)
        if ordering:
            queryset = queryset.order_by(ordering)
        return list(queryset) # Return as list after applying filters

# ViewSet for DimMaterial (Manual filtering, search, ordering, and stock calculation)
class MaterialViewSet(ModelViewSet):
    serializer_class = MaterialSerializer
    lookup_field = 'material_id'

    def get_queryset(self):
        queryset = DimMaterial.objects.all()

        # Manual Filtering
        discipline_id = self.request.query_params.get('discipline__discipline_id', None)
        if discipline_id:
            try:
                discipline_obj = DimDiscipline.objects.get(discipline_id=int(discipline_id))
                queryset = queryset.filter(discipline=discipline_obj)
            except (DimDiscipline.DoesNotExist, ValueError):
                pass # Or raise a more specific error

        material_type = self.request.query_params.get('material_type', None)
        if material_type:
            queryset = queryset.filter(material_type=material_type)

        brand = self.request.query_params.get('brand', None)
        if brand:
            queryset = queryset.filter(brand=brand)

        # Manual Search
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                __raw__={'$or': [
                    {'material_name': {'$regex': search_term, '$options': 'i'}},
                    {'material_type': {'$regex': search_term, '$options': 'i'}},
                    {'brand': {'$regex': search_term, '$options': 'i'}},
                ]}
            )

        # Calculate current_stock for each material and add it as an attribute
        materials_with_stock = []
        for material in queryset:
            # Aggregate quantity_change for the specific material
            stock_transactions = FactInventoryTransactions.objects.filter(material=material)
            current_stock = sum(t.quantity_change for t in stock_transactions) if stock_transactions else 0
            material.current_stock = current_stock # Dynamically add the attribute
            materials_with_stock.append(material)

        # Manual Ordering
        ordering = self.request.query_params.get('ordering', None)
        if ordering:
            # Handle sorting for 'current_stock' separately as it's a dynamic attribute
            if 'current_stock' in ordering:
                materials_with_stock.sort(key=lambda m: m.current_stock, reverse=ordering.startswith('-'))
            else:
                # For other fields, MongoEngine's .order_by() works on the queryset
                # But since we converted to list for stock, we sort the list
                # This part would need more sophisticated handling if you want
                # combined sorting with database-level ordering.
                # For now, we'll sort the list based on model attributes.
                # Example: materials_with_stock.sort(key=lambda m: getattr(m, ordering.lstrip('-')), reverse=ordering.startswith('-'))
                pass # The initial queryset is already ordered by material_name, no need to re-sort unless specific ordering is requested.

        return materials_with_stock # Return a list of documents with current_stock attribute

# ViewSet for DimTool
class ToolViewSet(ModelViewSet):
    queryset = DimTool.objects.all()
    serializer_class = ToolSerializer
    lookup_field = 'tool_id'

    # Manual filtering and ordering for Tool
    def get_queryset(self):
        queryset = DimTool.objects.all()

        discipline_id = self.request.query_params.get('discipline__discipline_id', None)
        if discipline_id:
            try:
                discipline_obj = DimDiscipline.objects.get(discipline_id=int(discipline_id))
                queryset = queryset.filter(discipline=discipline_obj)
            except (DimDiscipline.DoesNotExist, ValueError):
                pass

        tool_type = self.request.query_params.get('tool_type', None)
        if tool_type:
            queryset = queryset.filter(tool_type=tool_type)

        brand = self.request.query_params.get('brand', None)
        if brand:
            queryset = queryset.filter(brand=brand)

        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                __raw__={'$or': [
                    {'tool_name': {'$regex': search_term, '$options': 'i'}},
                    {'tool_type': {'$regex': search_term, '$options': 'i'}},
                    {'brand': {'$regex': search_term, '$options': 'i'}},
                    {'model': {'$regex': search_term, '$options': 'i'}},
                ]}
            )
        ordering = self.request.query_params.get('ordering', None)
        if ordering:
            queryset = queryset.order_by(ordering)
        return list(queryset) # Return as list after applying filters

# ViewSet for FactInventoryTransactions
class FactInventoryTransactionsViewSet(ModelViewSet):
    queryset = FactInventoryTransactions.objects.all()
    serializer_class = FactInventoryTransactionsSerializer
    lookup_field = 'transaction_id'

    # Manual filtering and ordering for FactInventoryTransactions
    def get_queryset(self):
        queryset = FactInventoryTransactions.objects.all()

        date_id = self.request.query_params.get('date__date_id', None)
        if date_id:
            try:
                date_obj = DimDate.objects.get(date_id=int(date_id))
                queryset = queryset.filter(date=date_obj)
            except (DimDate.DoesNotExist, ValueError):
                pass

        material_id = self.request.query_params.get('material__material_id', None)
        if material_id:
            try:
                material_obj = DimMaterial.objects.get(material_id=int(material_id))
                queryset = queryset.filter(material=material_obj)
            except (DimMaterial.DoesNotExist, ValueError):
                pass

        tool_id = self.request.query_params.get('tool__tool_id', None)
        if tool_id:
            try:
                tool_obj = DimTool.objects.get(tool_id=int(tool_id))
                queryset = queryset.filter(tool=tool_obj)
            except (DimTool.DoesNotExist, ValueError):
                pass

        transaction_type = self.request.query_params.get('transaction_type', None)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)

        ordering = self.request.query_params.get('ordering', None)
        if ordering:
            queryset = queryset.order_by(ordering)

        return list(queryset) # Return as list after applying filters
