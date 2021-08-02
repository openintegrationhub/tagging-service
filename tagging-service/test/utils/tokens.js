const config = require('../../app/config');

const tenantId = '';

module.exports = {
  adminToken: {
    token: 'adminToken',
    value: {
      sub: 'TestAdmin',
      username: 'admin@example.com',
      role: 'ADMIN',
      permissions: ['all'],
      iat: 1337,
    },
  },

  guestToken: {
    token: 'guestToken',
    value: {
      sub: 'TestGuest',
      username: 'guest@example.com',
      permissions: ['templates.read', 'templates.write'],
      tenant: tenantId,
      iat: 1337,
      aud: 'Test_Audience',
      iss: 'Test_Issuer',
    },
  },

  permitToken: {
    token: 'permitToken',
    value: {
      sub: 'PermitGuy',
      username: 'admin@example.com',
      permissions: [
        config.taggingReadPermission,
        config.taggingReadPermission,
        config.taggingWritePermission,
      ],
      tenant: tenantId,
      iat: 1337,
    },
  },

  unpermitToken: {
    token: 'unpermitToken',
    value: {
      sub: 'UnpermitGuy',
      username: 'guest@example.com',
      tenant: tenantId,
      permissions: ['müsli.riegel', 'schoko.riegel'],
      iat: 1337,
    },
  },

  partpermitToken: {
    token: 'partpermitToken',
    value: {
      sub: 'PartpermitGuy',
      username: 'guest@example.com',
      tenant: tenantId,
      permissions: ['flows.read', 'templates.read', 'schoko.riegel'],
      iat: 1337,
    },
  },
};
