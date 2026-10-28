// Exportación / importación de productos en CSV para actualización masiva.
// Se usa ';' como separador y coma decimal porque es lo que abre bien Excel en español.

export const CSV_COLUMNS = [
  { key: 'id', header: 'ID' },
  { key: 'articleNumber', header: 'Numero de articulo' },
  { key: 'name', header: 'Nombre' },
  { key: 'type', header: 'Tipo' },
  { key: 'brand', header: 'Marca' },
  { key: 'model', header: 'Modelo' },
  { key: 'fuelType', header: 'Movido a' },
  { key: 'price', header: 'Precio' },
  { key: 'currency', header: 'Moneda' },
  { key: 'features', header: 'Caracteristicas' },
]

const BOM = String.fromCharCode(0xfeff)

const REQUIRED_FOR_NEW = ['articleNumber', 'name', 'type', 'brand', 'model', 'price']
const REQUIRED_NOT_EMPTY = ['articleNumber', 'name', 'type', 'brand', 'model']
const CURRENCIES = ['USD', 'GS']

const normalizeHeader = (h) => h.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

const HEADER_TO_KEY = Object.fromEntries(CSV_COLUMNS.map((c) => [normalizeHeader(c.header), c.key]))

function escapeCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function formatPrice(price) {
  const n = Number(price)
  return Number.isFinite(n) ? String(n).replace('.', ',') : ''
}

export function productsToCsv(products) {
  const lines = [CSV_COLUMNS.map((c) => c.header).join(';')]
  for (const p of products) {
    lines.push(
      CSV_COLUMNS.map((c) => escapeCell(c.key === 'price' ? formatPrice(p.price) : p[c.key])).join(
        ';',
      ),
    )
  }
  // BOM para que Excel reconozca UTF-8 (acentos, ñ)
  return BOM + lines.join('\r\n')
}

export function downloadCsv(content, fileName) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// Parser CSV con soporte de comillas, saltos de línea dentro de comillas y separador ; o ,
export function parseCsv(text) {
  if (text.startsWith(BOM)) text = text.slice(1)
  const firstLine = text.slice(0, text.search(/\r?\n|$/))
  const delimiter =
    (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ','

  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// Acepta "1234,56", "1.234,56", "1,234.56", "150.000.000" (Gs) o "1234.5"
export function parsePrice(raw) {
  let s = String(raw ?? '')
    .replace(/[^\d.,-]/g, '')
    .replace(/^[.,]+|[.,]+$/g, '')
  if (!s) return NaN
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    const decimal = lastComma > lastDot ? ',' : '.'
    const thousands = decimal === ',' ? '.' : ','
    s = s.split(thousands).join('').replace(decimal, '.')
  } else if (lastComma > -1) {
    s =
      /^-?\d{1,3}(,\d{3})+$/.test(s) && s.split(',').length > 2
        ? s.replace(/,/g, '')
        : s.replace(',', '.')
  } else if (lastDot > -1 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  return Number(s)
}

// Evita falsos cambios por cómo Excel reescribe el CSV: espacios sobrantes en los datos
// guardados, ceros iniciales que Excel quita al "convertir" ("041" -> 41) y redondeos de precio
function sameValue(field, current, incoming) {
  if (field === 'price') return Math.abs((Number(current) || 0) - incoming) < 0.005
  const a = String(current ?? '').trim()
  const b = String(incoming ?? '').trim()
  if (a === b) return true
  if (field === 'articleNumber' && /^\d+$/.test(a) && /^\d+$/.test(b)) {
    return a.replace(/^0+(?=\d)/, '') === b.replace(/^0+(?=\d)/, '')
  }
  return false
}

// Clave para detectar artículos repetidos: "041", "41" y " 41 " son el mismo artículo
const articleKey = (v) => {
  const s = String(v ?? '')
    .trim()
    .toLowerCase()
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s
}

/**
 * Compara el CSV con los productos actuales y arma el plan de cambios.
 * Solo se aplican las columnas presentes en el archivo, así se puede subir
 * un CSV con únicamente "ID" y "Precio".
 */
export function buildImportPlan(text, currentProducts) {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('El archivo no tiene filas de datos.')

  const keys = rows[0].map((h) => HEADER_TO_KEY[normalizeHeader(h)] || null)
  if (!keys.includes('id')) throw new Error('Falta la columna "ID". Usá la plantilla descargada.')

  const byId = new Map(currentProducts.map((p) => [p.id, p]))
  const byArticle = new Map()
  for (const p of currentProducts) {
    if (!byArticle.has(articleKey(p.articleNumber))) byArticle.set(articleKey(p.articleNumber), p)
  }
  // Artículos de filas nuevas ya vistas en este archivo -> fila donde aparecieron
  const newArticlesInFile = new Map()
  const plan = { updates: [], creates: [], unchanged: 0, errors: [] }

  // "line" es el número de fila de datos tal como se ve en Excel (encabezado = fila 1)
  rows.slice(1).forEach((cells, index) => {
    const line = index + 2
    const values = {}
    keys.forEach((key, col) => {
      if (key) values[key] = (cells[col] ?? '').trim()
    })

    const data = {}
    const rowErrors = []
    for (const [key, value] of Object.entries(values)) {
      if (key === 'id') continue
      if (key === 'price') {
        const price = parsePrice(value)
        if (!Number.isFinite(price) || price <= 0) rowErrors.push(`precio inválido "${value}"`)
        else data.price = price
      } else if (key === 'currency') {
        // Vacía: el alta queda en USD (valor por defecto) y la actualización no la cambia
        if (!value) continue
        const currency = value.toUpperCase()
        if (!CURRENCIES.includes(currency)) rowErrors.push(`moneda inválida "${value}" (USD o GS)`)
        else data.currency = currency
      } else if (key === 'brand') {
        data.brand = value.toLowerCase()
      } else {
        data[key] = value
      }
    }

    const id = values.id
    const existing = id ? byId.get(id) : null
    if (id && !existing) rowErrors.push(`no existe un producto con ID "${id}"`)

    const missing = existing
      ? REQUIRED_NOT_EMPTY.filter((k) => k in data && !data[k])
      : id
        ? []
        : REQUIRED_FOR_NEW.filter((k) => !(k in values) || values[k] === '')
    if (missing.length) rowErrors.push(`faltan datos: ${missing.join(', ')}`)

    // No duplicar artículos: un alta no puede usar un número de artículo que ya existe,
    // y una actualización no puede cambiarlo por el de otro producto
    if (data.articleNumber && !rowErrors.length) {
      const key = articleKey(data.articleNumber)
      const owner = byArticle.get(key)
      if (!existing && owner) {
        rowErrors.push(
          `ya existe el artículo ${data.articleNumber} ("${owner.name}"); para modificarlo usa su ID ${owner.id}`,
        )
      } else if (existing && owner && owner.id !== existing.id) {
        rowErrors.push(`el artículo ${data.articleNumber} ya pertenece a "${owner.name}"`)
      } else if (!existing && newArticlesInFile.has(key)) {
        rowErrors.push(
          `artículo ${data.articleNumber} repetido (ya está en la fila ${newArticlesInFile.get(key)})`,
        )
      }
      if (!existing && !rowErrors.length) newArticlesInFile.set(key, line)
    }

    if (rowErrors.length) {
      plan.errors.push({
        line,
        name: values.name || existing?.name || '',
        message: rowErrors.join('; '),
      })
      return
    }

    if (!existing) {
      plan.creates.push({ line, data })
      return
    }

    const changes = Object.entries(data)
      .filter(([k, v]) => !sameValue(k, existing[k], v))
      .map(([field, to]) => ({ field, from: existing[field] ?? '', to }))
    if (changes.length) {
      plan.updates.push({
        line,
        id,
        name: existing.name,
        changes,
        data: Object.fromEntries(changes.map((c) => [c.field, c.to])),
      })
    } else {
      plan.unchanged++
    }
  })

  return plan
}
