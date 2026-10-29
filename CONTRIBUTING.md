# Contribuir a Lineup

Gracias por querer mejorar Lineup. Es un proyecto pequeño y con una idea fija: **una persona, un standup diario, una métrica**. Los cambios que lo mantienen simple son bienvenidos.

## Cómo empezar

```bash
nvm use                      # Node 22 (ver .nvmrc)
npm install
LINEUP_DEMO=1 npm run dev    # el panel sin Supabase, datos solo en tu navegador
```

Antes de abrir un PR:

```bash
npm run check                # guiones, lint y tipos
npm test                     # pruebas unitarias y de base de datos (PGlite)
```

## Reglas del repo

- **Sin guion largo ni guion medio** (los caracteres em dash y en dash) en ningún texto, código o comentario. `npm run check:dashes` lo verifica. Usa coma, dos puntos, punto, paréntesis o "a".
- **Textos**: se escriben en español, y ese texto es la llave. La traducción vive en `locales/en.json`. En la página se usa `tr("texto")`; en el servidor, `t(lang, "texto")`. Si agregas un texto, agrega su traducción: una prueba falla si falta. Para sumar un idioma, crea `locales/<xx>.json`, agrégalo en `lib/i18n.ts` y en el tipo `Lang` de `lib/config.ts`.
- **Nada personal en el código**: nombres, correos, dominios, precios o marcas van en `lineup.config.ts` o `profile.json`, nunca en la página ni en las rutas.
- **Un solo admin**. No agregamos usuarios, equipos ni permisos por persona. Si lo necesitas, haz un fork.
- **Seguridad primero**: toda ruta de `/api/lineup` revisa al admin por su cuenta, y la base de datos lo vuelve a revisar con RLS. No quites ninguna de las dos capas.
- Si cambias el esquema, agrega una migración nueva en `supabase/migrations/` y una prueba en `tests/db/`.

## Pull requests

Pequeños y con un motivo claro en la descripción. Si cambia lo que se ve, adjunta una captura.
