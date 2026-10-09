"""Test de datos: cada sede de src/data/sedes.ts y cada pin de universidad de mapa-estatico.json tiene
que caer DENTRO del polígono de su provincia en src/data/mapa-estatico.json (con la misma proyección que usa la app). Los contornos del mapa están
simplificados, así que una sede costera con coordenadas reales puede quedar en el agua: este test lo
detecta y sugiere la coordenada interior más cercana.

Uso: python3 scripts/verificar_sedes.py              (sale con código 1 si alguna sede queda afuera)
     python3 scripts/verificar_sedes.py --corregir    (reemplaza en sedes.ts las coordenadas sugeridas)
"""

import json
import math
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
mapa = json.load(open(RAIZ / 'src/data/mapa-estatico.json'))
fuente = (RAIZ / 'src/data/sedes.ts').read_text()

MX, BX, MY, BY = 19.594344, 1646.304948, -1122.63138, -417.173456
ALIAS = {'Ciudad Autónoma de Buenos Aires': 'Capital Federal'}


def proyectar(lat, lng):
    return MX * lng + BX, MY * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) + BY


def desproyectar(x, y):
    lng = (x - BX) / MX
    lat = math.degrees(2 * math.atan(math.exp((y - BY) / MY)) - math.pi / 2)
    return lat, lng


def anillos(d):
    out = []
    for parte in re.findall(r'M[^M]+', d):
        nums = list(map(float, re.findall(r'-?\d+(?:\.\d+)?', parte)))
        out.append(list(zip(nums[::2], nums[1::2])))
    return out


def adentro(x, y, rings):
    dentro = False
    for ring in rings:
        n = len(ring)
        for i in range(n):
            (x1, y1), (x2, y2) = ring[i], ring[i - 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                dentro = not dentro
    return dentro


def distancia_al_borde(x, y, rings):
    mejor = 1e9
    for ring in rings:
        for i in range(len(ring)):
            (x1, y1), (x2, y2) = ring[i], ring[i - 1]
            dx, dy = x2 - x1, y2 - y1
            t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy or 1)))
            mejor = min(mejor, math.hypot(x - x1 - t * dx, y - y1 - t * dy))
    return mejor


def punto_interior(x, y, rings):
    """Punto interior más cercano, buscado en espiral (paso relativo al tamaño de la provincia), con
    un margen para que no quede pegado al borde."""
    xs = [p[0] for r in rings for p in r]
    paso = (max(xs) - min(xs)) / 400
    for k in range(1, 400):
        for a in range(0, 360, 15):
            cx, cy = x + k * paso * math.cos(math.radians(a)), y + k * paso * math.sin(math.radians(a))
            if adentro(cx, cy, rings) and distancia_al_borde(cx, cy, rings) > paso * 3:
                return cx, cy
    return None


provincias = {p['nombre']: anillos(p['d']) for p in mapa['provincias']}
patron = re.compile(r"\['(\w+)', '([^']+)', '([^']+)', (BA|CABA|'[^']+'), (-?\d+\.?\d*), (-?\d+\.?\d*)\]")
CONST = {'BA': 'Buenos Aires', 'CABA': 'Capital Federal'}

sedes = patron.findall(fuente)
afuera = []
for uni, nombre, ciudad, prov, lat, lng in sedes:
    prov = CONST.get(prov, prov.strip("'"))
    prov = ALIAS.get(prov, prov)
    rings = provincias[prov]
    x, y = proyectar(float(lat), float(lng))
    if not adentro(x, y, rings):
        sug = punto_interior(x, y, rings)
        afuera.append((uni, nombre, prov, lat, lng, sug and desproyectar(*sug)))

# Pines de las universidades: se corrigen sus x/y en el mapa (lat/lng quedan con el dato real).
pines_afuera = []
for pin in mapa['pines']:
    rings = provincias[ALIAS.get(pin['provincia'], pin['provincia'])]
    if not adentro(pin['x'], pin['y'], rings):
        pines_afuera.append((pin, punto_interior(pin['x'], pin['y'], rings)))

if '--corregir' in sys.argv:
    for uni, nombre, prov, lat, lng, sug in afuera:
        if sug:
            fuente = re.sub(
                rf"(\['{uni}', '{re.escape(nombre)}', [^\]]*?), {re.escape(lat)}, {re.escape(lng)}\]",
                rf"\g<1>, {sug[0]:.4f}, {sug[1]:.4f}]",
                fuente,
            )
    (RAIZ / 'src/data/sedes.ts').write_text(fuente)
    for pin, sug in pines_afuera:
        if sug:
            pin['x'], pin['y'] = round(sug[0], 2), round(sug[1], 2)
    json.dump(mapa, open(RAIZ / 'src/data/mapa-estatico.json', 'w'), ensure_ascii=False, indent=2)
    print(f'corregidas {sum(1 for a in afuera if a[5])} sedes y {sum(1 for _, s in pines_afuera if s)} pines — volvé a correr sin --corregir para verificar')
    sys.exit(0)

print(f'{len(sedes)} sedes y {len(mapa["pines"])} pines verificados')
for uni, nombre, prov, lat, lng, sug in afuera:
    s = f'{sug[0]:.4f}, {sug[1]:.4f}' if sug else '—'
    print(f'AFUERA  {uni:18} {nombre[:45]:45} ({prov}) {lat},{lng}  → sugerido {s}')
for pin, sug in pines_afuera:
    print(f'AFUERA  pin {pin["id"]:14} ({pin["provincia"]}) x={pin["x"]} y={pin["y"]}  → sugerido {sug}')
sys.exit(1 if afuera or pines_afuera else 0)
