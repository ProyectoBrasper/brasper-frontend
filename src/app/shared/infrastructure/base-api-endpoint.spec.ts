import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BaseAssembler } from './base-assembler';
import { BaseApiEndpoint } from './base-api-endpoint';
import { BaseResource } from './base-resource';
import { BaseResponse } from './base-response';

interface Thing {
  id: number;
  name: string;
}
interface ThingResource extends BaseResource {
  name: string;
}
interface ThingsResponse extends BaseResponse {
  things: ThingResource[];
}

class ThingAssembler implements BaseAssembler<Thing, ThingResource, ThingsResponse> {
  toEntitiesFromResponse = (response: ThingsResponse): Thing[] =>
    response.things.map((r) => this.toEntityFromResource(r));
  toEntityFromResource = (resource: ThingResource): Thing => ({ ...resource });
  toResourceFromEntity = (entity: Thing): ThingResource => ({ ...entity });
}

class ThingsApiEndpoint extends BaseApiEndpoint<Thing, ThingResource, ThingsResponse, ThingAssembler> {
  constructor(http: HttpClient) {
    super(http, '/api/things', new ThingAssembler());
  }
}

describe('BaseApiEndpoint', () => {
  let endpoint: ThingsApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new ThingsApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps a plain array of resources', async () => {
    const result = firstValueFrom(endpoint.getAll());
    http.expectOne('/api/things').flush([{ id: 1, name: 'A' }]);
    expect(await result).toEqual([{ id: 1, name: 'A' }]);
  });

  it('maps a response envelope', async () => {
    const result = firstValueFrom(endpoint.getAll());
    http.expectOne('/api/things').flush({ things: [{ id: 2, name: 'B' }] });
    expect(await result).toEqual([{ id: 2, name: 'B' }]);
  });

  it('creates without sending the id', async () => {
    const result = firstValueFrom(endpoint.create({ id: 0, name: 'New' }));
    const request = http.expectOne('/api/things');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'New' });
    request.flush({ id: 7, name: 'New' });
    expect((await result).id).toBe(7);
  });

  it('updates with PUT on the item url', async () => {
    const result = firstValueFrom(endpoint.update({ id: 3, name: 'C' }, 3));
    const request = http.expectOne('/api/things/3');
    expect(request.request.method).toBe('PUT');
    request.flush({ id: 3, name: 'C' });
    expect((await result).name).toBe('C');
  });

  it('uses the ProblemDetail detail as the error message', async () => {
    const result = firstValueFrom(endpoint.getById(9));
    http
      .expectOne('/api/things/9')
      .flush({ title: 'Conflict', detail: 'El RUC ya existe' }, { status: 409, statusText: 'Conflict' });
    await expect(result).rejects.toThrow('El RUC ya existe');
  });

  it('reports a not found resource', async () => {
    const result = firstValueFrom(endpoint.getById(9));
    http.expectOne('/api/things/9').flush(null, { status: 404, statusText: 'Not Found' });
    await expect(result).rejects.toThrow('Failed to fetch entity: resource not found');
  });
});
