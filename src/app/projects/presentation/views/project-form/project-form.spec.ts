import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { ProjectsStore } from '../../../application/projects.store';
import { Project } from '../../../domain/model/project.entity';
import { ProjectStatus } from '../../../domain/model/project-status';
import { PERU_DATE_FORMATS, PeruDateAdapter } from '../../../../shared/presentation/peru-date-adapter';
import { ProjectForm } from './project-form';

describe('ProjectForm', () => {
  let createProject: ReturnType<typeof vi.fn>;
  let component: ProjectForm;

  beforeEach(() => {
    createProject = vi.fn();
    TestBed.configureTestingModule({
      imports: [ProjectForm],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'es' }),
        { provide: DateAdapter, useClass: PeruDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: PERU_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
        {
          provide: ProjectsStore,
          useValue: {
            projects: signal<Project[]>([]),
            clients: signal([{ id: 4, businessName: 'Logística Andina del Pacífico S.A.C.' }]),
            loading: computed(() => false),
            error: signal(null),
            clearError: vi.fn(),
            loadClients: vi.fn(),
            loadProjects: vi.fn(),
            createProject,
          },
        },
      ],
    });
    component = TestBed.createComponent(ProjectForm).componentInstance;
  });

  it('rejects a malformed project code', () => {
    component.projectForm.controls.code.setValue('6BR-NOV-2026');
    expect(component.projectForm.controls.code.hasError('projectCode')).toBe(true);
  });

  it('sends an upper-cased code, an ISO date and fractions instead of percentages', () => {
    component.projectForm.setValue({
      code: '006br-nov-2026',
      quotedOn: new Date(2026, 10, 4),
      name: 'Sistema contra incendios',
      description: '',
      clientId: 4,
      currency: 'PEN',
      budget: 380000,
      participation: 100,
      salesCommissionRate: 2.5,
    });
    component.onSubmit();

    const [project, navigateTo] = createProject.mock.calls[0] as [Project, string[]];
    expect(project.code).toBe('006BR-NOV-2026');
    expect(project.quotedOn).toBe('2026-11-04');
    expect(project.participation).toBe(1);
    expect(project.salesCommissionRate).toBe(0.025);
    expect(project.status).toBe(ProjectStatus.QUOTED);
    expect(navigateTo).toEqual(['/projects']);
  });

  it('does not submit while required fields are missing', () => {
    component.onSubmit();
    expect(createProject).not.toHaveBeenCalled();
  });
});
