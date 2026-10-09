/**
 * Sedes regionales, facultades regionales y unidades académicas de las universidades nacionales que
 * funcionan fuera de la sede central (o, en la UBA y la UNLP, cada facultad por separado). Ubicación a
 * nivel ciudad — aproximada a la manzana en CABA y La Plata. No es un relevamiento exhaustivo: cubre
 * las universidades con mayor dispersión territorial.
 */
import mapaEstatico from './mapa-estatico.json'
import { universidades } from './universidades'

export interface Sede {
  id: string
  /** id de la universidad a la que pertenece (clave de universidades-raw.json). */
  universidad: string
  nombre: string
  ciudad: string
  provincia: string
  lat: number
  lng: number
  x: number
  y: number
}

type SedeRaw = [universidad: string, nombre: string, ciudad: string, provincia: string, lat: number, lng: number]

const BA = 'Buenos Aires'
const CABA = 'Ciudad Autónoma de Buenos Aires'

const RAW: SedeRaw[] = [
  // UBA — facultades
  ['uba', 'Facultad de Derecho', 'CABA', CABA, -34.5833, -58.3917],
  ['uba', 'Facultad de Ciencias Económicas', 'CABA', CABA, -34.5995, -58.3982],
  ['uba', 'Facultad de Medicina', 'CABA', CABA, -34.5975, -58.3972],
  ['uba', 'Facultad de Odontología', 'CABA', CABA, -34.5962, -58.3995],
  ['uba', 'Facultad de Farmacia y Bioquímica', 'CABA', CABA, -34.6001, -58.3996],
  ['uba', 'Facultad de Ingeniería', 'CABA', CABA, -34.6175, -58.368],
  ['uba', 'Facultad de Filosofía y Letras', 'CABA', CABA, -34.6237, -58.4385],
  ['uba', 'Facultad de Psicología', 'CABA', CABA, -34.611, -58.411],
  ['uba', 'Facultad de Ciencias Sociales', 'CABA', CABA, -34.6223, -58.3843],
  ['uba', 'Facultad de Ciencias Exactas y Naturales', 'CABA', CABA, -34.542, -58.4425],
  ['uba', 'Facultad de Arquitectura, Diseño y Urbanismo', 'CABA', CABA, -34.5408, -58.4455],
  ['uba', 'Facultad de Agronomía', 'CABA', CABA, -34.5925, -58.482],
  ['uba', 'Facultad de Ciencias Veterinarias', 'CABA', CABA, -34.5945, -58.487],
  // UNLP — facultades
  ['unlp', 'Facultad de Ciencias Exactas', 'La Plata', BA, -34.9065, -57.9445],
  ['unlp', 'Facultad de Ingeniería', 'La Plata', BA, -34.9055, -57.9405],
  ['unlp', 'Facultad de Arquitectura y Urbanismo', 'La Plata', BA, -34.9035, -57.9435],
  ['unlp', 'Facultad de Informática', 'La Plata', BA, -34.904, -57.937],
  ['unlp', 'Facultad de Ciencias Médicas', 'La Plata', BA, -34.913, -57.933],
  ['unlp', 'Facultad de Ciencias Veterinarias', 'La Plata', BA, -34.9105, -57.9315],
  ['unlp', 'Facultad de Ciencias Agrarias y Forestales', 'La Plata', BA, -34.9085, -57.9305],
  ['unlp', 'Facultad de Ciencias Naturales y Museo', 'La Plata', BA, -34.9095, -57.9375],
  ['unlp', 'Facultad de Ciencias Astronómicas y Geofísicas', 'La Plata', BA, -34.907, -57.9325],
  ['unlp', 'Facultad de Periodismo y Comunicación Social', 'La Plata', BA, -34.9145, -57.9365],
  ['unlp', 'Facultad de Odontología', 'La Plata', BA, -34.909, -57.9425],
  ['unlp', 'Facultad de Ciencias Jurídicas y Sociales', 'La Plata', BA, -34.914, -57.95],
  ['unlp', 'Facultad de Ciencias Económicas', 'La Plata', BA, -34.9128, -57.9528],
  ['unlp', 'Facultad de Artes', 'La Plata', BA, -34.9185, -57.958],
  ['unlp', 'Facultad de Trabajo Social', 'La Plata', BA, -34.925, -57.944],
  ['unlp', 'Facultad de Humanidades y Cs. de la Educación', 'Ensenada', BA, -34.9035, -57.9265],
  ['unlp', 'Facultad de Psicología', 'Ensenada', BA, -34.9025, -57.928],
  // UTN — facultades regionales
  ['utn', 'Facultad Regional Buenos Aires', 'CABA', CABA, -34.5986, -58.4202],
  ['utn', 'Facultad Regional Avellaneda', 'Villa Domínico', BA, -34.69, -58.329],
  ['utn', 'Facultad Regional Bahía Blanca', 'Bahía Blanca', BA, -38.7196, -62.2724],
  ['utn', 'Facultad Regional Delta', 'Campana', BA, -34.1683, -58.9542],
  ['utn', 'Facultad Regional General Pacheco', 'General Pacheco', BA, -34.4563, -58.6347],
  ['utn', 'Facultad Regional Haedo', 'Haedo', BA, -34.644, -58.5945],
  ['utn', 'Facultad Regional La Plata', 'Berisso', BA, -34.9, -57.925],
  ['utn', 'Facultad Regional San Nicolás', 'San Nicolás', BA, -33.3342, -60.2108],
  ['utn', 'Facultad Regional Trenque Lauquen', 'Trenque Lauquen', BA, -35.9706, -62.7333],
  ['utn', 'Facultad Regional Córdoba', 'Córdoba', 'Córdoba', -31.4425, -64.194],
  ['utn', 'Facultad Regional San Francisco', 'San Francisco', 'Córdoba', -31.4278, -62.0828],
  ['utn', 'Facultad Regional Villa María', 'Villa María', 'Córdoba', -32.4075, -63.2403],
  ['utn', 'Facultad Regional Rosario', 'Rosario', 'Santa Fe', -32.9545, -60.644],
  ['utn', 'Facultad Regional Santa Fe', 'Santa Fe', 'Santa Fe', -31.617, -60.675],
  ['utn', 'Facultad Regional Rafaela', 'Rafaela', 'Santa Fe', -31.2503, -61.4867],
  ['utn', 'Facultad Regional Reconquista', 'Reconquista', 'Santa Fe', -29.145, -59.645],
  ['utn', 'Facultad Regional Venado Tuerto', 'Venado Tuerto', 'Santa Fe', -33.7456, -61.9688],
  ['utn', 'Facultad Regional Paraná', 'Paraná', 'Entre Ríos', -31.7333, -60.5297],
  ['utn', 'Facultad Regional Concepción del Uruguay', 'Concepción del Uruguay', 'Entre Ríos', -32.4796, -58.2373],
  ['utn', 'Facultad Regional Concordia', 'Concordia', 'Entre Ríos', -31.3879, -58.0259],
  ['utn', 'Facultad Regional Resistencia', 'Resistencia', 'Chaco', -27.4556, -58.9789],
  ['utn', 'Facultad Regional Tucumán', 'San Miguel de Tucumán', 'Tucumán', -26.817, -65.199],
  ['utn', 'Facultad Regional La Rioja', 'La Rioja', 'La Rioja', -29.4131, -66.8558],
  ['utn', 'Facultad Regional Mendoza', 'Mendoza', 'Mendoza', -32.896, -68.853],
  ['utn', 'Facultad Regional San Rafael', 'San Rafael', 'Mendoza', -34.6127, -68.3251],
  ['utn', 'Facultad Regional Neuquén', 'Plaza Huincul', 'Neuquén', -38.926, -69.209],
  ['utn', 'Facultad Regional Chubut', 'Puerto Madryn', 'Chubut', -42.7742, -65.0435],
  ['utn', 'Facultad Regional Santa Cruz', 'Río Gallegos', 'Santa Cruz', -51.623, -69.2168],
  ['utn', 'Facultad Regional Tierra del Fuego', 'Río Grande', 'Tierra del Fuego', -53.7827, -67.7045],
  // Bonaerenses con sedes regionales
  ['unicen', 'Sede Olavarría', 'Olavarría', BA, -36.8927, -60.3225],
  ['unicen', 'Sede Azul', 'Azul', BA, -36.7769, -59.8585],
  ['unicen', 'Unidad de Enseñanza Quequén', 'Quequén', BA, -38.562, -58.706],
  ['lujan', 'Centro Regional San Miguel', 'San Miguel', BA, -34.5426, -58.712],
  ['lujan', 'Centro Regional Chivilcoy', 'Chivilcoy', BA, -34.8957, -60.0167],
  ['lujan', 'Centro Regional Campana', 'Campana', BA, -34.1633, -58.9592],
  ['unnoba', 'Sede Pergamino', 'Pergamino', BA, -33.8895, -60.5736],
  // Patagonia
  ['comahue', 'Centro Regional Universitario Bariloche', 'San Carlos de Bariloche', 'Río Negro', -41.1335, -71.3103],
  ['comahue', 'Facultad de Ciencias de la Educación', 'Cipolletti', 'Río Negro', -38.9339, -67.9903],
  ['comahue', 'Facultad de Economía y Administración (sede Roca)', 'General Roca', 'Río Negro', -39.0333, -67.5833],
  ['comahue', 'Centro Universitario Regional Zona Atlántica', 'Viedma', 'Río Negro', -40.8135, -62.9967],
  ['comahue', 'Asentamiento Universitario Villa Regina', 'Villa Regina', 'Río Negro', -39.1, -67.0833],
  ['comahue', 'Facultad de Ciencias Agrarias', 'Cinco Saltos', 'Río Negro', -38.8222, -68.0628],
  ['comahue', 'Asentamiento Universitario Zapala', 'Zapala', 'Neuquén', -38.8992, -70.0544],
  ['comahue', 'Asentamiento Universitario San Martín de los Andes', 'San Martín de los Andes', 'Neuquén', -40.1572, -71.3534],
  ['comahue', 'Centro Regional Chos Malal', 'Chos Malal', 'Neuquén', -37.3781, -70.2706],
  ['rio_negro', 'Sede Andina', 'San Carlos de Bariloche', 'Río Negro', -41.1385, -71.3053],
  ['rio_negro', 'Sede Andina (El Bolsón)', 'El Bolsón', 'Río Negro', -41.9645, -71.535],
  ['rio_negro', 'Sede Atlántica', 'Viedma', 'Río Negro', -40.8085, -62.9917],
  ['rio_negro', 'Sede Alto Valle (Villa Regina)', 'Villa Regina', 'Río Negro', -39.095, -67.0783],
  ['rio_negro', 'Sede Alto Valle (Cipolletti)', 'Cipolletti', 'Río Negro', -38.9389, -67.9853],
  ['patagonia_sjb', 'Sede Trelew', 'Trelew', 'Chubut', -43.2489, -65.3051],
  ['patagonia_sjb', 'Sede Puerto Madryn', 'Puerto Madryn', 'Chubut', -42.7692, -65.0385],
  ['patagonia_sjb', 'Sede Esquel', 'Esquel', 'Chubut', -42.9115, -71.3195],
  ['patagonia_austral', 'Unidad Académica Caleta Olivia', 'Caleta Olivia', 'Santa Cruz', -46.4393, -67.5281],
  ['patagonia_austral', 'Unidad Académica San Julián', 'Puerto San Julián', 'Santa Cruz', -49.3069, -67.7274],
  ['patagonia_austral', 'Unidad Académica Río Turbio', 'Río Turbio', 'Santa Cruz', -51.5353, -72.3374],
  ['tierra_del_fuego', 'Sede Río Grande', 'Río Grande', 'Tierra del Fuego', -53.7877, -67.7095],
  // Cuyo
  ['cuyo', 'Facultad de Ciencias Aplicadas a la Industria', 'San Rafael', 'Mendoza', -34.6177, -68.3301],
  ['cuyo', 'Sede Malargüe', 'Malargüe', 'Mendoza', -35.4752, -69.5853],
  ['cuyo', 'Instituto Balseiro', 'San Carlos de Bariloche', 'Río Negro', -41.1265, -71.4215],
  ['san_luis', 'Facultad de Ingeniería y Cs. Agropecuarias', 'Villa Mercedes', 'San Luis', -33.6807, -65.4628],
  ['la_rioja', 'Sede Regional Chamical', 'Chamical', 'La Rioja', -30.36, -66.3136],
  ['la_rioja', 'Sede Regional Aimogasta', 'Aimogasta', 'La Rioja', -28.5606, -66.8086],
  ['la_rioja', 'Sede Regional Chepes', 'Chepes', 'La Rioja', -31.3459, -66.6007],
  ['la_rioja', 'Sede Regional Villa Unión', 'Villa Unión', 'La Rioja', -29.3144, -68.2236],
  // Centro y Litoral
  ['rosario', 'Facultad de Ciencias Veterinarias', 'Casilda', 'Santa Fe', -33.0442, -61.1681],
  ['rosario', 'Facultad de Ciencias Agrarias', 'Zavalla', 'Santa Fe', -33.0186, -60.8869],
  ['litoral', 'Facultades de Ciencias Agrarias y Veterinarias', 'Esperanza', 'Santa Fe', -31.4488, -60.9317],
  ['litoral', 'Sede Reconquista-Avellaneda', 'Reconquista', 'Santa Fe', -29.15, -59.65],
  ['litoral', 'Sede Regional Gálvez', 'Gálvez', 'Santa Fe', -32.0293, -61.2209],
  ['entre_rios', 'Sede Concepción del Uruguay', 'Concepción del Uruguay', 'Entre Ríos', -32.4846, -58.2323],
  ['entre_rios', 'Sede Concordia', 'Concordia', 'Entre Ríos', -31.3929, -58.0209],
  ['entre_rios', 'Facultad de Ciencias de la Gestión', 'Gualeguaychú', 'Entre Ríos', -33.0094, -58.5172],
  ['entre_rios', 'Facultades de Ingeniería y Cs. Agropecuarias', 'Oro Verde', 'Entre Ríos', -31.825, -60.517],
  ['entre_rios', 'Facultad de Ciencias de la Alimentación (sede Villaguay)', 'Villaguay', 'Entre Ríos', -31.8653, -59.0269],
  ['la_pampa', 'Sede General Pico', 'General Pico', 'La Pampa', -35.6566, -63.7568],
  ['villa_maria', 'Sede Córdoba', 'Córdoba', 'Córdoba', -31.4201, -64.1888],
  ['villa_maria', 'Sede Villa del Rosario', 'Villa del Rosario', 'Córdoba', -31.5532, -63.5347],
  // NEA y NOA
  ['nordeste', 'Campus Resistencia', 'Resistencia', 'Chaco', -27.4606, -58.9839],
  ['nordeste', 'Sede Paso de los Libres', 'Paso de los Libres', 'Corrientes', -29.7125, -57.0877],
  ['misiones', 'Facultad de Ingeniería y Facultad de Arte', 'Oberá', 'Misiones', -27.4871, -55.1199],
  ['misiones', 'Facultad de Ciencias Forestales', 'Eldorado', 'Misiones', -26.4084, -54.6944],
  ['salta', 'Sede Regional Tartagal', 'Tartagal', 'Salta', -22.5164, -63.8013],
  ['salta', 'Sede Regional Orán', 'San Ramón de la Nueva Orán', 'Salta', -23.1322, -64.3264],
  ['salta', 'Sede Regional Sur (Metán)', 'San José de Metán', 'Salta', -25.4994, -64.9772],
  // UNDEF — facultades militares
  ['defensa', 'Facultad del Ejército (Colegio Militar)', 'El Palomar', BA, -34.6108, -58.5933],
  ['defensa', 'Facultad de la Armada (Escuela Naval)', 'Río Santiago', BA, -34.858, -57.905],
  ['defensa', 'Facultad de la Fuerza Aérea (Escuela de Aviación)', 'Córdoba', 'Córdoba', -31.44, -64.25],
]

// Misma proyección (Mercator) que generó las coordenadas de mapa-estatico.json: ajustada contra
// sus pines con un error máximo de ~0,03 unidades.
const MX = 19.594344
const BX = 1646.304948
const MY = -1122.63138
const BY = -417.173456

export function proyectar(lat: number, lng: number) {
  const merc = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  return { x: MX * lng + BX, y: MY * merc + BY }
}

export const sedes: Sede[] = RAW.filter(([u]) => universidades[u]).map(([universidad, nombre, ciudad, provincia, lat, lng], i) => ({
  id: `${universidad}-${i}`,
  universidad,
  nombre,
  ciudad,
  provincia,
  lat,
  lng,
  ...proyectar(lat, lng),
}))

// Chequeo de cordura en desarrollo: la proyección tiene que caer sobre los pines existentes.
if (import.meta.env.DEV) {
  const pin = (mapaEstatico as { pines: { id: string; lat: number; lng: number; x: number; y: number }[] }).pines.find((p) => p.id === 'uba')
  if (pin) {
    const p = proyectar(pin.lat, pin.lng)
    if (Math.hypot(p.x - pin.x, p.y - pin.y) > 0.2) console.warn('sedes: la proyección no coincide con mapa-estatico.json', p, pin)
  }
}
