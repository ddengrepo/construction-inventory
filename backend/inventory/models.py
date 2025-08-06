# backend/inventory/models.py
from mongoengine import Document, fields, EmbeddedDocument

# MongoEngine does not use django.db.models.Model
# and does not require 'managed = False' in Meta.

# DimDate Model (MongoEngine Document)
class DimDate(Document):
    date_id = fields.IntField(primary_key=True)
    full_date = fields.DateField(required=True)
    year = fields.IntField(required=True)
    month_number = fields.IntField(required=True)
    month_name = fields.StringField(max_length=20, required=True)
    day_of_month = fields.IntField(required=True)
    weekday_number = fields.IntField(required=True)
    weekday_name = fields.StringField(max_length=20, required=True)
    quarter_number = fields.IntField()
    quarter_name = fields.StringField(max_length=20)

    meta = {
        'collection': 'DimDate', # Specifies the MongoDB collection name
        'indexes': [
            {'fields': ('full_date',), 'unique': True} # Example index
        ]
    }

    def __str__(self):
        return str(self.full_date)

# DimDiscipline Model (MongoEngine Document)
class DimDiscipline(Document):
    # Using SequenceField for auto-incrementing ID like SERIAL in PostgreSQL
    discipline_id = fields.SequenceField(primary_key=True)
    discipline_name = fields.StringField(max_length=50, unique=True, required=True)
    discipline_description = fields.StringField()

    meta = {
        'collection': 'DimDiscipline',
        'indexes': [
            {'fields': ('discipline_name',), 'unique': True}
        ]
    }

    def __str__(self):
        return self.discipline_name

# DimMaterial Model (MongoEngine Document - with image_url)
class DimMaterial(Document):
    material_id = fields.SequenceField(primary_key=True)
    material_name = fields.StringField(max_length=100, unique=True, required=True)
    material_type = fields.StringField(max_length=50)
    unit_of_measure = fields.StringField(max_length=20, required=True)
    brand = fields.StringField(max_length=50)
    color = fields.StringField(max_length=50)
    size = fields.StringField(max_length=50)
    # ReferenceField for relationships in MongoEngine
    discipline = fields.ReferenceField(DimDiscipline)
    image_url = fields.URLField(max_length=500, null=True) # ADDED: Field for image URL

    meta = {
        'collection': 'DimMaterial',
        'indexes': [
            {'fields': ('material_name',), 'unique': True},
            {'fields': ('discipline',)}
        ]
    }

    def __str__(self):
        return self.material_name

# DimTool Model (MongoEngine Document)
class DimTool(Document):
    tool_id = fields.SequenceField(primary_key=True)
    tool_name = fields.StringField(max_length=100, required=True)
    tool_type = fields.StringField(max_length=50)
    brand = fields.StringField(max_length=50)
    model = fields.StringField(max_length=50)
    current_location = fields.StringField(max_length=100)
    purchase_date = fields.DateField()
    last_maintenance_date = fields.DateField()
    is_calibrated = fields.BooleanField(default=False)
    discipline = fields.ReferenceField(DimDiscipline)

    meta = {
        'collection': 'DimTool',
        'indexes': [
            {'fields': ('tool_name',), 'unique': False}, # tool_name might not be unique
            {'fields': ('discipline',)}
        ]
    }

    def __str__(self):
        return self.tool_name

# FactInventoryTransactions Model (MongoEngine Document)
class FactInventoryTransactions(Document):
    # MongoDB typically uses _id, but SequenceField can simulate SERIAL
    transaction_id = fields.SequenceField(primary_key=True)
    date = fields.ReferenceField(DimDate, required=True)
    material = fields.ReferenceField(DimMaterial)
    tool = fields.ReferenceField(DimTool)
    quantity_change = fields.DecimalField(max_digits=10, decimal_places=2, required=True)
    cost_per_unit = fields.DecimalField(max_digits=10, decimal_places=2)
    total_cost = fields.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = fields.StringField(max_length=50, required=True)
    notes = fields.StringField()

    meta = {
        'collection': 'FactInventoryTransactions',
        'indexes': [
            {'fields': ('date',)},
            {'fields': ('material',)},
            {'fields': ('tool',)},
            # Compound index for efficient queries
            {'fields': ('date', 'material', 'tool')}
        ]
    }

    # Custom validation for the CHECK constraint equivalent
    def clean(self):
        if (self.material and self.tool) or (not self.material and not self.tool):
            raise fields.ValidationError('Either material or tool must be present, but not both.')

    def __str__(self):
        return f"Transaction {self.transaction_id} on {self.date.full_date}"
