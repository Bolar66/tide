export class ShareError extends Error {
  constructor(public readonly code: 'invite-invalid' | 'no-account') {
    super(code);
  }
}
