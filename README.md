# Auditorías Universitarias

Relevamiento independiente del estado de gestión de las universidades nacionales argentinas: matrícula, tasa de egreso (cohorte), planta docente y presupuesto ejecutado, a partir de los **Anuarios de Estadísticas Universitarias** de la Secretaría de Políticas Universitarias (SPU).

Un proyecto de [Universitarios por la Libertad](https://twitter.com/upl_arg).

## Qué incluye

- **Mapa interactivo** de universidades nacionales por provincia, con panel de indicadores al pasar el mouse y una capa (activable) de sedes regionales y facultades.
- **Pesos o dólares**: todos los montos en pesos constantes de agosto 2026 o en dólares al tipo de cambio oficial del día (dolarapi.com).
- **Gasto en estudiantes extranjeros**: presupuesto por estudiante × extranjeros del padrón (Anuario 2024) — el ahorro si se les cobrara arancel.
- **El sistema en números**: totales agregados (ponderados) de todo el sistema o de una provincia.
- **Rankings** por tasa de cohorte, estudiantes activos por docente, costo por graduado, reinscriptos sin materias aprobadas y no docentes por docente, filtrables por provincia.
- **Universidades kirchneristas**: las creadas por ley entre 2003 y 2023, comparadas contra el resto del sistema.
- **Ficha por universidad** con estudiantes, egresados, docentes, presupuesto, notas relevantes (irregularidades, contexto institucional) y sus fuentes.
- **Qué proponemos**: las cuatro propuestas de UPL y la propuesta central (Becas AvanzAR), cada una ligada al dato que la justifica.
- **Modo presentación** (`/presentacion`): diapositivas a pantalla completa con los datos en vivo, para exponer en paneles.

## URLs

Todas las URLs se arman en `src/lib/rutas.ts`:

| Página | URL |
|---|---|
| Mapa / una provincia | `/`, `/mapa/buenos-aires`, `/mapa/caba` |
| Universidad (por sigla) | `/universidades/uba` |
| Sede (se entra por link; Google indexa la ficha) | `/universidades/uba/sedes/cbc-tigre` |
| Rankings | `/rankings`, `/rankings/costo-por-graduado?provincia=buenos-aires` |
| Universidades kirchneristas | `/universidades-kirchneristas` |
| Propuestas | `/propuestas` |
| Presentación (no se indexa) | `/presentacion?s=3` |

Los links viejos con `#/` (QR impresos) redirigen solos a la URL nueva.

## Estado del relevamiento

Hay datos completos cargados para 59 de las 62 universidades nacionales. Las tres restantes (UNDELTA, UNPILAR y UNRT, creadas en 2023) todavía no informan datos al Anuario de la SPU y figuran en el mapa sin ficha de datos.

## Fuentes

- Anuarios de Estadísticas Universitarias 2017 / 2019 / 2023 / 2024 (SPU).
- Portal de Información de las Universidades Públicas (PIU, AGN): ejecución del gasto por partida, usada en las notas de cada ficha. `scripts/enriquecer_piu_extranjeros.py` regenera esas notas y los estudiantes extranjeros.
- Los datos de tasa de cohorte comparan egresados de un año con los nuevos inscriptos 6 años antes.
- Los promedios de grupos (sistema, provincia, universidades K vs. resto) están ponderados por tamaño: por ejemplo, la tasa de cohorte agregada es la suma de egresados sobre la suma de inscriptos, no el promedio de las tasas de cada universidad.
- La Universidad de la Defensa Nacional (UNDEF) queda fuera de los indicadores por docente y del costo por graduado: la SPU informa solo 34 docentes propios, porque la mayoría del plantel depende de las Fuerzas Armadas (y sus salarios no están en el presupuesto de la universidad).

## Desarrollo

```bash
npm install
npm run dev
```

## Build y deploy

```bash
npm run build    # vite build + prerender de cada URL (necesita Google Chrome instalado)
npm test         # verifica que cada sede y pin caiga dentro de su provincia
npm run deploy   # publica dist/ en GitHub Pages
```

`npm run build` genera un HTML por página (título, descripción y canónico propios, para Google), más
`sitemap.xml`, `robots.txt` y `404.html`.

## Dominio propio

1. Cambiar la URL en `sitio.json` (hoy `"https://upl-auditoriasuniversitarias.com/"`) y correr `npm run build && npm run deploy`. Eso actualiza la ruta base, los canónicos, el sitemap, el QR de la presentación y genera el archivo `CNAME`.
2. En el proveedor del dominio, cargar los DNS de GitHub Pages: cuatro registros `A` en la raíz → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, y un `CNAME` para `www` → `facugarces.github.io`.
3. En GitHub → Settings → Pages: verificar que figure el dominio y activar **Enforce HTTPS**. La dirección vieja de github.io redirige sola al dominio nuevo.
4. En Google Search Console: verificar el dominio y enviar `https://<dominio>/sitemap.xml`.

El build también sirve para un hosting Apache como Hostinger: subir el contenido de `dist/` a `public_html` (incluye el `.htaccess`).
