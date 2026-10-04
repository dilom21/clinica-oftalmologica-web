import { __decorate } from "tslib";
import { Directive, Input } from '@angular/core';
let RevealDirective = class RevealDirective {
    elementRef;
    scrollReveal;
    appReveal = 'up';
    revealDelay = 0;
    revealDuration = 700;
    constructor(elementRef, scrollReveal) {
        this.elementRef = elementRef;
        this.scrollReveal = scrollReveal;
    }
    ngOnInit() {
        if (this.scrollReveal.prefersReducedMotion) {
            return;
        }
        this.scrollReveal.observe(this.elementRef.nativeElement, {
            direction: this.appReveal,
            delay: this.revealDelay,
            duration: this.revealDuration,
        });
    }
    ngOnDestroy() {
        this.scrollReveal.unobserve(this.elementRef.nativeElement);
    }
};
__decorate([
    Input()
], RevealDirective.prototype, "appReveal", void 0);
__decorate([
    Input()
], RevealDirective.prototype, "revealDelay", void 0);
__decorate([
    Input()
], RevealDirective.prototype, "revealDuration", void 0);
RevealDirective = __decorate([
    Directive({
        selector: '[appReveal]',
    })
], RevealDirective);
export { RevealDirective };
