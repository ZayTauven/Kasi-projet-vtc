-- Rôle admin avec toutes les permissions (sans lui, les authorizers
-- d'admin-api refusent l'accès à tous les écrans protégés).
INSERT INTO operator_role (title, permissions)
VALUES ('admin', ARRAY[
  'Drivers_View', 'Drivers_Edit',
  'Riders_View', 'Riders_Edit',
  'Regions_View', 'Regions_Edit',
  'Services_View', 'Services_Edit',
  'Complaints_View', 'Complaints_Edit',
  'Coupons_View', 'Coupons_Edit',
  'Announcements_View', 'Announcements_Edit',
  'Requests_View',
  'Fleets_View', 'Fleets_Edit',
  'Gateways_View', 'Gateways_Edit',
  'Users_View', 'Users_Edit',
  'Cars_View', 'Cars_Edit',
  'FleetWallet_View', 'FleetWallet_Edit',
  'ProviderWallet_View', 'ProviderWallet_Edit',
  'DriverWallet_View', 'DriverWallet_Edit',
  'RiderWallet_View', 'RiderWallet_Edit',
  'ReviewParameter_Edit'
]::operator_role_permissions_enum[]);

INSERT INTO operator ("firstName", "lastName", "userName", password, email, "enabledNotifications", "roleId")
VALUES ('Kasi', 'Admin', 'kasi@admin.com', 'P@ssword', 'kasi@admin.com',
        ARRAY['complaint', 'sos', 'driverSubmittedDocs']::operator_enablednotifications_enum[],
        (SELECT id FROM operator_role WHERE title = 'admin'));
