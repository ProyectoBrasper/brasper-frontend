import { Component, computed, inject, OnInit, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { initialsOf } from '../../../../shared/presentation/initials';
import { ProjectsStore } from '../../../application/projects.store';
import { Client } from '../../../domain/model/client.entity';

/**
 * Clients the company quotes and invoices projects to.
 */
@Component({
  selector: 'app-client-list',
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './client-list.html',
})
export class ClientList implements OnInit {
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);

  readonly loading = this.projectsStore.loading;
  readonly error = this.projectsStore.error;
  readonly canWrite = this.projectsStore.canWrite;
  readonly displayedColumns = computed(() => {
    const columns = ['businessName', 'ruc', 'contactName', 'phone', 'email'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<Client>(this.projectsStore.clients());
    source.sortingDataAccessor = (client, column) => String(client[column as keyof Client] ?? '').toLowerCase();
    const sort = this.sort();
    if (sort) {
      source.sort = sort;
    }
    const paginator = this.paginator();
    if (paginator) {
      source.paginator = paginator;
    }
    return source;
  });

  readonly initials = initialsOf;

  ngOnInit(): void {
    this.projectsStore.loadClients();
  }

  onEdit(id: number): void {
    if (this.canWrite()) {
      void this.router.navigate(['/projects/clients', id, 'edit']);
    }
  }

  onAdd(): void {
    void this.router.navigate(['/projects/clients/new']);
  }
}
