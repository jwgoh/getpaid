export class RetentionMisconfiguredError extends Error {
  constructor(name: string) {
    super(`${name} must be > 0`);
    this.name = "RetentionMisconfiguredError";
  }
}
