# Authentication

Authentication system for Modular Terrain Creator with role-based access control and per-user feature flags.

## Technical Stack

- **Auth library**: NextAuth.js (Auth.js)
- **Database**: MongoDB Atlas
- **Sessions**: JWT in httpOnly cookies
- **Deployment**: Vercel

## User Capabilities

### All Users
- Users can register with email and password
- Users receive email verification after registration
- Users can log in with verified email and password
- Users can reset their password via email link
- Users can create their own pieces, maps, templates, and props
- Users can access features based on their individual feature flags

### Admins
- Admins can view all registered users
- Admins can change any user's role (user/admin)
- Admins can enable/disable feature flags for any user
- Admins can delete user accounts
- Admins have access to all features regardless of feature flags

## Roles

| Role | Description |
|------|-------------|
| `admin` | Full access, user management, feature flag control |
| `user` | Standard access, features controlled by flags |

## Feature Flags

Simple per-user boolean flags stored on the user document.

| Flag | Description |
|------|-------------|
| `ai_toolkit` | Access to AI chat, layout suggestions, prop generation |
| `image_generation` | Access to FAL.ai image generation |
| `export_features` | Access to PDF export and reports |

Default flags for new users:
```json
{
  "ai_toolkit": true,
  "image_generation": true,
  "export_features": true
}
```

## User Model

```typescript
interface User {
  _id: ObjectId
  email: string              // unique, lowercase
  passwordHash: string       // bcrypt hashed
  role: 'admin' | 'user'
  emailVerified: boolean
  emailVerifyToken?: string
  passwordResetToken?: string
  passwordResetExpires?: Date
  featureFlags: {
    ai_toolkit: boolean
    image_generation: boolean
    export_features: boolean
  }
  createdAt: Date
  updatedAt: Date
}
```

## Authentication Flows

### Registration
1. User submits email + password
2. System validates email format and password strength (min 8 chars)
3. System creates user with `emailVerified: false`
4. System sends verification email with token link
5. User clicks link → `emailVerified: true`

### Login
1. User submits email + password
2. System verifies credentials and `emailVerified: true`
3. System creates JWT session in httpOnly cookie
4. User redirected to dashboard

### Password Reset
1. User requests reset with email
2. System generates reset token (expires in 1 hour)
3. System sends reset link via email
4. User clicks link → enters new password
5. Token invalidated after use

### Session Management
- JWT stored in httpOnly cookie
- Session expires after 7 days
- Refresh on activity (sliding window)

## Protected Routes

| Route Pattern | Access |
|---------------|--------|
| `/` | Public |
| `/login`, `/register` | Public (redirect if logged in) |
| `/designer/*` | Authenticated users |
| `/inventory/*` | Authenticated users |
| `/maps/*` | Authenticated users |
| `/settings` | Authenticated users |
| `/admin/*` | Admin role only |

## Feature Flag Checks

Components check feature flags before rendering:
```typescript
// Example usage
const { hasFeature } = useAuth()

if (!hasFeature('ai_toolkit')) {
  return <UpgradePrompt feature="AI Toolkit" />
}
```

## Constraints

- Email must be unique (case-insensitive)
- Password minimum 8 characters
- Email verification required before login
- Password reset tokens expire after 1 hour
- Failed login attempts rate-limited (5 per minute per IP)
- First registered user automatically becomes admin

## Related Specs

- [API Keys](./api-keys.md) - external API keys for AI services
- [AI Assistant](./ai-assistant.md) - feature controlled by `ai_toolkit` flag
- [Image Generation](./image-generation.md) - feature controlled by `image_generation` flag
- [Export System](./export.md) - feature controlled by `export_features` flag

## Source

- `src/lib/auth/` - auth utilities
- `src/app/api/auth/` - NextAuth routes
- `src/middleware.ts` - route protection
- `src/hooks/useAuth.ts` - auth hook
- `src/app/admin/` - admin dashboard
