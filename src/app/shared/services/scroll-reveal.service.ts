import { Injectable } from '@angular/core';

export interface RevealOptions {
  direction: 'up' | 'down' | 'left' | 'right';
  delay: number;
  duration: number;
}

const DEFAULT_DURATION = 700;

@Injectable({ providedIn: 'root' })
export class ScrollRevealService {
  private observer: IntersectionObserver | null = null;
  private targets = new Map<Element, { element: HTMLElement; options: RevealOptions }>();
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  observe(element: HTMLElement, options: RevealOptions): void {
    if (this.reducedMotion) {
      return;
    }

    this.ensureObserver();
    this.targets.set(element, { element, options });

    element.style.opacity = '0';
    element.style.transform = this.initialTransform(options.direction);
    element.style.transition =
      `opacity ${options.duration}ms cubic-bezier(0.22, 1, 0.36, 1), ` +
      `transform ${options.duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    element.style.transitionDelay = `${options.delay}ms`;
    element.style.willChange = 'opacity, transform';

    this.observer!.observe(element);
  }

  unobserve(element: HTMLElement): void {
    this.targets.delete(element);
    this.observer?.unobserve(element);
  }

  get prefersReducedMotion(): boolean {
    return this.reducedMotion;
  }

  private ensureObserver(): void {
    if (this.observer) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = this.targets.get(entry.target);
          if (!target) {
            continue;
          }

          if (entry.isIntersecting) {
            target.element.style.opacity = '1';
            target.element.style.transform = 'translate(0, 0)';
            target.element.style.transitionDelay = `${target.options.delay}ms`;
            this.observer!.unobserve(entry.target);
            this.targets.delete(entry.target);
          }
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      },
    );
  }

  private initialTransform(direction: RevealOptions['direction']): string {
    const distance = 40;
    switch (direction) {
      case 'left':
        return `translateX(-${distance}px)`;
      case 'right':
        return `translateX(${distance}px)`;
      case 'down':
        return `translateY(-${distance}px)`;
      default:
        return `translateY(${distance}px)`;
    }
  }
}