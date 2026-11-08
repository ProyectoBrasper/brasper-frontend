import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { IamStore } from '../application/iam.store';
import { authenticationInterceptor } from './authentication.interceptor';

describe('authenticationInterceptor', () => {
  let token: string | null;
  let signOut: ReturnType<typeof vi.fn>;
  let http: HttpClient;
  let backend: HttpTestingController;
  const api = `${environment.platformProviderApiBaseUrl}/projects`;

  beforeEach(() => {
    token = 'fake-jwt.1';
    signOut = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authenticationInterceptor])),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'es' }),
        { provide: IamStore, useValue: { token: () => token, signOut } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adds the bearer token and the language to API requests', () => {
    http.get(api).subscribe();
    const request = backend.expectOne(api).request;
    expect(request.headers.get('Authorization')).toBe('Bearer fake-jwt.1');
    expect(request.headers.get('Accept-Language')).toBe('es');
  });

  it('does not touch requests to other hosts', () => {
    http.get('/i18n/es.json').subscribe();
    expect(backend.expectOne('/i18n/es.json').request.headers.has('Authorization')).toBe(false);
  });

  it('signs out when the API answers 401 to an authenticated request', () => {
    http.get(api).subscribe({ error: () => undefined });
    backend.expectOne(api).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(signOut).toHaveBeenCalled();
  });

  it('does not sign out on a failed sign-in (no token yet)', () => {
    token = null;
    http.get(api).subscribe({ error: () => undefined });
    backend.expectOne(api).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(signOut).not.toHaveBeenCalled();
  });
});
