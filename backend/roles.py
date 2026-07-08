"""Role constants + permission matrix for the 7 roles."""
ROLES = ["super_admin", "admin", "dealer", "sales", "presales", "consultant", "customer"]

ROLE_LABELS = {
    "super_admin": "Super Admin",
    "admin": "Admin",
    "dealer": "Dealer",
    "sales": "Sales",
    "presales": "Presales Engineer",
    "consultant": "Consultant",
    "customer": "Customer",
}

# Permission catalog
PERMISSIONS = {
    "manage_users": {"super_admin", "admin"},
    "manage_products": {"super_admin", "admin"},
    "manage_controllers": {"super_admin", "admin"},
    "manage_pricing": {"super_admin", "admin"},
    "view_all_quotes": {"super_admin", "admin", "sales"},
    "create_quote": {"super_admin", "admin", "dealer", "sales", "presales", "consultant"},
    "delete_quote": {"super_admin", "admin"},
    "manage_customers": {"super_admin", "admin", "dealer", "sales"},
    "manage_partners": {"super_admin", "admin"},
    "manage_projects": {"super_admin", "admin", "sales", "presales"},
    "ai_features": {"super_admin", "admin", "dealer", "sales", "presales", "consultant"},
    "view_dashboard": {"super_admin", "admin", "dealer", "sales", "presales", "consultant"},
    "view_dealer_portal": {"super_admin", "admin", "dealer"},
}


def has_permission(role: str, perm: str) -> bool:
    return role in PERMISSIONS.get(perm, set())
