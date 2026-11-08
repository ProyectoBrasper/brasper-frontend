import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs';
import { IamStore } from '../../../../iam/application/iam.store';
import { AuthenticationSection } from '../../../../iam/presentation/components/authentication-section/authentication-section';
import { FooterContent } from '../footer-content/footer-content';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { activeLinkFor, groupOptions, optionsFor } from './navigation';

/**
 * App shell: dark side menu (filtered by role) + toolbar + routed content.
 * Without a session it renders only the routed page (sign-in).
 * Side mode on desktop; modal drawer (`over`) below 600px.
 */
@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    AuthenticationSection,
    FooterContent,
    LanguageSwitcher,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  readonly isSignedIn = this.iamStore.isSignedIn;
  readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 599px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  readonly options = computed(() => optionsFor(this.iamStore.currentRole()));
  readonly sections = computed(() => groupOptions(this.options()));
  readonly sidenavOpened = signal(true);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly activeLink = computed(() => activeLinkFor(this.url(), this.options()));

  constructor() {
    // Open as a side panel on desktop, closed drawer on mobile.
    effect(() => this.sidenavOpened.set(!this.isMobile()));
  }

  toggleSidenav(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  /** On mobile the drawer closes after choosing an option. */
  onNavigate(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }
}
