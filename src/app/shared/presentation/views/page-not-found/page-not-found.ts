import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Shown for any unknown route.
 */
@Component({
  selector: 'app-page-not-found',
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './page-not-found.html',
  styleUrl: './page-not-found.css',
})
export class PageNotFound implements OnInit {
  private readonly router = inject(Router);

  invalidPath = '';

  ngOnInit(): void {
    this.invalidPath = this.router.url;
  }

  navigateToHome(): void {
    void this.router.navigate(['/']);
  }
}
