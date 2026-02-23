const jwt = require('jsonwebtoken');
const secret = 'super-secret-jwt-token-with-at-least-32-characters-long';

const serviceRoleToken = jwt.sign(
  {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (100 * 365 * 24 * 60 * 60), // 100 years
  },
  secret
);

console.log(serviceRoleToken);
