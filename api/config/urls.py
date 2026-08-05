"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.storage.archive_tree_views import ArchiveTreeSummaryView, ArchiveTreeView


urlpatterns = [
    
    path("api/system/", include("apps.system.urls")),
    path("admin/", admin.site.urls),

    # Auth APIs
    path("api/auth/", include("apps.accounts.urls")),

    # Business CRUD APIs
     path("api/fonds/", include("apps.fonds.urls")),
    path("api/catalogs/", include("apps.catalogs.urls")),
    path("api/warehouses/", include("apps.storage.urls")),
    path("api/storage-locations/", include("apps.storage.urls")),
    path("api/storage-boxes/", include("apps.storage.urls")),
    path("api/storage-files/", include("apps.storage.urls")),
    path("api/profiles/", include("apps.profiles.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/digital-files/", include("apps.files.urls")),
    path("api/search/", include("apps.search.urls")),
    path("api/imports/", include("apps.imports.urls")),
    path("api/exports/", include("apps.exports.urls")),
    path("api/reports/", include("apps.reports.urls")),

    path("api/archive-tree/", ArchiveTreeView.as_view()),
    path("api/archive-tree/summary/", ArchiveTreeSummaryView.as_view()),

    path("api/ocr/", include("apps.ocr.urls")),
    path("api/audit-logs/", include("apps.audit.urls")),
    # API schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),

    # Swagger UI
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)