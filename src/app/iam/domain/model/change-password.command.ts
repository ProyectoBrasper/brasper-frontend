/** Changes the signed-in user's own password (backend `ChangePasswordResource`). */
export interface ChangePasswordCommand {
  currentPassword: string;
  newPassword: string;
}
