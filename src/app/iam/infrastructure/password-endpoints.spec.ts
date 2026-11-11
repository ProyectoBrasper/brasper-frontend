import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PasswordApiEndpoint } from './password-api-endpoint';
import { UsersApiEndpoint } from './users-api-endpoint';

describe('password and reactivation endpoints', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  it('changes the own password with PUT /auth/password', async () => {
    const command = { currentPassword: 'old12345', newPassword: 'new12345' };
    const result = firstValueFrom(new PasswordApiEndpoint(client).change(command));
    const request = http.expectOne((r) => r.url.endsWith('/auth/password'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(command);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await result;
  });

  it('surfaces the backend detail when the current password is wrong', async () => {
    const result = firstValueFrom(new PasswordApiEndpoint(client).change({ currentPassword: 'x', newPassword: 'new12345' }));
    http
      .expectOne((r) => r.url.endsWith('/auth/password'))
      .flush({ detail: 'La contraseña actual no es correcta.' }, { status: 422, statusText: 'Unprocessable Entity' });
    await expect(result).rejects.toThrow('La contraseña actual no es correcta.');
  });

  it('resets a user password with PUT /users/{id}/password', async () => {
    const result = firstValueFrom(new UsersApiEndpoint(client).resetPassword(4, 'new12345'));
    const request = http.expectOne((r) => r.url.endsWith('/users/4/password'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ newPassword: 'new12345' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await result;
  });

  it('reactivates a user with POST /users/{id}/reactivate and reads it back', async () => {
    const result = firstValueFrom(new UsersApiEndpoint(client).reactivate(5));
    const request = http.expectOne((r) => r.url.endsWith('/users/5/reactivate'));
    expect(request.request.method).toBe('POST');
    request.flush({ id: 5, username: 'pramos', fullName: 'Pedro Ramos', role: 'ROLE_ENGINEER', active: true });
    expect((await result).active).toBe(true);
  });
});
