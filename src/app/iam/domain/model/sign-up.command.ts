import { Role } from './role';

/**
 * Data to register a new user (only an administrator can do it in the backend).
 */
export class SignUpCommand {
  readonly #username: string;
  readonly #password: string;
  readonly #fullName: string;
  readonly #role: Role;

  constructor(command: { username: string; password: string; fullName: string; role: Role }) {
    this.#username = command.username;
    this.#password = command.password;
    this.#fullName = command.fullName;
    this.#role = command.role;
  }

  get username(): string {
    return this.#username;
  }

  get password(): string {
    return this.#password;
  }

  get fullName(): string {
    return this.#fullName;
  }

  get role(): Role {
    return this.#role;
  }
}
