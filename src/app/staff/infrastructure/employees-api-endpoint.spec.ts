import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EmployeesApiEndpoint } from './employees-api-endpoint';
import { EmployeeResource } from './employee.resource';

const resource: EmployeeResource = {
  id: 6,
  fullName: 'Andrea Salazar Ponce',
  dni: '46789016',
  position: null,
  monthlySalary: 3000,
  currency: 'PEN',
  hiredOn: '2026-11-02',
  terminatedOn: null,
  active: true,
};

describe('EmployeesApiEndpoint', () => {
  let endpoint: EmployeesApiEndpoint;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    endpoint = new EmployeesApiEndpoint(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('hires with the backend body, trimming text and sending a blank position as null', () => {
    endpoint
      .hire({ fullName: ' Andrea Salazar Ponce ', dni: '46789016', position: '  ', monthlySalary: 3000, currency: 'PEN', hiredOn: '2026-11-02' })
      .subscribe((employee) => expect(employee.position).toBe(''));
    const request = http.expectOne((r) => r.url.endsWith('/employees'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fullName: 'Andrea Salazar Ponce',
      dni: '46789016',
      position: null,
      monthlySalary: 3000,
      currency: 'PEN',
      hiredOn: '2026-11-02',
    });
    request.flush(resource);
  });

  it('updates only the position and the salary with PUT', () => {
    endpoint.updateEmployee(6, { position: 'Asistente', monthlySalary: 3200.5, currency: 'PEN' }).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/employees/6'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ position: 'Asistente', monthlySalary: 3200.5, currency: 'PEN' });
    request.flush({ ...resource, position: 'Asistente', monthlySalary: 3200.5 });
  });

  it('terminates with POST /{id}/termination and the date', () => {
    endpoint.terminate(6, '2026-11-30').subscribe((employee) => expect(employee.isActive()).toBe(false));
    const request = http.expectOne((r) => r.url.endsWith('/employees/6/termination'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ terminatedOn: '2026-11-30' });
    request.flush({ ...resource, terminatedOn: '2026-11-30', active: false });
  });
});
