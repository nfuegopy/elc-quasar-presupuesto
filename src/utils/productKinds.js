// Los beneficios (AMIN-11) se guardan en la colección `products` con tipo "beneficio".
// Así el CSV masivo y la app los leen de la misma fuente; el panel y la app los separan de la maquinaria.

export const BENEFIT_TYPE = 'beneficio'

// Valores fijos para los campos que en un beneficio no aplican pero el modelo de producto exige
export const BENEFIT_DEFAULTS = { type: BENEFIT_TYPE, brand: 'engine', model: BENEFIT_TYPE }

export const isBenefit = (product) =>
  String(product?.type || '')
    .trim()
    .toLowerCase() === BENEFIT_TYPE
