import { expect, test } from '@playwright/test';
import { cuentaVisual, notificacionVisual, pacienteVisual, pagosVisuales } from './cu34.fixtures';

test('CU34: cinco pestañas, paneles, solo lectura, responsive y capturas con API simulada', async ({
  page,
  context,
}, testInfo) => {
  const errores: string[] = [];
  const solicitudes: string[] = [];
  page.on('pageerror', (error) => errores.push(error.message));
  const claims = {
    token_type: 'tenant',
    empresa_codigo: 'CU34-DEMO',
    tenant_id: 999,
    exp: Math.floor(Date.now() / 1000) + 3600,
    usuario_id: 1,
    rol_id: 1,
    correo: 'demo@cu34.invalid',
    nombre: 'Administración Demo',
  };
  const codificar = (valor: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(valor)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const token = `${codificar('{}')}.${codificar(JSON.stringify(claims))}.fixture`;
  await context.addInitScript((token) => localStorage.setItem('access_token', token), token);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:4210') return route.continue();
    solicitudes.push(`${request.method()} ${url.pathname}${url.search}`);
    // Ninguna solicitud sale hacia backend local, producción ni terceros.
    if (request.method() !== 'GET') return route.abort();
    if (url.pathname.endsWith('/seguridad/menu'))
      return route.fulfill({
        json: [
          {
            id: 9,
            nombre: 'Pagos',
            funciones: [
              { id: 31, nombre: 'Gestionar pagos', accion_id: 3, accion_nombre: 'AMBAS' },
              {
                id: 40,
                nombre: 'Gestionar planes de pago',
                accion_id: 1,
                accion_nombre: 'LECTURA',
              },
              { id: 41, nombre: 'Gestionar cuotas', accion_id: 1, accion_nombre: 'LECTURA' },
            ],
          },
        ],
      });
    if (url.pathname.endsWith('/seguridad/tenant/empresas'))
      return route.fulfill({
        json: [{ codigo: 'CU34-DEMO', nombre: 'Centro Oftalmológico · Demo' }],
      });
    if (url.pathname.endsWith('/pacientes')) return route.fulfill({ json: [pacienteVisual] });
    if (url.pathname.endsWith('/estado-cuenta/19')) return route.fulfill({ json: cuentaVisual });
    if (url.pathname.endsWith('/notificacion')) return route.fulfill({ json: notificacionVisual });
    if (url.pathname.endsWith('/comprobante'))
      return route.fulfill({
        contentType: 'application/pdf',
        headers: { 'content-disposition': 'attachment; filename="comprobante-demo.pdf"' },
        body: '%PDF-1.4\n% CU34 ficticio\n%%EOF',
      });
    if (url.pathname.endsWith('/pagos/administrativos')) {
      expect(url.searchParams.get('paciente_id')).toBe('19');
      const pagina = Number(url.searchParams.get('page') || 1);
      const tamano = Number(url.searchParams.get('page_size') || 5);
      return route.fulfill({
        json: {
          items: pagosVisuales.slice((pagina - 1) * tamano, pagina * tamano),
          total: 12,
          total_pages: Math.ceil(12 / tamano),
          page: pagina,
          page_size: tamano,
        },
      });
    }
    return route.abort();
  });
  await page.goto('/pagos/estado-cuenta');
  await page.getByRole('searchbox', { name: 'Buscar paciente', exact: true }).fill('Elena');
  expect(solicitudes.filter((url) => url.includes('/pagos/administrativos'))).toHaveLength(0);
  await page.getByRole('button', { name: /Elena Vargas/ }).click();
  await expect(page.getByRole('tab', { name: 'Resumen', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('app-sidebar a[href="/pagos/estado-cuenta"]')).toBeVisible();
  await expect(page.locator('app-sidebar a[href="/pagos"]')).not.toHaveClass(/--active/);
  await expect(page.locator('.services-preview tbody tr')).toHaveCount(3);
  await expect(page.getByRole('img', { name: /Servicios no financiados: 60%/ })).toBeVisible();
  const capturar = async (nombre: string) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`${nombre}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  };
  await capturar('resumen');
  await page.locator('.services-preview').getByRole('button', { name: 'Ver todos' }).click();
  await page.getByRole('button', { name: 'Estudio de campo visual' }).click();
  await expect(page.getByRole('region', { name: 'Detalle del servicio' })).toBeVisible();
  await capturar('servicios');
  await page.getByRole('button', { name: 'Plan #7', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cuotas del Plan #7' })).toBeVisible();
  await capturar('planes');
  await page.getByRole('tab', { name: 'Historial', exact: true }).click();
  await expect(page.locator('app-detalle-pago')).toBeVisible();
  await expect(
    page.getByText('La entrega final todavía no está confirmada.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirmar pago|Reintentar envío/ })).toHaveCount(
    0,
  );
  await capturar('historial');
  const lista = await page.locator('.history-list').boundingBox();
  const detalle = await page.locator('.payment-panel').boundingBox();
  expect(detalle!.x).toBeGreaterThan(lista!.x + lista!.width);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar comprobante', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).click();
  await expect(page.locator('.history-list tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).click();
  await expect(page.locator('.history-list tbody tr')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Pendientes', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No hay pagos pendientes', exact: true }),
  ).toBeVisible();
  await capturar('pendientes');
  expect(solicitudes.filter((url) => url.includes('/estado-cuenta/19'))).toHaveLength(1);
  expect(solicitudes.every((url) => url.startsWith('GET '))).toBe(true);
  await page.getByRole('tab', { name: 'Historial', exact: true }).click();
  await page.getByRole('button', { name: 'Página anterior', exact: true }).click();
  await page.getByRole('button', { name: 'Página anterior', exact: true }).click();
  const tamanos: Array<{ ancho: number; pestana: string; altoDocumento: number }> = [];
  for (const width of [1366, 1440, 1920, 390]) {
    await page.setViewportSize({
      width,
      height: width === 1366 ? 768 : width === 1920 ? 1080 : width === 390 ? 844 : 900,
    });
    for (const nombre of ['Resumen', 'Servicios', 'Planes y cuotas', 'Historial', 'Pendientes']) {
      await page.getByRole('tab', { name: nombre, exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${nombre} a ${width}px sin desborde global`,
      ).toBe(true);
      tamanos.push({
        ancho: width,
        pestana: nombre,
        altoDocumento: await page.evaluate(() => document.documentElement.scrollHeight),
      });
      if (width === 1366 || width === 1920 || width === 390)
        await capturar(`${nombre.toLowerCase().replaceAll(' ', '-')}-${width}`);
    }
  }
  await expect(page.locator('.sidebar__mobile-company')).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click();
  await expect(page.locator('app-sidebar .sidebar__switch')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('app-sidebar').getByRole('button', { name: 'Modo oscuro' }).click();
  for (const [nombre, archivo] of [
    ['Resumen', 'resumen'],
    ['Servicios', 'servicios'],
    ['Planes y cuotas', 'planes'],
    ['Historial', 'historial'],
    ['Pendientes', 'pendientes'],
  ]) {
    await page.getByRole('tab', { name: nombre, exact: true }).click();
    await capturar(`${archivo}-oscuro`);
  }
  await testInfo.attach('dimensiones', {
    body: JSON.stringify(tamanos, null, 2),
    contentType: 'application/json',
  });
  expect(errores).toEqual([]);
  expect(solicitudes.every((url) => url.startsWith('GET '))).toBe(true);
});
