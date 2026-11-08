/**
 * Credentials to start a session.
 */
export class SignInCommand {
  readonly #username: string;
  readonly #password: string;

  constructor(command: { username: string; password: string }) {
    this.#username = command.username;
    this.#password = command.password;
  }

  get username(): string {
    return this.#username;
  }

  get password(): string {
    return this.#password;
  }
}
