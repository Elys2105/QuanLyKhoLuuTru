type ApiId = string | number;

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login/",
    logout: "/api/auth/logout/",
    me: "/api/auth/me/",
    changePassword: "/api/auth/change-password/",
  },

  dashboard: {
    summary: "/api/reports/dashboard/",
  },

  search: {
    profiles: "/api/search/profiles/",
  },

  archiveTree: {
    tree: "/api/archive-tree/",
    summary: "/api/archive-tree/summary/",
  },

  fonds: {
    list: "/api/fonds/",
    detail: (id: ApiId) => `/api/fonds/${id}/`,
  },

  catalogs: {
    list: "/api/catalogs/",
    detail: (id: ApiId) => `/api/catalogs/${id}/`,
  },

  warehouses: {
    list: "/api/storage-files/warehouses/",
    detail: (id: ApiId) => `/api/storage-files/warehouses/${id}/`,
  },

  storageLocations: {
    list: "/api/storage-files/storage-locations/",
    detail: (id: ApiId) => `/api/storage-files/storage-locations/${id}/`,
  },

  storageBoxes: {
    list: "/api/storage-files/storage-boxes/",
    detail: (id: ApiId) => `/api/storage-files/storage-boxes/${id}/`,
  },

  storageFiles: {
    list: "/api/storage-files/storage-files/",
    detail: (id: ApiId) => `/api/storage-files/storage-files/${id}/`,
  },

  profiles: {
    list: "/api/profiles/",
    detail: (id: ApiId) => `/api/profiles/${id}/`,
  },

  documents: {
    list: "/api/documents/",
    detail: (id: ApiId) => `/api/documents/${id}/`,
  },

  digitalFiles: {
    list: "/api/digital-files/",
    detail: (id: ApiId) => `/api/digital-files/${id}/`,
    preview: (id: ApiId) => `/api/digital-files/${id}/preview/`,
    download: (id: ApiId) => `/api/digital-files/${id}/download/`,
  },

  imports: {
    profileTemplate: "/api/imports/profiles/template/",
    profiles: "/api/imports/profiles/",
  },

  ocr: {
    list: "/api/ocr/",
    jobs: "/api/ocr/jobs/",
    jobDetail: (id: ApiId) => `/api/ocr/jobs/${id}/`,
    runForDigitalFile: (digitalFileId: ApiId) =>
      `/api/ocr/digital-files/${digitalFileId}/run/`,
    textForDigitalFile: (digitalFileId: ApiId) =>
      `/api/ocr/digital-files/${digitalFileId}/text/`,
    profileSuggestion: (digitalFileId: ApiId) =>
      `/api/ocr/digital-files/${digitalFileId}/profile-suggestion/`,
    search: "/api/ocr/search/",
  },

  audit: {
    list: "/api/audit-logs/",
    detail: (id: ApiId) => `/api/audit-logs/${id}/`,
  },

  exports: {
    profilesExcel: "/api/exports/profiles/excel/",
    profilesPdf: "/api/exports/profiles/pdf/",
  },

  schema: {
    openapi: "/api/schema/",
    swagger: "/api/docs/",
  },
} as const;

export type ApiEndpointGroup = keyof typeof API_ENDPOINTS;