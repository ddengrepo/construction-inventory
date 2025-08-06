from rest_framework import serializers
from .models import DimMaterial, DimDiscipline, DimTool, FactInventoryTransactions, DimDate

# Serializer for DimDiscipline
class DisciplineSerializer(serializers.Serializer): # Changed to serializers.Serializer
    discipline_id = serializers.IntegerField(read_only=True)
    discipline_name = serializers.CharField(max_length=50, required=True)
    discipline_description = serializers.CharField(allow_blank=True, required=False)

    def create(self, validated_data):
        return DimDiscipline.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.discipline_name = validated_data.get('discipline_name', instance.discipline_name)
        instance.discipline_description = validated_data.get('discipline_description', instance.discipline_description)
        instance.save()
        return instance

# Serializer for DimMaterial (with current_stock and explicit FK handling)
class MaterialSerializer(serializers.Serializer): # Changed to serializers.Serializer
    material_id = serializers.IntegerField(read_only=True)
    material_name = serializers.CharField(max_length=100, required=True)
    material_type = serializers.CharField(max_length=50, allow_blank=True, required=False)
    unit_of_measure = serializers.CharField(max_length=20, required=True)
    brand = serializers.CharField(max_length=50, allow_blank=True, required=False)
    color = serializers.CharField(max_length=50, allow_blank=True, required=False)
    size = serializers.CharField(max_length=50, allow_blank=True, required=False)
    # Read-only field for nested discipline data
    discipline = DisciplineSerializer(read_only=True)
    # Write-only field to accept discipline_id for creation/update
    discipline_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    current_stock = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    def create(self, validated_data):
        discipline_id = validated_data.pop('discipline_id', None)
        discipline_obj = None
        if discipline_id:
            try:
                discipline_obj = DimDiscipline.objects.get(discipline_id=discipline_id)
            except DimDiscipline.DoesNotExist:
                raise serializers.ValidationError({"discipline_id": "Discipline not found."})
        
        # Create the material, linking the discipline object
        material = DimMaterial.objects.create(discipline=discipline_obj, **validated_data)
        return material

    def update(self, instance, validated_data):
        discipline_id = validated_data.pop('discipline_id', None)
        if discipline_id is not None: # Check if discipline_id was provided
            try:
                discipline_obj = DimDiscipline.objects.get(discipline_id=discipline_id)
                instance.discipline = discipline_obj
            except DimDiscipline.DoesNotExist:
                raise serializers.ValidationError({"discipline_id": "Discipline not found."})
        elif 'discipline_id' in validated_data and discipline_id is None: # Allow setting to null
            instance.discipline = None

        instance.material_name = validated_data.get('material_name', instance.material_name)
        instance.material_type = validated_data.get('material_type', instance.material_type)
        instance.unit_of_measure = validated_data.get('unit_of_measure', instance.unit_of_measure)
        instance.brand = validated_data.get('brand', instance.brand)
        instance.color = validated_data.get('color', instance.color)
        instance.size = validated_data.get('size', instance.size)
        instance.save()
        return instance

# Serializer for DimTool
class ToolSerializer(serializers.Serializer): # Changed to serializers.Serializer
    tool_id = serializers.IntegerField(read_only=True)
    tool_name = serializers.CharField(max_length=100, required=True)
    tool_type = serializers.CharField(max_length=50, allow_blank=True, required=False)
    brand = serializers.CharField(max_length=50, allow_blank=True, required=False)
    model = serializers.CharField(max_length=50, allow_blank=True, required=False)
    current_location = serializers.CharField(max_length=100, allow_blank=True, required=False)
    purchase_date = serializers.DateField(required=False, allow_null=True)
    last_maintenance_date = serializers.DateField(required=False, allow_null=True)
    is_calibrated = serializers.BooleanField(required=False)
    discipline = DisciplineSerializer(read_only=True)
    discipline_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)


    def create(self, validated_data):
        discipline_id = validated_data.pop('discipline_id', None)
        discipline_obj = None
        if discipline_id:
            try:
                discipline_obj = DimDiscipline.objects.get(discipline_id=discipline_id)
            except DimDiscipline.DoesNotExist:
                raise serializers.ValidationError({"discipline_id": "Discipline not found."})
        
        tool = DimTool.objects.create(discipline=discipline_obj, **validated_data)
        return tool

    def update(self, instance, validated_data):
        discipline_id = validated_data.pop('discipline_id', None)
        if discipline_id is not None:
            try:
                discipline_obj = DimDiscipline.objects.get(discipline_id=discipline_id)
                instance.discipline = discipline_obj
            except DimDiscipline.DoesNotExist:
                raise serializers.ValidationError({"discipline_id": "Discipline not found."})
        elif 'discipline_id' in validated_data and discipline_id is None:
            instance.discipline = None

        instance.tool_name = validated_data.get('tool_name', instance.tool_name)
        instance.tool_type = validated_data.get('tool_type', instance.tool_type)
        instance.brand = validated_data.get('brand', instance.brand)
        instance.model = validated_data.get('model', instance.model)
        instance.current_location = validated_data.get('current_location', instance.current_location)
        instance.purchase_date = validated_data.get('purchase_date', instance.purchase_date)
        instance.last_maintenance_date = validated_data.get('last_maintenance_date', instance.last_maintenance_date)
        instance.is_calibrated = validated_data.get('is_calibrated', instance.is_calibrated)
        instance.save()
        return instance

# Serializer for DimDate (for FactTransactions)
class DateSerializer(serializers.Serializer): # Changed to serializers.Serializer
    date_id = serializers.IntegerField(read_only=True)
    full_date = serializers.DateField(required=True)
    year = serializers.IntegerField(required=True)
    month_number = serializers.IntegerField(required=True)
    month_name = serializers.CharField(max_length=20, required=True)
    day_of_month = serializers.IntegerField(required=True)
    weekday_number = serializers.IntegerField(required=True)
    weekday_name = serializers.CharField(max_length=20, required=True)
    quarter_number = serializers.IntegerField(required=False, allow_null=True)
    quarter_name = serializers.CharField(max_length=20, allow_blank=True, required=False)

    def create(self, validated_data):
        return DimDate.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.full_date = validated_data.get('full_date', instance.full_date)
        instance.year = validated_data.get('year', instance.year)
        instance.month_number = validated_data.get('month_number', instance.month_number)
        instance.month_name = validated_data.get('month_name', instance.month_name)
        instance.day_of_month = validated_data.get('day_of_month', instance.day_of_month)
        instance.weekday_number = validated_data.get('weekday_number', instance.weekday_number)
        instance.weekday_name = validated_data.get('weekday_name', instance.weekday_name)
        instance.quarter_number = validated_data.get('quarter_number', instance.quarter_number)
        instance.quarter_name = validated_data.get('quarter_name', instance.quarter_name)
        instance.save()
        return instance

# Serializer for FactInventoryTransactions
class FactInventoryTransactionsSerializer(serializers.Serializer): # Changed to serializers.Serializer
    transaction_id = serializers.IntegerField(read_only=True)
    # Nested serializers for read-only display
    date = DateSerializer(read_only=True)
    material = MaterialSerializer(read_only=True)
    tool = ToolSerializer(read_only=True)

    # Write-only fields for foreign key IDs during create/update
    date_id = serializers.IntegerField(write_only=True, required=True)
    material_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    tool_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    quantity_change = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    cost_per_unit = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True) # Calculated in backend
    transaction_type = serializers.CharField(max_length=50, required=True)
    notes = serializers.CharField(allow_blank=True, required=False)

    def validate(self, data):
        material_id = data.get('material_id')
        tool_id = data.get('tool_id')

        if (material_id is not None and tool_id is not None) or \
           (material_id is None and tool_id is None):
            raise serializers.ValidationError("Either material_id or tool_id must be present, but not both.")
        return data

    def create(self, validated_data):
        date_id = validated_data.pop('date_id')
        material_id = validated_data.pop('material_id', None)
        tool_id = validated_data.pop('tool_id', None)

        try:
            date_obj = DimDate.objects.get(date_id=date_id)
        except DimDate.DoesNotExist:
            raise serializers.ValidationError({"date_id": "Date not found."})

        material_obj = None
        if material_id:
            try:
                material_obj = DimMaterial.objects.get(material_id=material_id)
            except DimMaterial.DoesNotExist:
                raise serializers.ValidationError({"material_id": "Material not found."})

        tool_obj = None
        if tool_id:
            try:
                tool_obj = DimTool.objects.get(tool_id=tool_id)
            except DimTool.DoesNotExist:
                raise serializers.ValidationError({"tool_id": "Tool not found."})

        # Calculate total_cost
        quantity_change = validated_data.get('quantity_change')
        cost_per_unit = validated_data.get('cost_per_unit')
        if quantity_change is not None and cost_per_unit is not None:
            validated_data['total_cost'] = quantity_change * cost_per_unit
        else:
            validated_data['total_cost'] = 0 # Default if not calculable

        transaction = FactInventoryTransactions.objects.create(
            date=date_obj,
            material=material_obj,
            tool=tool_obj,
            **validated_data
        )
        return transaction

    def update(self, instance, validated_data):
        date_id = validated_data.pop('date_id', None)
        material_id = validated_data.pop('material_id', None)
        tool_id = validated_data.pop('tool_id', None)

        if date_id is not None:
            try:
                instance.date = DimDate.objects.get(date_id=date_id)
            except DimDate.DoesNotExist:
                raise serializers.ValidationError({"date_id": "Date not found."})

        if material_id is not None:
            try:
                instance.material = DimMaterial.objects.get(material_id=material_id)
            except DimMaterial.DoesNotExist:
                raise serializers.ValidationError({"material_id": "Material not found."})
        elif 'material_id' in validated_data and material_id is None:
            instance.material = None

        if tool_id is not None:
            try:
                instance.tool = DimTool.objects.get(tool_id=tool_id)
            except DimTool.DoesNotExist:
                raise serializers.ValidationError({"tool_id": "Tool not found."})
        elif 'tool_id' in validated_data and tool_id is None:
            instance.tool = None

        # Update other fields
        instance.quantity_change = validated_data.get('quantity_change', instance.quantity_change)
        instance.cost_per_unit = validated_data.get('cost_per_unit', instance.cost_per_unit)
        instance.transaction_type = validated_data.get('transaction_type', instance.transaction_type)
        instance.notes = validated_data.get('notes', instance.notes)

        # Recalculate total_cost
        qty = validated_data.get('quantity_change', instance.quantity_change)
        cost = validated_data.get('cost_per_unit', instance.cost_per_unit)
        if qty is not None and cost is not None:
            instance.total_cost = qty * cost
        else:
            instance.total_cost = 0

        instance.save()
        return instance
