export const EL_CRUCE_SLUG = 'cafebarelcruce'
export const EL_CRUCE_PUBLIC_URL = 'https://cafebarelcruce.eccofoodapp.com'
export const EL_CRUCE_PHONE = '624391875'
export const EL_CRUCE_EMAIL = 'barelcruce.palmar@gmail.com'
export const EL_CRUCE_ADDRESS = 'Carr. Mazarron, 9, 30120 El Palmar, Murcia'

export const EL_CRUCE_KEYWORDS = [
  'Cafe Bar El Cruce',
  'Cafe Bar El Cruce El Palmar',
  'bar El Palmar',
  'bar restaurante El Palmar',
  'desayunos El Palmar',
  'tapas El Palmar',
  'bocadillos El Palmar',
  'raciones El Palmar',
  'cafeteria El Palmar Murcia',
  'marineras Murcia',
  'tapas murcianas El Palmar',
  'bar frente a DCORASIA',
  'bar cerca Hospital Arrixaca',
]

export const EL_CRUCE_LOCAL_PAGES = [
  {
    slug: 'desayunos-el-palmar',
    title: 'Desayunos en El Palmar | Cafe Bar El Cruce',
    h1: 'Desayunos en El Palmar',
    description:
      'Cafe, tostadas, bolleria, bocadillos y desayunos de barra en Cafe Bar El Cruce, Carr. Mazarron, 9, El Palmar, Murcia.',
    intro:
      'Empieza el dia en Cafe Bar El Cruce con cafe de barra, tostadas con tomate y aceite, bolleria, bocadillos y opciones rapidas para vecinos y trabajadores de El Palmar.',
    highlights: ['Cafe y tostadas', 'Bocadillos y montaditos', 'Desayuno murciano', 'Carr. Mazarron, 9'],
    cta: 'Ver carta de desayunos',
    path: '/menu',
  },
  {
    slug: 'tapas-el-palmar',
    title: 'Tapas en El Palmar, Murcia | Cafe Bar El Cruce',
    h1: 'Tapas en El Palmar, Murcia',
    description:
      'Tapas murcianas, marineras, caballitos, ensaladilla, montaditos y raciones en Cafe Bar El Cruce, El Palmar.',
    intro:
      'En Cafe Bar El Cruce servimos tapas murcianas de barra y raciones para compartir: marineras, caballitos, ensaladilla, croquetas, magra con tomate, montaditos y platos de siempre.',
    highlights: ['Marineras y marineros', 'Caballitos', 'Magra con tomate', 'Raciones para compartir'],
    cta: 'Ver tapas y raciones',
    path: '/menu',
  },
] as const

export type ElCruceLocalPage = (typeof EL_CRUCE_LOCAL_PAGES)[number]

export function isElCruceIdentity(slug?: string | null, name?: string | null) {
  const normalizedSlug = slug?.toLowerCase() || ''
  const normalizedName = name?.toLowerCase() || ''
  return normalizedSlug === EL_CRUCE_SLUG || normalizedName.includes('el cruce')
}

export function getElCruceLocalPage(slug: string) {
  return EL_CRUCE_LOCAL_PAGES.find((page) => page.slug === slug)
}
