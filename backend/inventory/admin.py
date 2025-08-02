from django.contrib import admin
from django.contrib import admin
from .models import DimDate, DimDiscipline, DimMaterial, DimTool, FactInventoryTransactions

# Register your models here.
admin.site.register(DimDate)
admin.site.register(DimDiscipline)
admin.site.register(DimMaterial)
admin.site.register(DimTool)
admin.site.register(FactInventoryTransactions)
