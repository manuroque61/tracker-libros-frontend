// Verificación de contratos con HTTP simulado; no requiere backend ni cambia datos reales.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const modules = new Map()
const storage = new Map()
const token = sub => `header.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.signature`
storage.set('libros-tracker.token', token('usuario-a'))
storage.set('libros-tracker.sesiones', JSON.stringify([{ id: 'anterior', lecturaId: '7' }]))
global.window = {
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
  dispatchEvent() {},
}
function load(file) {
  file = path.resolve(file)
  if (modules.has(file)) return modules.get(file).exports
  const module = { exports: {} }
  modules.set(file, module)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(
    p => {
      const target = path.resolve(path.dirname(file), p)
      return load(fs.existsSync(target + '.ts') ? target + '.ts' : path.join(target, 'index.ts'))
    }, module, module.exports,
  )
  return module.exports
}
const api = load('src/services/lecturasApi.ts')
const calls = []
let formato = 'FISICO'
let failState = false
let failDelete = false
let duplicate = false
let biblioteca = []
const dto = () => ({ id: 7, libroId: 9, formato, estado: 'LEYENDO', paginaActual: 12,
  porcentajeProgreso: 12, ubicacionDigital: 'posicion', fechaInicio: null,
  fechaFinalizacion: null, fechaAgregado: '2026-11-02' })
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
global.fetch = async (url, init) => {
  calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined })
  assert.equal(init.headers.get('Authorization'), `Bearer ${storage.get('libros-tracker.token')}`)
  if (url === '/api/lecturas' && !init.method) {
    assert.equal(init.cache, 'no-store')
    return json(biblioteca)
  }
  if (url === '/api/lecturas' && duplicate) return json({}, 409)
  if (url.endsWith('/estado') && failState) return json({}, 500)
  if (init.method === 'DELETE') return failDelete ? json({}, 500) : new Response(null, { status: 204 })
  return json(dto(), init.method === 'POST' ? 201 : 200)
}
async function main() {
  biblioteca = [dto(), { ...dto(), id: 8, libroId: 10 }]
  assert.deepEqual((await api.listarPorLibro('9')).map(item => [item.id, item.libroId, item.formato]), [['7', '9', 'FISICO']])
  biblioteca.push({ ...dto(), id: 11, formato: 'EPUB' })
  assert.deepEqual((await api.listarPorLibro('9')).map(item => item.formato), ['FISICO', 'EPUB'])
  biblioteca = []
  assert.deepEqual(await api.listarPorLibro('9'), [])
  const created = await api.crearLectura('9', 'FISICO', 123)
  assert.equal(created.id, '7')
  assert.deepEqual(calls.at(-1).body, { libroId: 9, formato: 'FISICO' })
  assert.equal(api.obtenerDatosLocales('7').totalPaginas, 123)
  duplicate = true
  await assert.rejects(api.crearLectura('9', 'FISICO', null), e => e.status === 409)
  duplicate = false
  calls.length = 0
  await api.actualizarProgreso('7', { paginaActual: 12, porcentaje: 99, estado: 'PAUSADO', totalPaginas: 250, fechaInicio: '2026-01-01', fechaFin: null })
  assert.deepEqual(calls.filter(c => c.method === 'PATCH').map(c => [c.url, c.body]), [
    ['/api/lecturas/7/progreso', { paginaActual: 12 }],
    ['/api/lecturas/7/estado', { estado: 'PAUSADO' }],
  ])
  assert.equal(api.obtenerDatosLocales('7').fechaInicio, '2026-01-01')
  for (formato of ['PDF', 'EPUB']) {
    calls.length = 0
    await api.actualizarProgreso('7', { paginaActual: 10, porcentaje: 37.5, ubicacionDigital: 'cfi-o-pagina' })
    assert.deepEqual(calls.at(-1).body, { porcentajeDigital: 37.5, ubicacionDigital: 'cfi-o-pagina' })
    assert.equal(calls.filter(c => c.method === 'PATCH').length, 1)
  }
  calls.length = 0
  await api.actualizarEstado('7', 'ABANDONADO')
  assert.deepEqual(calls.map(c => [c.url, c.body]), [['/api/lecturas/7/estado', { estado: 'ABANDONADO' }]])
  formato = 'FISICO'
  failState = true
  await assert.rejects(api.actualizarProgreso('7', { paginaActual: 13, estado: 'PAUSADO' }), /El progreso se guardó/)
  failState = false
  await assert.rejects(api.actualizarProgreso('7', { paginaActual: -1 }))
  await assert.rejects(api.crearLectura('local-id', 'FISICO', null))
  await assert.rejects(api.crearLectura('9', 'OTRO', null))
  await api.registrarSesion('7', { minutos: 20 })
  assert.equal((await api.listarSesiones('7')).length, 1)
  const beforeDelete = new Map(storage)
  failDelete = true
  await assert.rejects(api.eliminarLectura('7'))
  assert.deepEqual(storage, beforeDelete)
  failDelete = false
  await api.eliminarLectura('7')
  assert.equal(calls.at(-1).method, 'DELETE')
  assert.deepEqual(storage, beforeDelete)
  storage.set('libros-tracker.token', token('usuario-b'))
  assert.deepEqual(api.obtenerDatosLocales('7'), {})
  assert.deepEqual(await api.listarSesiones('7'), [])
  assert.equal(JSON.parse(storage.get('libros-tracker.sesiones'))[0].id, 'anterior')
  console.log('Etapa B: contratos físicos/digitales, estado independiente, 409, 204, errores parciales y datos locales: OK')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
