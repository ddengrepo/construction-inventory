from django.db import models

# Create your models here.

from django.db import models

# DimDate Model
class DimDate(models.Model):
    date_id = models.IntegerField(primary_key=True)
    full_date = models.DateField()
    year = models.IntegerField()
    month_number = models.IntegerField()
    month_name = models.CharField(max_length=20)
    day_of_month = models.IntegerField()
    weekday_number = models.IntegerField()
    weekday_name = models.CharField(max_length=20)
    quarter_number = models.IntegerField(null=True, blank=True)
    quarter_name = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        managed = False # This model is not managed by Django migrations
        # It uses an existing table in the database
        db_table = 'dimdate' # Tells Django to use the existing 'dimdate' table
        verbose_name_plural = 'Dim Dates' # For admin interface readability

    def __str__(self):
        return str(self.full_date)

# DimDiscipline Model
class DimDiscipline(models.Model):
    discipline_id = models.AutoField(primary_key=True) # AutoField for SERIAL
    discipline_name = models.CharField(max_length=50, unique=True)
    discipline_description = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'dimdiscipline'
        verbose_name_plural = 'Dim Disciplines'

    def __str__(self):
        return self.discipline_name

# DimMaterial Model
class DimMaterial(models.Model):
    material_id = models.AutoField(primary_key=True) # AutoField for SERIAL
    material_name = models.CharField(max_length=100, unique=True)
    material_type = models.CharField(max_length=50, null=True, blank=True)
    unit_of_measure = models.CharField(max_length=20)
    brand = models.CharField(max_length=50, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)
    discipline = models.ForeignKey(DimDiscipline, on_delete=models.SET_NULL, null=True, blank=True) # Foreign Key

    class Meta:
        managed = False
        db_table = 'dimmaterial'
        verbose_name_plural = 'Dim Materials'

    def __str__(self):
        return self.material_name

# DimTool Model
class DimTool(models.Model):
    tool_id = models.AutoField(primary_key=True) # AutoField for SERIAL
    tool_name = models.CharField(max_length=100)
    tool_type = models.CharField(max_length=50, null=True, blank=True)
    brand = models.CharField(max_length=50, null=True, blank=True)
    model = models.CharField(max_length=50, null=True, blank=True)
    current_location = models.CharField(max_length=100, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    last_maintenance_date = models.DateField(null=True, blank=True)
    is_calibrated = models.BooleanField(default=False)
    discipline = models.ForeignKey(DimDiscipline, on_delete=models.SET_NULL, null=True, blank=True) # Foreign Key

    class Meta:
        managed = False
        db_table = 'dimtool'
        verbose_name_plural = 'Dim Tools'

    def __str__(self):
        return self.tool_name

# FactInventoryTransactions Model
class FactInventoryTransactions(models.Model):
    transaction_id = models.AutoField(primary_key=True) # AutoField for SERIAL
    date = models.ForeignKey(DimDate, on_delete=models.CASCADE) # Foreign Key
    material = models.ForeignKey(DimMaterial, on_delete=models.SET_NULL, null=True, blank=True) # Foreign Key
    tool = models.ForeignKey(DimTool, on_delete=models.SET_NULL, null=True, blank=True) # Foreign Key
    quantity_change = models.DecimalField(max_digits=10, decimal_places=2)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    transaction_type = models.CharField(max_length=50)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'factinventorytransactions'
        verbose_name_plural = 'Fact Inventory Transactions'
        # The CHECK constraint from SQL is typically handled at the application level in Django
        # or you can add it as a database constraint via a custom migration if truly needed.

    def __str__(self):
        return f"Transaction {self.transaction_id} on {self.date.full_date}"
    