"""Suma a src/data/universidades-raw.json:

1. extranjeros2024: estudiantes extranjeros de pregrado y grado por universidad
   (Anuario SPU 2024, cuadro 2.1.25).
2. Notas con datos de ejecución del gasto por partida del Portal de Información de las
   Universidades Públicas (PIU, AGN — piu.agn.gob.ar), más su fuente.

Uso: python3 scripts/enriquecer_piu_extranjeros.py [ruta/al/anuario-2024-cap-2.1.xlsx]
El archivo scripts/piu_erogaciones.json se arma bajando los CSV "Erogaciones" del CKAN del PIU
(package_search?q=Erogaciones) y sumando el devengado por partida (millones de pesos corrientes).
Es idempotente: las notas PIU se marcan con el prefijo NOTA_PIU y se regeneran en cada corrida.
"""

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / 'src/data/universidades-raw.json'
PIU = RAIZ / 'scripts/piu_erogaciones.json'
ANUARIO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Desktop/Anuarios/2024/Z 2.1 Pregrado y Grado Gestión Estatal 24.xlsx'

# Nombre en el Anuario SPU → id interno.
ANUARIO_A_ID = {
    'Alto Uruguay': 'alto_uruguay', 'Artes': 'artes', 'Arturo Jauretche': 'jauretche', 'Avellaneda': 'undav',
    'Buenos Aires': 'uba', 'Catamarca': 'catamarca', 'Centro de la PBA': 'unicen', 'Chaco Austral': 'chaco_austral',
    'Chilecito': 'chilecito', 'Comahue': 'comahue', 'Comechingones': 'comechingones', 'Cuyo': 'cuyo',
    'Córdoba': 'cordoba', 'Defensa': 'defensa', 'Entre Ríos': 'entre_rios', 'Formosa': 'formosa',
    'Gral. Sarmiento': 'ungs', 'Guillermo Brown': 'guillermo_brown', 'Hurlingham': 'hurlingham',
    'José C. Paz': 'unpaz', 'Jujuy': 'jujuy', 'La Matanza': 'unlam', 'La Pampa': 'la_pampa', 'La Plata': 'unlp',
    'La Rioja': 'la_rioja', 'Lanús': 'lanus', 'Litoral': 'litoral', 'Lomas de Zamora': 'lomas', 'Luján': 'lujan',
    'Madres de Plaza de Mayo': 'madres_plaza_mayo', 'Mar del Plata': 'mar_del_plata', 'Misiones': 'misiones',
    'Moreno': 'moreno', 'Nordeste': 'nordeste', 'Noroeste de la PBA': 'unnoba', 'Oeste': 'oeste',
    'Patagonia Austral': 'patagonia_austral', 'Patagonia S. J. Bosco': 'patagonia_sjb', 'Pedagógica': 'pedagogica',
    'Quilmes': 'quilmes', 'Rafaela': 'rafaela', 'Rosario': 'rosario', 'Río Cuarto': 'rio_cuarto',
    'Río Negro': 'rio_negro', 'Salta': 'salta', 'San Antonio de Areco': 'san_antonio_areco', 'San Juan': 'san_juan',
    'San Luis': 'san_luis', 'San Martín': 'san_martin', 'Santiago del Estero': 'santiago',
    'Scalabrini Ortiz': 'unso', 'Sur': 'sur', 'Tecnológica Nacional': 'utn', 'Tierra del Fuego': 'tierra_del_fuego',
    'Tres de Febrero': 'tres_de_febrero', 'Tucumán': 'tucuman', 'Villa María': 'villa_maria',
    'Villa Mercedes': 'villa_mercedes',
}

# id interno → fragmento del nombre con que cada universidad se identifica en sus CSV del PIU.
PIU_NOMBRE = {
    'uba': 'Universidad de Buenos Aires', 'mar_del_plata': 'MAR DEL PLATA', 'quilmes': 'Quilmes', 'misiones': 'Misiones',
    'salta': 'Salta', 'tucuman': 'Tucumán', 'unnoba': 'Noroeste de Bue', 'la_pampa': 'LA PAMPA',
    'undav': 'Avellaneda', 'patagonia_sjb': 'Patagonia San', 'san_antonio_areco': 'San Antonio de A',
    'rafaela': 'Rafaela', 'tres_de_febrero': 'TRES DE FEBRERO', 'jauretche': 'Arturo Jauretche',
    'alto_uruguay': 'ALTO URUGUAY', 'unicen': 'Centro de la Pr', 'comechingones': 'Comechingone',
    'chaco_austral': 'Chaco Austral', 'sur': 'Nacional del Sur', 'san_juan': 'Universidad Nacional de San Juan', 'rosario': 'ROSARIO',
    'la_rioja': 'UNLAR', 'chilecito': 'Chilecito',
}

NOTA_PIU = 'Ejecución presupuestaria (PIU-AGN)'
FUENTE_PIU = {'titulo': 'Portal de Información de las Universidades Públicas (AGN) — ejecución del gasto', 'url': 'https://piu.agn.gob.ar/dataset/?q=Erogaciones'}


def m(v: float) -> str:
    """Millones con formato argentino: 6327.2 → '$6.327 millones', 29.4 → '$29,4 millones'."""
    if v >= 100:
        s = f'{v:,.0f}'.replace(',', '.')
    else:
        s = f'{v:,.1f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'${s} millones'


def veces(a: float, b: float) -> str:
    x = a / b
    return f'{x:.1f}'.replace('.', ',')


piu = json.load(open(PIU))


def fila(uid: str, anio: str, periodo: str = 'Anual') -> dict:
    frag = PIU_NOMBRE[uid].lower()
    # La Rioja publica con dos rótulos distintos según el año.
    unis = {r['uni'] for r in piu if frag in r['uni'].lower() or (frag == 'unlar' and 'la rioja' in r['uni'].lower())}
    if len(unis) != 1 and frag != 'unlar':
        raise KeyError(f'{uid}: "{frag}" matchea {unis}')
    for r in piu:
        if r['uni'] in unis and r['anio'] == anio and r['periodo'].startswith(periodo):
            return r
    raise KeyError(f'{uid} {anio} {periodo}')


def alim_vs_becas(uid, anio, periodo='Anual', aclaracion=''):
    r = fila(uid, anio, periodo)
    cuando = f'el primer semestre de {anio}' if periodo != 'Anual' else anio
    x = r['alim'] / r['becas']
    rel = 'más de lo que' if x < 1.5 else f'{veces(r["alim"], r["becas"])} veces lo que'
    return (f'{NOTA_PIU}: en {cuando} gastó {m(r["alim"])} en productos alimenticios{aclaracion} — '
            f'{rel} destinó a becas para estudiantes ({m(r["becas"])}).')


def viat_vs_becas(uid, anio):
    r = fila(uid, anio)
    return (f'{NOTA_PIU}: en {anio} ejecutó {m(r["viat"])} en pasajes y viáticos, '
            f'{veces(r["viat"], r["becas"])} veces más que en becas estudiantiles ({m(r["becas"])}).')


def pub_salto(uid, a0, a1):
    r0, r1 = fila(uid, a0), fila(uid, a1)
    return (f'{NOTA_PIU}: el gasto en publicidad y propaganda pasó de {m(r0["pub"])} en {a0} a {m(r1["pub"])} en {a1} '
            f'(×{veces(r1["pub"], r0["pub"])} en pesos corrientes, con una inflación anual muy por debajo de ese salto).')


def pub_vs_becas(uid, anio):
    r = fila(uid, anio)
    pct = round(r['pub'] / r['becas'] * 100)
    if pct >= 100:
        rel = f'{veces(r["pub"], r["becas"])} veces todo lo que destinó a becas ({m(r["becas"])})'
    else:
        rel = f'el equivalente al {pct}% de todo lo que destinó a becas ({m(r["becas"])})'
    return f'{NOTA_PIU}: en {anio} gastó {m(r["pub"])} en publicidad y propaganda, {rel}.'


def becas_caida(uid, a0, a1):
    r0, r1 = fila(uid, a0), fila(uid, a1)
    caida = round((1 - r1['becas'] / r0['becas']) * 100)
    return (f'{NOTA_PIU}: las becas estudiantiles cayeron de {m(r0["becas"])} en {a0} a {m(r1["becas"])} en {a1} '
            f'(-{caida}% aun sin descontar la inflación), mientras pasajes y viáticos subían de {m(r0["viat"])} a {m(r1["viat"])}.')


NOTAS = {
    'uba': [alim_vs_becas('uba', '2025', aclaracion=' (incluye comedores y hospitales universitarios)'), pub_salto('uba', '2024', '2025')],
    'mar_del_plata': [alim_vs_becas('mar_del_plata', '2024')],
    'quilmes': [alim_vs_becas('quilmes', '2025')],
    'misiones': [alim_vs_becas('misiones', '2025')],
    'salta': [alim_vs_becas('salta', '2025', 'I Sem')],
    'tucuman': [alim_vs_becas('tucuman', '2025')],
    'unnoba': [alim_vs_becas('unnoba', '2025'), viat_vs_becas('unnoba', '2025')],
    'la_pampa': [alim_vs_becas('la_pampa', '2025')],
    'undav': [viat_vs_becas('undav', '2025')],
    'patagonia_sjb': [viat_vs_becas('patagonia_sjb', '2025')],
    'san_antonio_areco': [viat_vs_becas('san_antonio_areco', '2025')],
    'rafaela': [viat_vs_becas('rafaela', '2025')],
    'tres_de_febrero': [viat_vs_becas('tres_de_febrero', '2024')],
    'jauretche': [viat_vs_becas('jauretche', '2024'), alim_vs_becas('jauretche', '2024')],
    'alto_uruguay': [pub_vs_becas('alto_uruguay', '2024'), viat_vs_becas('alto_uruguay', '2024')],
    'unicen': [alim_vs_becas('unicen', '2024'), pub_vs_becas('unicen', '2024')],
    'comechingones': [pub_vs_becas('comechingones', '2024')],
    'chaco_austral': [pub_vs_becas('chaco_austral', '2023')],
    'sur': [becas_caida('sur', '2024', '2025')],
    'san_juan': [pub_salto('san_juan', '2024', '2025')],
    'rosario': [pub_salto('rosario', '2024', '2025')],
    'la_rioja': [viat_vs_becas('la_rioja', '2024')],
    'chilecito': [viat_vs_becas('chilecito', '2023')],
}


def extranjeros_anuario() -> dict[str, int]:
    import openpyxl

    ws = openpyxl.load_workbook(ANUARIO, read_only=True, data_only=True)['C 2.1.25']
    out = {}
    for row in ws.iter_rows(values_only=True):
        vals = [c for c in row if c is not None]
        if len(vals) >= 3 and isinstance(vals[0], str) and vals[0].strip() in ANUARIO_A_ID and isinstance(vals[2], (int, float)):
            out[ANUARIO_A_ID[vals[0].strip()]] = int(vals[2])
    return out


def main():
    data = json.load(open(RAW))
    ext = extranjeros_anuario()
    faltan = [k for k, u in data.items() if u.get('tieneDatos') and k not in ext]
    print(f'extranjeros: {len(ext)} universidades; sin dato: {faltan}')
    for k, n in ext.items():
        data[k]['extranjeros2024'] = n

    for k, u in data.items():
        u['notas'] = [n for n in u['notas'] if not n.startswith(NOTA_PIU)] + NOTAS.get(k, [])
        fuentes = [f for f in u.get('fuentes', []) if f['url'] != FUENTE_PIU['url']]
        if k in NOTAS:
            fuentes.append(FUENTE_PIU)
        if fuentes:
            u['fuentes'] = fuentes
        elif 'fuentes' in u:
            del u['fuentes']

    json.dump(data, open(RAW, 'w'), ensure_ascii=False, indent=2)
    print(f'notas PIU: {sum(len(v) for v in NOTAS.values())} en {len(NOTAS)} universidades')


if __name__ == '__main__':
    main()
