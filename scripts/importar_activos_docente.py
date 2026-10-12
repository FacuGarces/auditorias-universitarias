"""Carga en universidades-raw.json los estudiantes sin materias aprobadas y los estudiantes activos por
cargo docente desde public/fuentes/estudiantes-activos-por-docente-2024.xlsx (Anuario SPU 2024,
cuadros 2.1.10, 2.1.28a y RHUN 4.4). El Excel se publica tal cual como fuente de la página.

    python3 scripts/importar_activos_docente.py
"""
import json
import re
import unicodedata
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
EXCEL = RAIZ / 'public/fuentes/estudiantes-activos-por-docente-2024.xlsx'
JSON = RAIZ / 'src/data/universidades-raw.json'

# Nombres del anuario que no salen de recortar "Universidad Nacional de ..." del nombre del sitio.
ALIAS = {
    'Centro de la PBA': 'unicen',
    'Noroeste de la PBA': 'unnoba',
    'Defensa': 'defensa',
    'Gral. Sarmiento': 'ungs',
    'Patagonia S. J. Bosco': 'patagonia_sjb',
    'Pedagógica': 'pedagogica',
    'Tecnológica Nacional': 'utn',
    'Buenos Aires': 'uba',
}


def clave(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'^universidad (nacional )?(del |de )?', '', s)
    s = re.sub(r'^(la|las|los) ', '', s)
    return re.sub(r'[^a-z0-9]', '', s)


def filas(ws, desde: int, col: int = 0):
    """(nombre, celdas desde la columna del nombre) de cada fila con nombre."""
    for r in ws.iter_rows(min_row=desde, values_only=True):
        if r[col]:
            yield str(r[col]).strip(), r[col:]


def num(v):
    return v if isinstance(v, (int, float)) else None


def main():
    wb = openpyxl.load_workbook(EXCEL, data_only=True)
    resumen = {n: r for n, r in filas(wb['Por universidad'], 4) if num(r[1]) is not None or r[1] == 'S/D'}
    # Columna "1" (una sola materia aprobada) de cada cuadro fuente, para el desglose 0 / 1 / 2+.
    # Cuadros copiados en la columna B: nombre, total, 0, 1, 2, ...
    una_reins = {n: num(r[3]) for n, r in filas(wb['Fuente C 2.1.10'], 6, col=1)}
    una_nuevos = {n: num(r[3]) for n, r in filas(wb['Fuente C 2.1.28a'], 6, col=1)}

    datos = json.loads(JSON.read_text())
    por_clave = {clave(u['nombre']): id_ for id_, u in datos.items()}

    vistos = set()
    for nombre, r in resumen.items():
        id_ = ALIAS.get(nombre) or por_clave.get(clave(nombre))
        if id_ is None:
            raise SystemExit(f'Sin universidad en el sitio para "{nombre}"')
        vistos.add(id_)
        u = datos[id_]
        reins, nuevos, sin_materias, activos, cargos = num(r[1]), num(r[5]), num(r[9]), num(r[11]), num(r[12])
        una = (una_reins.get(nombre) or 0) + (una_nuevos.get(nombre) or 0) if reins is not None else None
        u['inscriptos2024'] = reins + nuevos if reins is not None and nuevos is not None else None
        u['sinMaterias2024'] = sin_materias
        u['unaMateria2024'] = una
        u['estudiantesActivos2024'] = activos
        u['cargosDocentes2024'] = cargos
        u['estudiantesActivosPorDocente'] = round(activos / cargos, 1) if activos and cargos else None

    for id_, u in datos.items():
        # Reemplazados por los campos de arriba: el viejo cociente dividía la matrícula total (o solo los
        # regulares) por personas docentes, no por cargos.
        u.pop('estudiantesPorDocente', None)
        u.pop('reinscriptosRegulares2mas', None)
        if id_ not in vistos:
            for campo in ('inscriptos2024', 'sinMaterias2024', 'unaMateria2024', 'estudiantesActivos2024',
                          'cargosDocentes2024', 'estudiantesActivosPorDocente'):
                u.pop(campo, None)
            print(f'{id_}: no figura en el Excel')

    JSON.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(vistos)} universidades actualizadas')


if __name__ == '__main__':
    main()
