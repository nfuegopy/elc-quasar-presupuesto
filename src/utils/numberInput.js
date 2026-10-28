import { nextTick } from 'vue'

// Deja solo dígitos y una coma decimal ("7.5" -> "7,5", "1a0" -> "10")
export function onlyDecimal(value) {
  const text = String(value ?? '')
    .replace(/\./g, ',')
    .replace(/[^\d,]/g, '')
  const [integer, ...decimals] = text.split(',')
  return decimals.length ? `${integer},${decimals.join('')}` : integer
}

// Bloquea en el teclado todo lo que no sea número o una única coma/punto decimal.
// Deja pasar teclas de control (Backspace, flechas, Tab) y atajos (Ctrl+C/V/A).
export function blockNonDecimalKeys(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.key.length > 1) return
  if (/\d/.test(event.key)) return
  if ((event.key === ',' || event.key === '.') && !event.target.value.includes(',')) return
  event.preventDefault()
}

// Para @update:model-value: si el texto traía caracteres inválidos (por ejemplo al pegar),
// se asigna primero lo escrito y luego lo limpio, así Vue redibuja el campo aunque el
// valor limpio sea igual al anterior.
export function setDecimal(value, assign) {
  const clean = onlyDecimal(value)
  assign(value)
  if (clean !== value) nextTick(() => assign(clean))
}
