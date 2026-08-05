import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { API_BASE_URL, buildQueryString, cleanQueryParams } from "@/lib/api/client";

export function getApiClientDebugInfo() {
  return {
    baseUrl: API_BASE_URL,
    loginEndpoint: API_ENDPOINTS.auth.login,
    profileDetailEndpoint: API_ENDPOINTS.profiles.detail(1),
    searchQuery: buildQueryString({
      q: "bao cao",
      year: 2026,
      empty: "",
      deleted: null,
    }),
    cleanedParams: cleanQueryParams({
      q: "bao cao",
      year: 2026,
      empty: "",
      deleted: null,
    }),
  };
}