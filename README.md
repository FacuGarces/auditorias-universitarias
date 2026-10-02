# Auditorías Universitarias

Relevamiento independiente del estado de gestión de las universidades nacionales argentinas: matrícula, tasa de egreso (cohorte), planta docente y presupuesto ejecutado, a partir de los **Anuarios de Estadísticas Universitarias** de la Secretaría de Políticas Universitarias (SPU).

Un proyecto de [Universitarios por la Libertad](https://twitter.com/upl_arg).

## Qué incluye

- **Mapa interactivo** de sedes de universidades nacionales por provincia.
- **El sistema en números**: totales agregados (ponderados) de todo el sistema o de una provincia.
- **Rankings** por tasa de cohorte, estudiantes activos por docente, costo por graduado, reinscriptos sin materias aprobadas y no docentes por docente, filtrables por provincia.
- **Universidades kirchneristas**: las creadas por ley entre 2003 y 2023, comparadas contra el resto del sistema.
- **Ficha por universidad** con estudiantes, egresados, docentes, presupuesto, notas relevantes (irregularidades, contexto institucional) y sus fuentes.
- **Qué proponemos**: las propuestas de UPL, cada una ligada al dato que la justifica.
- **Modo presentación** (`#/presentacion`): diapositivas a pantalla completa con los datos en vivo, para exponer en paneles.

## Estado del relevamiento

Hay datos completos cargados para 59 de las 62 universidades nacionales. Las tres restantes (UNDELTA, UNPILAR y UNRT, creadas en 2023) todavía no informan datos al Anuario de la SPU y figuran en el mapa sin ficha de datos.

## Fuentes

- Anuarios de Estadísticas Universitarias 2017 / 2019 / 2023 / 2024 (SPU).
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
npm run build
npm run deploy
```
