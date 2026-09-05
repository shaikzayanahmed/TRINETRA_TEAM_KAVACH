import os
from sqlalchemy import String
from geoalchemy2 import Geometry

# Check if native PostGIS backend is active (when running with PostgreSQL)
# Otherwise, for local development on SQLite, store spatial coordinates as strings without SpatiaLite requirement
if os.getenv("USE_POSTGRES", "false").lower() == "true":
    GeoPoint = Geometry("POINT", srid=4326)
    GeoGeometry = Geometry("GEOMETRY", srid=4326)
else:
    class GeoPoint(String):
        def __init__(self, *args, **kwargs):
            super().__init__(255)

    class GeoGeometry(String):
        def __init__(self, *args, **kwargs):
            super().__init__(1000)
