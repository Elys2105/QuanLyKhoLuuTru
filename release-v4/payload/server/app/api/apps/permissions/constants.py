ROLE_ADMIN = "ADMIN"
ROLE_MANAGER = "MANAGER"
ROLE_STAFF = "STAFF"
ROLE_VIEWER = "VIEWER"


ALL_ROLES = [
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_VIEWER,
]


READ_ACTIONS = [
    "list",
    "retrieve",
]


WRITE_ACTIONS = [
    "create",
    "update",
    "partial_update",
]


DELETE_ACTIONS = [
    "destroy",
]


PDF_ACTIONS = [
    "preview",
    "download",
]