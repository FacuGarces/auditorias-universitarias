# Auditorías Universitarias

Relevamiento independiente del estado de gestión de las universidades nacionales argentinas: matrícula, tasa de egreso (cohorte), planta docente y presupuesto ejecutado, a partir de los **Anuarios de Estadísticas Universitarias** de la Secretaría de Políticas Universitarias (SPU).

Un proyecto de [Universitarios por la Libertad](https://twitter.com/upl_arg).

## Qué incluye

- **Mapa interactivo** de sedes de universidades nacionales por provincia.
- **Rankings** por tasa de cohorte, estudiantes por docente y costo por graduado.
- **Ficha por universidad** con estudiantes, egresados, docentes, presupuesto y notas relevantes (irregularidades, contexto institucional).

## Estado del relevamiento

Actualmente hay datos completos cargados para: UBA, UNLP, UNLaM, UNPAZ, UNAJ, UNGS, UNDAV y UNSO. El resto de las ~59 sedes universitarias nacionales relevadas figuran en el mapa con su ubicación pero sin ficha de datos todavía — se irán completando.

## Fuentes

- Anuarios de Estadísticas Universitarias 2017 / 2019 / 2023 / 2024 (SPU).
- Los datos de tasa de cohorte comparan egresados de un año con los nuevos inscriptos 6 años antes.

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
