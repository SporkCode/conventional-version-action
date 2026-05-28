export enum ChangeLevel {
  Major = 'major',
  Minor = 'minor',
  Patch = 'patch',
  None = 'none'
}

export class SemanticVersion {
  constructor(
    readonly major: number,
    readonly minor: number,
    readonly patch: number
  ) {}

  increment(level: ChangeLevel): SemanticVersion {
    switch (level) {
      case ChangeLevel.Major:
        return new SemanticVersion(this.major + 1, 0, 0)
      case ChangeLevel.Minor:
        return new SemanticVersion(this.major, this.minor + 1, 0)
      case ChangeLevel.Patch:
        return new SemanticVersion(this.major, this.minor, this.patch + 1)
      case ChangeLevel.None:
        throw new Error('Cannot increment version with ChangeLevel.None')
    }
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`
  }
}
