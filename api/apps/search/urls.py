from django.urls import path

from apps.search.views import ProfileSearchView


app_name = "search"

urlpatterns = [
    path("profiles/", ProfileSearchView.as_view(), name="profile-search"),
]