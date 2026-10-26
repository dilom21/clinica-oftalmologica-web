import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:8001';
const EMPRESAS = [
  'VISION-CLARA', 'OFTALMO-NORTE', 'VISUAL-ORIENTAL', 'INSTITUTO-VISION',
  'OFTALMOCARE', 'VISTA-SUR', 'MEDICO-OCULAR',
] as const;
const PASSWORD = 'Cu30-Prueba-2026!';

test.beforeEach(async ({ context, request }) => {
  const status = await request.get(`${API}/__cu30_test/status`);
  expect(await status.json()).toEqual({ entorno: 'cu30-aislado', empresas: 7 });
  // The browser must never send fixture credentials or inventory to a real API.
  await context.route('**/*', route => {
    const origin = new URL(route.request().url()).origin;
    return [API, 'http://127.0.0.1:4202'].includes(origin) ? route.continue() : route.abort();
  });
});

async function login(page: Page, empresa: string, correo = 'admin@cu30.test') {
  await page.goto('/login');
  await expect(page.locator('#company option')).toHaveCount(8);
  await page.getByLabel('Empresa', { exact: true }).selectOption(empresa);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

async function abrirDesdeMenu(page: Page) {
  const enlace = page.locator('app-sidebar a[href="/inventario-alertas"]');
  if (!await enlace.isVisible()) {
    await page.locator('app-sidebar').getByRole('button', { name: /Inventario y Proveedores/ }).click();
  }
  await enlace.click();
  await expect(page).toHaveURL(/\/inventario-alertas$/);
  await expect(page.getByRole('heading', { name: 'Productos y existencias', exact: true })).toBeVisible();
}

async function denegadosPorAPI(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  for (const endpoint of ['inventario', 'alertas', 'productos/1/lotes']) {
    const respuesta = await page.request.get(`${API}/inventario-proveedores/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(respuesta.status()).toBe(403);
  }
}

for (const [indice, empresa] of EMPRESAS.entries()) {
  test(`${empresa}: login, menú, inventario, lotes y alertas aislados`, async ({ page }) => {
    await login(page, empresa, indice % 2 ? 'lectura@cu30.test' : 'admin@cu30.test');
    const respuesta = page.waitForResponse(r => r.url().startsWith(`${API}/inventario-proveedores/inventario`));
    await abrirDesdeMenu(page);
    const inventario = await (await respuesta).json();
    expect(inventario.total).toBe(7);
    expect(inventario.items.every((p: { nombre: string }) => p.nombre.includes(empresa))).toBe(true);
    await expect(page.getByText(`Gotas ${empresa}`, { exact: true })).toBeVisible();
    await expect(page.locator('.resumen')).toContainText('Stock bajo');
    const respuestaLotes = page.waitForResponse(r => r.url().includes('/productos/1/lotes'));
    await page.getByRole('button', { name: `Ver lotes de Gotas ${empresa}`, exact: true }).click();
    const lotes = await (await respuestaLotes).json();
    expect(lotes.lotes.every((l: { codigo: string }) => l.codigo.startsWith(empresa))).toBe(true);
    await expect(page.getByRole('heading', { name: `Lotes de Gotas ${empresa}`, exact: true })).toBeVisible();
    await expect(page.getByText(`${empresa}-VENCIDO`, { exact: true })).toBeVisible();
    const respuestaAlertas = page.waitForResponse(r => r.url().startsWith(`${API}/inventario-proveedores/alertas`));
    await page.getByRole('button', { name: 'Alertas', exact: true }).click();
    const alertas = await (await respuestaAlertas).json();
    expect(alertas.total).toBe(8);
    expect(new Set(alertas.items.map((a: { tipo: string }) => a.tipo))).toEqual(
      new Set(['STOCK_BAJO', 'AGOTADO', 'PROXIMO_VENCIMIENTO', 'VENCIDO']),
    );
    expect(alertas.items.every((a: { producto_nombre: string }) => a.producto_nombre.includes(empresa))).toBe(true);
  });

  test(`${empresa}: sin permiso no tiene menú ni acceso a los tres GET`, async ({ page }) => {
    await login(page, empresa, 'sin-permiso@cu30.test');
    await expect(page.locator('app-sidebar a[href="/inventario-alertas"]')).toHaveCount(0);
    await denegadosPorAPI(page);
    await page.goto('/inventario-alertas');
    await expect(page.getByRole('heading', { name: 'Acceso no autorizado', exact: true })).toBeVisible();
    await expect(page.locator('form.filtros')).toHaveCount(0);
    await expect(page.locator('.resumen')).toHaveCount(0);
  });

  test(`${empresa}: escritura sola no autoriza consultas`, async ({ page }) => {
    await login(page, empresa, 'escritura@cu30.test');
    await denegadosPorAPI(page);
    await page.goto('/inventario-alertas');
    await expect(page.getByRole('heading', { name: 'Acceso no autorizado', exact: true })).toBeVisible();
  });
}

test('filtros reales por búsqueda, categoría, stock, vencimiento y vacío', async ({ page }) => {
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  await page.locator('[formControlName="q"]').fill('GOTAS');
  await page.locator('[formControlName="categoria"]').fill('Medicamentos');
  await page.locator('[formControlName="stock"]').selectOption('BAJO');
  await page.locator('[formControlName="vencimiento"]').selectOption('PROXIMO');
  await page.locator('[formControlName="dias_vencimiento"]').fill('31');
  const response = page.waitForResponse(r => r.url().includes('/inventario-proveedores/inventario?') && r.url().includes('q=GOTAS'));
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const datos = await (await response).json();
  expect(datos.total).toBe(1);
  expect(datos.items[0].stock_actual).toBe(10);
  expect(datos.items[0].lotes).toHaveLength(3);
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await page.locator('[formControlName="q"]').fill('ninguna-coincidencia');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No se encontraron productos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await expect(page.locator('table tbody tr')).toHaveCount(7);
});

test('cambiar de empresa descarta los resultados y la sesión anterior', async ({ page }) => {
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  await page.getByRole('main').getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, EMPRESAS[1], 'lectura@cu30.test');
  await abrirDesdeMenu(page);
  await expect(page.getByText(`Gotas ${EMPRESAS[1]}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toHaveCount(0);
});

test('503 controlado no se muestra como inventario vacío; reintento vuelve a la API real', async ({ page }) => {
  await login(page, EMPRESAS[0]);
  await page.route(`${API}/inventario-proveedores/inventario**`, route => route.fulfill({
    status: 503,
    json: { detail: { codigo: 'INVENTARIO_DEPENDENCIAS_PENDIENTES', mensaje: 'fallo controlado de prueba' } },
  }));
  await page.goto('/inventario-alertas');
  await expect(page.getByRole('heading', { name: 'Inventario no disponible', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No se encontraron productos', exact: true })).toHaveCount(0);
  await expect(page.locator('.resumen')).toHaveCount(0);
  await page.unroute(`${API}/inventario-proveedores/inventario**`);
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.locator('table tbody tr')).toHaveCount(7);
});

test('vista móvil permite consultar inventario y abrir el menú sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, EMPRESAS[0]);
  await page.goto('/inventario-alertas');
  await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toBeVisible();
  const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(desborda).toBe(false);
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await expect(page.locator('app-sidebar a[href="/inventario-alertas"]')).toBeVisible();
});

test('sin sesión la ruta protegida redirige a login', async ({ page }) => {
  await page.goto('/inventario-alertas');
  await expect(page).toHaveURL(/\/login$/);
});
