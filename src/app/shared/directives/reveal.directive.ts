import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ScrollRevealService } from '../services/scroll-reveal.service';

export type RevealDirection = 'up' | 'down' | 'left' | 'right';

@Directive({
  selector: '[appReveal]',
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input() appReveal: RevealDirection = 'up';
  @Input() revealDelay = 0;
  @Input() revealDuration = 700;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly scrollReveal: ScrollRevealService,
  ) {}

  ngOnInit(): void {
    if (this.scrollReveal.prefersReducedMotion) {
      return;
    }
    this.scrollReveal.observe(this.elementRef.nativeElement, {
      direction: this.appReveal,
      delay: this.revealDelay,
      duration: this.revealDuration,
    });
  }

  ngOnDestroy(): void {
    this.scrollReveal.unobserve(this.elementRef.nativeElement);
  }
}