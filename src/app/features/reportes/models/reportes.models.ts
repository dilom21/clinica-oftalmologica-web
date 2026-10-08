export type ReporteModo = 'estatico' | 'dinamico';
export type ReporteFormato = 'xlsx' | 'pdf' | 'csv' | 'html';
export type ReporteValor = string | number | boolean | string[] | ReporteValor[] | null;

export interface ReporteCampo {
  key: string;
  label: string;
  type: string;
  operators: string[];
  sortable: boolean;
  default?: boolean;
}

export interface ReporteDataset {
  key: string;
  label: string;
  fields: ReporteCampo[];
}

export interface ReporteEstatico {
  key: string;
  label: string;
  description?: string;
  columns: ReporteCampo[];
  filters: ReporteCampo[];
}

export interface ReporteCatalogo {
  datasets: ReporteDataset[];
  staticReports: ReporteEstatico[];
}

export interface ReporteFiltro {
  field: string;
  operator: string;
  value: ReporteValor;
  value2?: ReporteValor;
}

export interface ReporteOrden {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReporteRequest {
  dataset?: string;
  columns?: string[];
  filters: ReporteFiltro[];
  order_by?: ReporteOrden[];
  limit?: number;
}

export interface ReporteEmailDinamicoPayload {
  destinatario: string;
  formato: ReporteFormato;
  asunto: string;
  mensaje: string;
  dataset?: string;
  columnas: string[];
  filtros: Record<string, unknown>[];
  orden: Record<string, unknown>[];
  limit: number;
}

export interface ReporteEmailEstaticoPayload {
  destinatario: string;
  formato: ReporteFormato;
  asunto: string;
  mensaje: string;
  filtros: Record<string, unknown>[];
  limit: number;
}

export interface ReportePreview {
  columns: ReportePreviewColumn[];
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
}

export interface ReportePreviewColumn {
  key: string;
  label: string;
}

export interface ReporteInterpretacionIa {
  dataset?: string;
  columnas?: string[];
  columns?: string[];
  filtros?: Array<Record<string, unknown>>;
  filters?: Array<Record<string, unknown>>;
  orden?: Array<Record<string, unknown>>;
  order_by?: Array<Record<string, unknown>>;
  limit?: number;
  requiere_aclaracion?: boolean;
  pregunta_aclaracion?: string | null;
  accion_sugerida?: string | null;
  formato_sugerido?: string | null;
}

export interface ReporteExportacion {
  blob: Blob;
  filename: string;
}

export function normalizePreview(raw: unknown): ReportePreview {
  const source = isRecord(raw) ? raw : {};
  const rawColumns = Array.isArray(source['columnas']) ? source['columnas'] : source['columns'];
  const columns = Array.isArray(rawColumns)
    ? rawColumns.map((column) => {
        if (isRecord(column)) {
          const key = stringValue(column['key'] ?? column['campo'] ?? column['name']);
          return { key, label: stringValue(column['label'] ?? column['nombre'] ?? key) };
        }
        const key = stringValue(column);
        return { key, label: key };
      }).filter((column) => column.key)
    : [];
  const rawRows = Array.isArray(source['filas']) ? source['filas'] : source['rows'];
  return {
    columns,
    rows: Array.isArray(rawRows) ? rawRows.filter(isRecord) : [],
    total: numberValue(source['total']),
    limit: numberValue(source['limit']),
  };
}

export function normalizeCatalog(raw: unknown): ReporteCatalogo {
  const source = isRecord(raw) ? raw : {};
  const datasets = firstArray(source, ['datasets', 'data_sets', 'data'])
    .map((item) => normalizeDataset(item))
    .filter((item): item is ReporteDataset => item !== null);
  const staticReports = firstArray(source, ['static_reports', 'reportes_estaticos', 'reports'])
    .map((item) => normalizeStatic(item, datasets))
    .filter((item): item is ReporteEstatico => item !== null);
  return { datasets, staticReports };
}

function normalizeDataset(raw: unknown): ReporteDataset | null {
  if (!isRecord(raw)) return null;
  const key = stringValue(raw['key'] ?? raw['dataset'] ?? raw['id'] ?? raw['name']);
  if (!key) return null;
  const fields = firstArray(raw, ['fields', 'campos', 'columns']).map(normalizeField).filter(isField);
  return { key, label: stringValue(raw['label'] ?? raw['nombre'] ?? key), fields };
}

function normalizeStatic(raw: unknown, datasets: ReporteDataset[]): ReporteEstatico | null {
  if (!isRecord(raw)) return null;
  const key = stringValue(raw['key'] ?? raw['reporte_key'] ?? raw['id'] ?? raw['name']);
  if (!key) return null;
  const columns = firstArray(raw, ['columns', 'columnas', 'fields']).map(normalizeField).filter(isField);
  const filters = firstArray(raw, ['filters', 'filtros', 'filter_fields']).map(normalizeField).filter(isField);
  const datasetKey = stringValue(raw['dataset'] ?? raw['dataset_key']);
  const dataset = datasets.find((item) => item.key === datasetKey);
  return {
    key,
    label: stringValue(raw['label'] ?? raw['nombre'] ?? key),
    description: stringValue(raw['description'] ?? raw['descripcion'] ?? ''),
    columns: columns.length ? columns : dataset?.fields ?? [],
    filters: filters.length ? filters : dataset?.fields ?? [],
  };
}

function normalizeField(raw: unknown): ReporteCampo {
  const source = isRecord(raw) ? raw : {};
  const key = stringValue(source['key'] ?? source['field'] ?? source['name']);
  const operators = firstArray(source, ['operators', 'operadores']).map(stringValue).filter(Boolean);
  return {
    key,
    label: stringValue(source['label'] ?? source['nombre'] ?? key),
    type: stringValue(source['type'] ?? source['tipo'] ?? 'text').toLowerCase(),
    operators,
    sortable: Boolean(source['sortable'] ?? source['ordenable']),
    default: Boolean(source['default'] ?? source['por_defecto']),
  };
}

function firstArray(source: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) if (Array.isArray(source[key])) return source[key];
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function stringValue(value: unknown): string { return typeof value === 'string' ? value : String(value ?? ''); }
function numberValue(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) ? value : 0; }
function isField(value: ReporteCampo): boolean { return Boolean(value.key); }
