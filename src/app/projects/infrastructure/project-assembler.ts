import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Project } from '../domain/model/project.entity';
import { ProjectStatus } from '../domain/model/project-status';
import { ProjectResource, ProjectsResponse } from './project.resource';

/**
 * Maps projects to and from their API resource (amounts and fractions travel as numbers).
 */
export class ProjectAssembler implements BaseAssembler<Project, ProjectResource, ProjectsResponse> {
  toEntitiesFromResponse(response: ProjectsResponse): Project[] {
    return response.projects.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: ProjectResource): Project {
    return new Project({
      id: resource.id,
      code: resource.code,
      name: resource.name,
      description: resource.description ?? '',
      clientId: resource.clientId,
      budget: Number(resource.budget),
      currency: resource.currency,
      quotedOn: resource.quotedOn,
      status: resource.status as ProjectStatus,
      participation: Number(resource.participation),
      salesCommissionRate: Number(resource.salesCommissionRate),
      accumulatedProgress: Number(resource.accumulatedProgress ?? 0),
      estimatedDirectCost: Number(resource.estimatedDirectCost ?? 0),
    });
  }

  toResourceFromEntity(entity: Project): ProjectResource {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      description: entity.description || null,
      clientId: entity.clientId,
      budget: entity.budget,
      currency: entity.currency,
      quotedOn: entity.quotedOn,
      status: entity.status,
      participation: entity.participation,
      salesCommissionRate: entity.salesCommissionRate,
      accumulatedProgress: entity.accumulatedProgress,
      estimatedDirectCost: entity.estimatedDirectCost,
    };
  }
}
