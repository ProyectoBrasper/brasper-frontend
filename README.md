# Brasper Frontend

App web de gestión financiera de Brasper: proyectos, facturación, gastos, personal, tesorería, contabilidad y reportes.

## Stack
- Angular 22 (standalone, signals, sin zone.js) + Angular Material (M3)
- @ngx-translate (es / en)
- json-server 0.17.4 como fake API mientras se integra el backend (Spring Boot)
- Vitest + ESLint
- Node.js 24 o superior (`^22.22.3 || ^24.15.0 || >=26`)

## Comandos
| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:4200 |
| `npm run build` | Build de producción en `dist/` |
| `npm test` | Tests (Vitest) |
| `npm run lint` | ESLint |

## Diseño
- Diagramas de clases (fuente de verdad): `docs/uml-frontend/`
- Un bounded context por carpeta en `src/app/` (`shared`, `iam`, `projects`, `billing`, `expenses`, `staff`, `treasury`, `accounting`, `reporting`), cada uno con `domain/model`, `infrastructure`, `application` y `presentation`.

## Git (gitflow)
- `main` = producción, `develop` = integración. Nunca commit directo a ninguna de las dos.
- Ramas: `feature/<contexto>-<tema>`, `fix/<tema>`, `chore/<tema>`, `release/<versión>`, `hotfix/<tema>`; salen de `develop` y vuelven por PR con squash.
- Commits: Conventional Commits en inglés, `feat(<contexto>): <asunto>` (imperativo, ≤ 72 caracteres).
- PRs chicos y enfocados; CI (lint, test, build) en verde antes de mergear.
