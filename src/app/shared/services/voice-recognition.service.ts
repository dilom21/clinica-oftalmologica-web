import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type VoiceRecognitionState = 'idle' | 'listening' | 'processing' | 'success' | 'error' | 'unsupported';

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  sessionId: number;
}

export interface VoiceRecognitionTerminal {
  sessionId: number;
  reason: 'success' | 'error' | 'stop' | 'abort' | 'no-speech' | 'permission-denied';
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

@Injectable({ providedIn: 'root' })
export class VoiceRecognitionService {
  readonly state = signal<VoiceRecognitionState>('idle');
  readonly resultadoFinal = signal('');
  readonly mensajeError = signal<string | null>(null);
  readonly supported = signal(this.resolveConstructor() !== null);

  private readonly resultsSubject = new Subject<VoiceRecognitionResult>();
  private readonly terminalSubject = new Subject<VoiceRecognitionTerminal>();
  private recognition: SpeechRecognitionLike | null = null;
  private sessionId = 0;
  private finishedSessionId: number | null = null;

  get results$(): Observable<VoiceRecognitionResult> {
    return this.resultsSubject.asObservable();
  }

  get terminal$(): Observable<VoiceRecognitionTerminal> {
    return this.terminalSubject.asObservable();
  }

  isSupported(): boolean {
    return this.supported();
  }

  start(options: { lang?: string; fallbackLang?: string } = {}, sessionIdOverride?: number): number {
    this.invalidateRecognition(false);
    const currentSessionId = sessionIdOverride ?? ++this.sessionId;
    const Recognition = this.resolveConstructor();
    if (!Recognition) {
      this.supported.set(false);
      this.state.set('unsupported');
      this.mensajeError.set('El reconocimiento de voz no está disponible en este navegador. Puedes escribir el texto manualmente.');
      return currentSessionId;
    }

    this.resultadoFinal.set('');
    this.mensajeError.set(null);
    const recognition = new Recognition();
    this.recognition = recognition;
    this.finishedSessionId = null;
    recognition.lang = options.lang ?? 'es-BO';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0]?.transcript ?? '').join(' ').trim();
      if (!this.isCurrent(currentSessionId, recognition) || !transcript) return;
      this.resultadoFinal.set(transcript);
      this.resultsSubject.next({ transcript, isFinal: true, sessionId: currentSessionId });
      this.state.set('success');
      this.finish(currentSessionId, recognition, 'success', false);
    };
    recognition.onerror = (event) => {
      if (!this.isCurrent(currentSessionId, recognition)) return;
      if (event.error === 'language-not-supported' && options.fallbackLang && recognition.lang !== options.fallbackLang) {
        this.detach(currentSessionId, recognition);
        if (this.sessionId === currentSessionId) this.start({ lang: options.fallbackLang }, currentSessionId);
        return;
      }
      const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      this.mensajeError.set(denied
        ? 'No se pudo acceder al micrófono. Revisa los permisos del navegador.'
        : 'No se pudo procesar el dictado. Inténtalo nuevamente.');
      this.state.set('error');
      this.finish(currentSessionId, recognition, denied ? 'permission-denied' : event.error === 'no-speech' ? 'no-speech' : 'error', true);
    };
    recognition.onend = () => {
      if (!this.isCurrent(currentSessionId, recognition)) return;
      if (this.state() === 'listening') {
        this.state.set(this.resultadoFinal() ? 'success' : 'idle');
        this.finish(currentSessionId, recognition, this.resultadoFinal() ? 'success' : 'no-speech', true);
      } else {
        this.finish(currentSessionId, recognition, this.state() === 'error' ? 'error' : 'success', false);
      }
    };
    this.state.set('listening');
    try {
      recognition.start();
    } catch {
      this.state.set('error');
      this.mensajeError.set('No se pudo iniciar el reconocimiento de voz. Inténtalo nuevamente.');
      this.finish(currentSessionId, recognition, 'error', true);
    }
    return currentSessionId;
  }

  stop(): void {
    const recognition = this.recognition;
    const currentSessionId = this.sessionId;
    if (!recognition || this.finishedSessionId === currentSessionId) return;
    this.finish(currentSessionId, recognition, 'stop', true);
    try { recognition.stop(); } catch { try { recognition.abort(); } catch { /* browser may already be stopped */ } }
  }

  private isCurrent(sessionId: number, recognition: SpeechRecognitionLike): boolean {
    return this.sessionId === sessionId && this.recognition === recognition && this.finishedSessionId !== sessionId;
  }

  private detach(sessionId: number, recognition: SpeechRecognitionLike): void {
    if (this.sessionId !== sessionId) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    if (this.recognition === recognition) this.recognition = null;
  }

  private finish(sessionId: number, recognition: SpeechRecognitionLike, reason: VoiceRecognitionTerminal['reason'], emit: boolean): void {
    if (this.finishedSessionId === sessionId) return;
    this.finishedSessionId = sessionId;
    this.detach(sessionId, recognition);
    if (reason === 'stop' || reason === 'abort' || reason === 'no-speech') this.state.set('idle');
    if (emit) this.terminalSubject.next({ sessionId, reason });
  }

  private invalidateRecognition(emit: boolean): void {
    const recognition = this.recognition;
    if (!recognition) return;
    const oldSessionId = this.sessionId;
    this.detach(oldSessionId, recognition);
    if (emit) this.terminalSubject.next({ sessionId: oldSessionId, reason: 'abort' });
    try { recognition.abort(); } catch { /* browser may already be stopped */ }
  }

  private resolveConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') return null;
    const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
  }
}
