# 🚀 Production Deployment Guide

> **Actualizado 2026-07-29.** El proyecto Supabase original fue eliminado. La app
> vive ahora en el **proyecto Supabase compartido** `vwfesurfvemlfkhmiiuq`
> (el mismo que GymStats y FamilyExpenses), dentro del schema **`terrain`**.
> La autenticación es **email/password**; Google OAuth queda oculto tras el
> flag `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`.

## Arquitectura del proyecto compartido

| App | Schema | Notas |
|-----|--------|-------|
| GymStats | `public` | Trigger `on_auth_user_created` (solo crea perfil si hay `username` en metadata) |
| FamilyExpenses | `family` | SQL aplicado por psql, sin historial de migraciones |
| Modular Terrain Creator | `terrain` | Trigger `on_auth_user_created_terrain` (crea perfil para todo signup, `ON CONFLICT DO NOTHING`) |

Los usuarios de `auth.users` se comparten entre las tres apps: cualquier
cuenta existente puede entrar en terrain (los perfiles se backfillearon al
migrar). Cada app aísla sus datos por RLS dentro de su schema.

## Estado de la base de datos hosted

El baseline `supabase/migrations/20260729000000_terrain_schema_baseline.sql`
**ya está aplicado** (2026-07-29) vía psql, sin tocar el historial de
migraciones del proyecto (que pertenece a GymStats). Para cambios futuros de
esquema: crear la migración local y aplicarla al hosted con psql:

```bash
# Password: SUPABASE_DB_PASSWORD en ~/Code/GymStats/.env.local
psql "host=aws-0-eu-west-3.pooler.supabase.com port=5432 dbname=postgres \
  user=postgres.vwfesurfvemlfkhmiiuq sslmode=require" \
  -1 -v ON_ERROR_STOP=1 -f supabase/migrations/<nueva-migracion>.sql
```

**No** usar `supabase db push` desde este repo: mezclaría el historial de
migraciones con el de GymStats.

⚠️ La migración del test user (`20260729000100_create_test_user.sql`) es
**solo para local** — no aplicarla al hosted.

## ⚠️ Paso manual pendiente: exponer el schema `terrain` en la API

Una sola vez, en el dashboard (igual que se hizo con `family`):

1. https://supabase.com/dashboard/project/vwfesurfvemlfkhmiiuq/settings/api
2. **API Settings** → **Exposed schemas** → añadir `terrain`
3. Guardar

Sin esto, la app en producción no puede leer sus tablas (error PGRST106).

## Deploy a Vercel

Variables de entorno:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vwfesurfvemlfkhmiiuq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xhRXWvqVfcmO28qM2_qv6A__J66vtan
OPENROUTER_API_KEY=<tu key>
FAL_KEY=<tu key>
```

No hacen falta `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` mientras Google
OAuth siga desactivado.

## Reactivar Google OAuth en el futuro (opcional)

El código sigue en `login/page.tsx` y `signup/page.tsx`, oculto tras el flag:

1. `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` en el entorno
2. Supabase Dashboard → Authentication → Providers → Google: habilitar y poner
   client ID/secret
3. En Google Cloud Console, añadir el redirect URI:
   `https://vwfesurfvemlfkhmiiuq.supabase.co/auth/v1/callback`
4. Sacar la OAuth consent screen de testing mode si hace falta

## Verificación post-deploy

- [ ] Usuario sin sesión → redirigido a `/login`
- [ ] Signup con email/password crea fila en `terrain.profiles`
- [ ] Login funciona y aparece el botón de sign out
- [ ] Guardar un mapa crea fila en `terrain.maps` con `user_id` propio
- [ ] Otro usuario no ve tus mapas (RLS)
- [ ] El botón de Google NO aparece
