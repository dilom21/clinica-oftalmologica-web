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

async function comprobarEmpresa(page: Page, empresa: string) {
  await expect(page.locator('main .empresa')).toHaveText(`Clinica aislada ${empresa}`);
  await expect(page.locator('app-sidebar .sidebar__company-name')).toHaveText(`Clinica aislada ${empresa}`);
  await expect(page.getByText(`Gotas ${empresa}`, { exact: true })).toBeVisible();
  await expect(page.locator('table tbody tr')).toHaveCount(7);
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
    await expect(page.locator('app-sidebar a[href="/inventario-alertas"]')).toHaveCount(0);
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

test('las siete empresas sincronizan identidad, resultados y menú entre pestañas', async ({ page, context }) => {
  test.setTimeout(90_000);
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  await comprobarEmpresa(page, EMPRESAS[0]);
  const otraPestana = await context.newPage();
  for (const empresa of EMPRESAS.slice(1)) {
    await login(otraPestana, empresa, 'lectura@cu30.test');
    await comprobarEmpresa(page, empresa);
    await expect(page.locator('app-sidebar a[href="/inventario-alertas"]')).toHaveCount(1);
    for (const anterior of EMPRESAS.filter(codigo => codigo !== empresa)) {
      await expect(page.getByText(`Gotas ${anterior}`, { exact: true })).toHaveCount(0);
    }
  }
});

test('F5 descarta la identidad por pestaña que no coincide con el JWT vigente', async ({ page, context }) => {
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  await comprobarEmpresa(page, EMPRESAS[0]);
  const empresaAnterior = await page.evaluate(() => sessionStorage.getItem('sesion_empresa'));
  expect(empresaAnterior).toBeTruthy();
  const otraPestana = await context.newPage();
  await login(otraPestana, EMPRESAS[1]);
  await comprobarEmpresa(page, EMPRESAS[1]);
  await page.evaluate(empresa => sessionStorage.setItem('sesion_empresa', empresa!), empresaAnterior);
  await page.reload();
  await comprobarEmpresa(page, EMPRESAS[1]);
  await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toHaveCount(0);
  const restaurada = await page.evaluate(() => JSON.parse(sessionStorage.getItem('sesion_empresa')!));
  expect(restaurada.codigo).toBe(EMPRESAS[1]);
});

for (const correo of ['sin-permiso@cu30.test', 'escritura@cu30.test']) {
  test(`cambiar de usuario en otra pestaña retira CU30 de la misma empresa: ${correo}`, async ({ page, context }) => {
    await login(page, EMPRESAS[0]);
    await abrirDesdeMenu(page);
    await comprobarEmpresa(page, EMPRESAS[0]);
    await page.getByRole('button', { name: `Ver lotes de Gotas ${EMPRESAS[0]}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: `Lotes de Gotas ${EMPRESAS[0]}`, exact: true })).toBeVisible();
    const otraPestana = await context.newPage();
    await login(otraPestana, EMPRESAS[0], correo);
    await expect(page.getByRole('heading', { name: 'Acceso no autorizado', exact: true })).toBeVisible();
    await expect(page.locator('app-sidebar .sidebar__usuario-nombre')).toHaveText(correo);
    await expect(page.locator('main .empresa')).toHaveText(`Clinica aislada ${EMPRESAS[0]}`);
    await expect(page.locator('app-sidebar a[href="/inventario-alertas"]')).toHaveCount(0);
    await expect(page.locator('form.filtros')).toHaveCount(0);
    await expect(page.locator('.resumen')).toHaveCount(0);
    await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `Lotes de Gotas ${EMPRESAS[0]}`, exact: true })).toHaveCount(0);
    await denegadosPorAPI(page);
  });
}

test('cerrar sesión desde otra pestaña elimina identidad, inventario y permisos', async ({ page, context }) => {
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  await comprobarEmpresa(page, EMPRESAS[0]);
  const otraPestana = await context.newPage();
  await otraPestana.goto('/inventario-alertas');
  await comprobarEmpresa(otraPestana, EMPRESAS[0]);
  await otraPestana.getByRole('main').getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inicia sesión en tu empresa', exact: true })).toBeVisible();
  await expect(page.locator('main .empresa')).not.toContainText(EMPRESAS[0]);
  await expect(page.locator('app-sidebar .sidebar__company-name')).not.toContainText(EMPRESAS[0]);
  await expect(page.locator('app-sidebar a[href="/inventario-alertas"]')).toHaveCount(0);
  await expect(page.locator('.resumen')).toHaveCount(0);
  await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toHaveCount(0);
});

for (const recurso of ['inventario', 'productos/1/lotes']) {
  test(`descarta una respuesta real tardía de ${recurso} tras cambiar de empresa`, async ({ page, context }) => {
    await login(page, EMPRESAS[0]);
    await abrirDesdeMenu(page);
    await comprobarEmpresa(page, EMPRESAS[0]);
    let liberar!: () => void;
    let recibida!: () => void;
    let finalizada!: () => void;
    const retenida = new Promise<void>(resolve => { liberar = resolve; });
    const capturada = new Promise<void>(resolve => { recibida = resolve; });
    const completa = new Promise<void>(resolve => { finalizada = resolve; });
    let primera = true;
    await page.route(`${API}/inventario-proveedores/${recurso}**`, async route => {
      if (!primera) return route.continue();
      primera = false;
      try {
        const respuesta = await route.fetch();
        expect(respuesta.status()).toBe(200);
        const datos = await respuesta.json();
        if (recurso === 'inventario') {
          expect(datos.items.every((p: { nombre: string }) => p.nombre.includes(EMPRESAS[0]))).toBe(true);
        } else {
          expect(datos.lotes.every((l: { codigo: string }) => l.codigo.startsWith(EMPRESAS[0]))).toBe(true);
        }
        recibida();
        await retenida;
        // Angular may already have cancelled the old request. Either cancelling
        // it or discarding its late response must leave the new tenant intact.
        await route.fulfill({ response: respuesta }).catch(() => {});
      } finally {
        finalizada();
      }
    });
    try {
      if (recurso === 'inventario') {
        await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
      } else {
        await page.getByRole('button', { name: `Ver lotes de Gotas ${EMPRESAS[0]}`, exact: true }).click();
      }
      await capturada;
      const otraPestana = await context.newPage();
      await login(otraPestana, EMPRESAS[1], 'lectura@cu30.test');
      await comprobarEmpresa(page, EMPRESAS[1]);
      liberar();
      await completa;
      await comprobarEmpresa(page, EMPRESAS[1]);
      await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: `Lotes de Gotas ${EMPRESAS[0]}`, exact: true })).toHaveCount(0);
    } finally {
      liberar();
    }
  });
}

test('error del menú tras cambiar de tenant borra A y permite reintentar solamente B', async ({ page, context }) => {
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  await comprobarEmpresa(page, EMPRESAS[0]);
  const otraPestana = await context.newPage();
  await page.route(`${API}/seguridad/menu`, route => route.fulfill({ status: 503, json: { detail: 'fallo controlado' } }));
  await login(otraPestana, EMPRESAS[1]);
  await expect(page.getByRole('heading', { name: 'No se pudo comprobar el acceso', exact: true })).toBeVisible();
  await expect(page.locator('main .empresa')).toHaveText(`Clinica aislada ${EMPRESAS[1]}`);
  await expect(page.locator('app-sidebar a[href="/inventario-alertas"]')).toHaveCount(0);
  await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toHaveCount(0);
  await expect(page.locator('.resumen')).toHaveCount(0);
  await page.unroute(`${API}/seguridad/menu`);
  await page.getByRole('main').getByRole('button', { name: 'Reintentar', exact: true }).click();
  await comprobarEmpresa(page, EMPRESAS[1]);
});

test('un error al resolver la clínica tras F5 elimina la identidad obsoleta y permite reintentar', async ({ page, context }) => {
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  const empresaAnterior = await page.evaluate(() => sessionStorage.getItem('sesion_empresa'));
  const otraPestana = await context.newPage();
  await login(otraPestana, EMPRESAS[1]);
  await comprobarEmpresa(page, EMPRESAS[1]);
  await page.evaluate(empresa => sessionStorage.setItem('sesion_empresa', empresa!), empresaAnterior);
  await page.route(`${API}/seguridad/tenant/empresas`, route => route.fulfill({ status: 503, json: { detail: 'fallo controlado' } }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No se pudo comprobar la clínica', exact: true })).toBeVisible();
  await expect(page.locator('main .empresa')).toHaveText('Clínica');
  await expect(page.locator('app-sidebar .sidebar__company-name')).not.toContainText(EMPRESAS[0]);
  await expect(page.locator('.resumen')).toHaveCount(0);
  await expect(page.getByText(`Gotas ${EMPRESAS[0]}`, { exact: true })).toHaveCount(0);
  await page.unroute(`${API}/seguridad/tenant/empresas`);
  await page.getByRole('main').getByRole('button', { name: 'Reintentar', exact: true }).click();
  await comprobarEmpresa(page, EMPRESAS[1]);
});

test('SIN_UMBRAL se envía al API real y puede limpiarse y combinarse con alertas', async ({ page }) => {
  await login(page, EMPRESAS[0]);
  await abrirDesdeMenu(page);
  await page.locator('[formControlName="stock"]').selectOption('SIN_UMBRAL');
  const respuesta = page.waitForResponse(r => r.url().includes('/inventario-proveedores/inventario?') && r.url().includes('stock=SIN_UMBRAL'));
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const datos = await (await respuesta).json();
  expect(datos.total).toBe(0);
  expect(datos.items).toEqual([]);
  await expect(page.getByRole('heading', { name: 'No se encontraron productos', exact: true })).toBeVisible();
  const respuestaAlertas = page.waitForResponse(r => r.url().includes('/inventario-proveedores/alertas?') && r.url().includes('stock=SIN_UMBRAL'));
  await page.getByRole('button', { name: 'Alertas', exact: true }).click();
  expect((await (await respuestaAlertas).json()).total).toBe(0);
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
  await expect(page.locator('[formControlName="stock"]')).toHaveValue('TODOS');
  await page.getByRole('button', { name: 'Productos y existencias', exact: true }).click();
  await comprobarEmpresa(page, EMPRESAS[0]);
});
