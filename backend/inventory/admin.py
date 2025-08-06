# backend/inventory/admin.py
from django.contrib import admin
# from .models import DimDate, DimDiscipline, DimMaterial, DimTool, FactInventoryTransactions # These are now MongoEngine Documents

# Django's admin site is designed for Django ORM models, not MongoEngine Documents.
# You cannot directly register MongoEngine Documents with admin.site.register().

# If you need to manage MongoDB data, consider using:
# 1. Mongo Express (already configured in your docker-compose.yml, usually at http://localhost:8081)
# 2. MongoDB Compass (a desktop GUI tool)
# 3. Custom Django admin views or a third-party package like django-mongoengine-admin (more complex)

# Commenting out or removing these lines will resolve the TypeError.
# admin.site.register(DimDate)
# admin.site.register(DimDiscipline)
# admin.site.register(DimMaterial)
# admin.site.register(DimTool)
# admin.site.register(FactInventoryTransactions)

# If you have any actual Django ORM models (e.g., if you're using Django's Auth system),
# you would register them here. For a pure MongoEngine backend, this file might be empty
# or only contain registrations for Django's built-in models if you customize them.