import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Client } from '../domain/model/client.entity';
import { ClientsApiEndpoint } from './clients-api-endpoint';

/**
 * Projects context facade over its endpoints (clients; projects, progress and cost estimates follow).
 */
@Injectable({ providedIn: 'root' })
export class ProjectsApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly clientsEndpoint = new ClientsApiEndpoint(this.http);

  getClients(): Observable<Client[]> {
    return this.clientsEndpoint.getAll();
  }

  getClientById(id: number): Observable<Client> {
    return this.clientsEndpoint.getById(id);
  }

  createClient(client: Client): Observable<Client> {
    return this.clientsEndpoint.create(client);
  }

  updateClient(client: Client): Observable<Client> {
    return this.clientsEndpoint.update(client, client.id);
  }
}
