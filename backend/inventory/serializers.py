# serializers.py

from rest_framework import serializers
from .models import DimMaterial, DimDiscipline, DimTool, FactInventoryTransactions, DimDate

# Serializer for DimDiscipline
class DisciplineSerializer(serializers.ModelSerializer):
    class Meta:
        model = DimDiscipline
        fields = ['discipline_id', 'discipline_name', 'discipline_description']
        # Since 'managed = False' in models, we explicitly define fields
        # and ensure primary key is included for updates/retrievals.

# Serializer for DimMaterial
class MaterialSerializer(serializers.ModelSerializer):
    # Nested serializer to include discipline details directly in material response
    discipline = DisciplineSerializer(read_only=True)
    current_stock = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True) # current_stock field for optimized queryset

    class Meta:
        model = DimMaterial
        fields = [
            'material_id', 'material_name', 'material_type', 'unit_of_measure',
            'brand', 'color', 'size', 'discipline', 'current_stock' # Include nested discipline
        ]
        # Since 'managed = False' in models, we explicitly define fields.

# Serializer for DimTool
class ToolSerializer(serializers.ModelSerializer):
    discipline = DisciplineSerializer(read_only=True)

    class Meta:
        model = DimTool
        fields = '__all__' # Use '__all__' for simplicity or list specific fields
        # If using '__all__', ensure all fields are correctly mapped in the model.

# Serializer for DimDate (for FactTransactions)
class DateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DimDate
        fields = ['date_id', 'full_date'] # Only essential fields for transactions

# Serializer for FactInventoryTransactions
class FactInventoryTransactionsSerializer(serializers.ModelSerializer):
    # Nested serializers for foreign key relationships
    date = DateSerializer(read_only=True)
    material = MaterialSerializer(read_only=True) # Read-only for display
    tool = ToolSerializer(read_only=True)       # Read-only for display

    # For creating/updating, you might need Writeable Nested Serializers
    # or use PrimaryKeyRelatedField for material_id/tool_id directly.
    # For simplicity, we'll keep them read-only for now.

    class Meta:
        model = FactInventoryTransactions
        fields = [
            'transaction_id', 'date', 'material', 'tool',
            'quantity_change', 'cost_per_unit', 'total_cost',
            'transaction_type', 'notes'
        ]
