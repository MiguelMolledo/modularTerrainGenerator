# 🚀 Production Deployment Guide

> **Actualizado 2026-09-23.** La app vive en el **proyecto Supabase compartido
> DndMaster** (`neklxghwqtjinyufnhxh`, Frankfurt), dentro del schema
> **`terrain`**. Hasta esa fecha estaba en `vwfesurfvemlfkhmiiuq` (el proyecto
> de GymStats), que se retira. La autenticación es **email/password**; Google
> OAuth queda oculto tras el flag `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`.

## Arquitectura del proyecto compartido

| App | Schema | Notas |
|-----|--------|-------|
| rolApp (DndMaster) | `public` | La app principal del proyecto: **no tocar su schema**. Registro público desactivado |
| GymStats | `gymstats` | Trigger `on_auth_user_created_gymstats` |
| FamilyExpenses | `family` | SQL aplicado por psql, sin historial de migraciones |
| Modular Terrain Creator | `terrain` | Trigger `on_auth_user_created_terrain` |

`auth.users` es compartido. Como el registro público está desactivado, el alta
se hace en el servidor (`src/app/signup/actions.ts`, con
`SUPABASE_SERVICE_ROLE_KEY`) y el usuario se marca con `app = "terrain"` en
`app_metadata` y en `user_metadata`. Cada trigger de alta solo actúa sobre los
usuarios de su app (miran `user_metadata`, porque `admin.createUser` escribe
`app_metadata` después del INSERT), y rolApp niega la sesión a cualquier
usuario con `app_metadata.app`. Cada app aísla sus datos por RLS en su schema.

## Estado de la base de datos hosted

El esquema se copió tal cual desde el proyecto anterior (2026-09-23). Para
cambios futuros de esquema: crear la migración local y aplicarla al hosted con
psql, **solo** sobre objetos de `terrain`:

```bash
psql "host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres \
  user=postgres.neklxghwqtjinyufnhxh sslmode=require" \
  -1 -v ON_ERROR_STOP=1 -f supabase/migrations/<nueva-migracion>.sql
```

**Nunca** usar `supabase db push` ni `supabase link` desde este repo contra ese
proyecto: mezclaría el historial de migraciones con el de rolApp.

⚠️ La migración del test user (`20260729000100_create_test_user.sql`) es
**solo para local** — no aplicarla al hosted.

El schema `terrain` ya está expuesto en la API (Exposed schemas).

## Deploy a Vercel

`vercel --prod` desde este repo. Variables de entorno:

```env
NEXT_PUBLIC_SUPABASE_URL=https://neklxghwqtjinyufnhxh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del proyecto>
SUPABASE_SERVICE_ROLE_KEY=<service_role key del proyecto>  # alta de usuarios
INVITE_CODE=<código que exige el registro>  # el alta con service role se salta los límites de Auth
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
   `https://neklxghwqtjinyufnhxh.supabase.co/auth/v1/callback`
4. Sacar la OAuth consent screen de testing mode si hace falta

## Verificación post-deploy

- [ ] Usuario sin sesión → redirigido a `/login`
- [ ] Signup sin código de invitación válido → «Invalid invite code»
- [ ] Signup con email/password crea fila en `terrain.profiles` (y ninguna en `public.profiles` de rolApp)
- [ ] Login funciona y aparece el botón de sign out
- [ ] Guardar un mapa crea fila en `terrain.maps` con `user_id` propio
- [ ] Otro usuario no ve tus mapas (RLS)
- [ ] El botón de Google NO aparece
