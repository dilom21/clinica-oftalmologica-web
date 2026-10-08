import { VoiceRecognitionService } from './voice-recognition.service';

class RecognitionMock {
  static latest: RecognitionMock | null = null;
  lang = '';
  continuous = true;
  interimResults = true;
  maxAlternatives = 0;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;
  constructor() { RecognitionMock.latest = this; }
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; this.onend?.(); }
  abort(): void { this.stopped = true; this.onend?.(); }
  result(text: string): void { this.onresult?.({ results: [[{ transcript: text }]] }); this.onend?.(); }
  error(error: string): void { this.onerror?.({ error }); this.onend?.(); }
}

describe('VoiceRecognitionService', () => {
  const browserWindow = window as Window & { SpeechRecognition?: unknown };
  let previous: unknown;

  beforeEach(() => {
    previous = browserWindow.SpeechRecognition;
    Object.defineProperty(browserWindow, 'SpeechRecognition', { configurable: true, value: RecognitionMock });
    RecognitionMock.latest = null;
  });
  afterEach(() => Object.defineProperty(browserWindow, 'SpeechRecognition', { configurable: true, value: previous }));

  it('detects support, configures Spanish speech and does not auto-start', () => {
    const service = new VoiceRecognitionService();
    expect(service.isSupported()).toBe(true);
    expect(RecognitionMock.latest).toBeNull();
    service.start();
    expect(RecognitionMock.latest?.started).toBe(true);
    expect(RecognitionMock.latest?.lang).toBe('es-BO');
    expect(RecognitionMock.latest?.continuous).toBe(false);
    expect(RecognitionMock.latest?.maxAlternatives).toBe(1);
  });

  it('emits final results, stops and maps denied permission to a friendly message', () => {
    const service = new VoiceRecognitionService();
    let result = '';
    service.results$.subscribe(({ transcript }) => result = transcript);
    service.start();
    const recognition = RecognitionMock.latest!;
    recognition.result('Texto clínico');
    expect(result).toBe('Texto clínico');
    expect(service.resultadoFinal()).toBe('Texto clínico');
    service.start();
    const stoppableRecognition = RecognitionMock.latest!;
    service.stop();
    expect(stoppableRecognition.stopped).toBe(true);
    service.start();
    const permissionRecognition = RecognitionMock.latest!;
    permissionRecognition.error('not-allowed');
    expect(service.state()).toBe('error');
    expect(service.mensajeError()).toContain('permisos');
  });

  it('reports unsupported browsers without attempting to start', () => {
    Object.defineProperty(browserWindow, 'SpeechRecognition', { configurable: true, value: undefined });
    const service = new VoiceRecognitionService();
    service.start();
    expect(service.state()).toBe('unsupported');
    expect(service.mensajeError()).toContain('no está disponible');
  });

  it('ignores callbacks from an older session after a new session starts', () => {
    const service = new VoiceRecognitionService();
    service.start();
    const oldRecognition = RecognitionMock.latest!;
    const oldResult = oldRecognition.onresult;
    service.start();
    oldResult?.({ results: [[{ transcript: 'Texto obsoleto' }]] });
    expect(service.resultadoFinal()).toBe('');
    expect(service.state()).toBe('listening');
  });

  it('keeps the logical attempt through es-BO fallback', () => {
    const service = new VoiceRecognitionService();
    let result = '';
    service.results$.subscribe((event) => result = event.transcript);
    service.start({ fallbackLang: 'es-ES' });
    const first = RecognitionMock.latest!;
    first.error('language-not-supported');
    const fallback = RecognitionMock.latest!;
    expect(fallback.lang).toBe('es-ES');
    fallback.result('Texto alternativo');
    expect(result).toBe('Texto alternativo');
  });

  it('emits one terminal stop event and makes repeated stop harmless', () => {
    const service = new VoiceRecognitionService();
    const terminals: string[] = [];
    service.terminal$.subscribe((event) => terminals.push(event.reason));
    service.start();
    service.stop();
    service.stop();
    expect(terminals).toEqual(['stop']);
  });

  it('finishes a no-speech/error attempt without leaving the recognition attached', () => {
    const service = new VoiceRecognitionService();
    service.start();
    const recognition = RecognitionMock.latest!;
    recognition.error('no-speech');
    expect(service.state()).toBe('idle');
    expect(service.terminal$).toBeTruthy();
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onend).toBeNull();
  });
});
