import { getExecOutput } from '@actions/exec'
import { CommitParser } from 'conventional-commits-parser'
import { ChangeLevel, SemanticVersion } from './semanticVersion.js'

export { SemanticVersion }

export interface RawCommit {
  hash: string
  message: string
}

export interface ConventionalCommit {
  hash: string
  type: string | null
  scope: string | null
  subject: string | null
  breaking: boolean
  raw: string
}

export async function getLastVersion(
  prefix: string
): Promise<SemanticVersion | null> {
  const { exitCode, stdout } = await getExecOutput(
    'git',
    [
      'describe',
      '--tags',
      '--abbrev=0',
      '--match',
      `${prefix}[0-9]*.[0-9]*.[0-9]*`
    ],
    { ignoreReturnCode: true, silent: true }
  )
  if (exitCode !== 0) return null
  const tag = stdout.trim()
  const versionStr = tag.startsWith(prefix) ? tag.slice(prefix.length) : tag
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(versionStr)
  if (!match) return null
  return new SemanticVersion(
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10)
  )
}

export async function getCommitMessages(
  since: string | null
): Promise<RawCommit[]> {
  const range = since ? [`${since}..HEAD`] : []
  const { stdout } = await getExecOutput(
    'git',
    ['log', '--format=%H%x1f%B%x1e', ...range],
    { silent: true }
  )

  return stdout
    .split('\x1e')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((record) => {
      const sepIdx = record.indexOf('\x1f')
      return {
        hash: record.slice(0, sepIdx).trim(),
        message: record.slice(sepIdx + 1).trim()
      }
    })
}

export function parseCommits(rawCommits: RawCommit[]): ConventionalCommit[] {
  const parser = new CommitParser()
  return rawCommits.map(({ hash, message }) => {
    const parsed = parser.parse(message)
    return {
      hash,
      type: parsed.type ?? null,
      scope: parsed.scope ?? null,
      subject: parsed.subject ?? null,
      breaking: parsed.notes.some((n) => n.title === 'BREAKING CHANGE'),
      raw: message
    }
  })
}

export function determineBump(commits: ConventionalCommit[]): ChangeLevel {
  if (commits.some((c) => c.breaking)) return ChangeLevel.Major
  if (commits.some((c) => c.type === 'feat')) return ChangeLevel.Minor
  if (commits.some((c) => c.type === 'fix' || c.type === 'perf'))
    return ChangeLevel.Patch
  return ChangeLevel.None
}
