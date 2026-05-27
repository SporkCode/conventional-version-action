import { jest, describe, it, expect, afterEach } from '@jest/globals'
import * as exec from '../__fixtures__/exec.js'
import { SemanticVersion } from '../src/semanticVersion.js'

jest.unstable_mockModule('@actions/exec', () => exec)

const { getLastVersion, getCommitMessages, parseCommits, determineBump } =
  await import('../src/commits.js')

describe('commits.ts', () => {
  afterEach(() => { jest.resetAllMocks() })

  describe('getLastVersion', () => {
    it('parses a full semver tag into a SemanticVersion object', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'v1.2.3\n',
        stderr: ''
      })
      expect(await getLastVersion('v')).toEqual(new SemanticVersion(1, 2, 3))
    })

    it('strips a multi-character prefix before parsing', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'release-1.0.0\n',
        stderr: ''
      })
      expect(await getLastVersion('release-')).toEqual(
        new SemanticVersion(1, 0, 0)
      )
    })

    it('passes the full semver glob pattern to git describe', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'release-1.0.0\n',
        stderr: ''
      })
      await getLastVersion('release-')
      const args = exec.getExecOutput.mock.calls[0][1] as string[]
      expect(args).toContain('release-[0-9]*.[0-9]*.[0-9]*')
    })

    it('returns null when git describe finds no matching tag', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 128,
        stdout: '',
        stderr: 'fatal: No names found, cannot describe anything.'
      })
      expect(await getLastVersion('v')).toBeNull()
    })

    it('returns null when the tag does not contain a valid semver', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'v-beta\n',
        stderr: ''
      })
      expect(await getLastVersion('v')).toBeNull()
    })
  })

  describe('getCommitMessages', () => {
    it('returns parsed commits since a given tag', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'abc123\x1ffeat: add login\x1e\ndef456\x1ffix: handle null\x1e',
        stderr: ''
      })
      const result = await getCommitMessages('v1.0.0')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ hash: 'abc123', message: 'feat: add login' })
      expect(result[1]).toEqual({ hash: 'def456', message: 'fix: handle null' })
    })

    it('includes the tag..HEAD range arg when since is provided', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
      await getCommitMessages('v1.0.0')
      const args = exec.getExecOutput.mock.calls[0][1] as string[]
      expect(args).toContain('v1.0.0..HEAD')
    })

    it('omits the range arg when since is null', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
      await getCommitMessages(null)
      const args = exec.getExecOutput.mock.calls[0][1] as string[]
      expect(args.some(a => a.includes('..HEAD'))).toBe(false)
    })

    it('handles multi-line commit messages', async () => {
      exec.getExecOutput.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'abc123\x1ffeat: add thing\n\nLonger description here.\x1e',
        stderr: ''
      })
      const result = await getCommitMessages(null)
      expect(result[0].message).toBe('feat: add thing\n\nLonger description here.')
    })
  })

  describe('parseCommits', () => {
    it('parses type, scope, and subject from a feat commit', () => {
      const result = parseCommits([{ hash: 'abc', message: 'feat(auth): add oauth' }])
      expect(result[0]).toMatchObject({
        type: 'feat',
        scope: 'auth',
        subject: 'add oauth',
        breaking: false,
        hash: 'abc'
      })
    })

    it('detects a breaking change from a BREAKING CHANGE footer note', () => {
      const message =
        'feat: remove legacy API\n\nBREAKING CHANGE: the /v1 endpoint has been removed'
      const result = parseCommits([{ hash: 'abc', message }])
      expect(result[0].breaking).toBe(true)
    })

    it('sets type to null for non-conventional commits', () => {
      const result = parseCommits([{ hash: 'abc', message: 'updated a bunch of stuff' }])
      expect(result[0].type).toBeNull()
    })

    it('preserves the raw message', () => {
      const message = 'fix: correct off-by-one error'
      const result = parseCommits([{ hash: 'abc', message }])
      expect(result[0].raw).toBe(message)
    })

    it('handles an empty input array', () => {
      expect(parseCommits([])).toEqual([])
    })
  })

  describe('determineBump', () => {
    it('returns major when any commit is breaking', () => {
      const commits = [
        { hash: 'a', type: 'feat', scope: null, subject: 'x', breaking: true, raw: '' }
      ]
      expect(determineBump(commits)).toBe('major')
    })

    it('returns major even when mixed with non-breaking commits', () => {
      const commits = [
        { hash: 'a', type: 'feat', scope: null, subject: 'x', breaking: false, raw: '' },
        { hash: 'b', type: 'fix', scope: null, subject: 'y', breaking: true, raw: '' }
      ]
      expect(determineBump(commits)).toBe('major')
    })

    it('returns minor for feat without breaking changes', () => {
      const commits = [
        { hash: 'a', type: 'feat', scope: null, subject: 'x', breaking: false, raw: '' }
      ]
      expect(determineBump(commits)).toBe('minor')
    })

    it('returns patch for fix', () => {
      const commits = [
        { hash: 'a', type: 'fix', scope: null, subject: 'x', breaking: false, raw: '' }
      ]
      expect(determineBump(commits)).toBe('patch')
    })

    it('returns patch for perf', () => {
      const commits = [
        { hash: 'a', type: 'perf', scope: null, subject: 'x', breaking: false, raw: '' }
      ]
      expect(determineBump(commits)).toBe('patch')
    })

    it('returns none for chore and docs commits', () => {
      const commits = [
        { hash: 'a', type: 'chore', scope: null, subject: 'x', breaking: false, raw: '' },
        { hash: 'b', type: 'docs', scope: null, subject: 'y', breaking: false, raw: '' }
      ]
      expect(determineBump(commits)).toBe('none')
    })

    it('returns none for an empty list', () => {
      expect(determineBump([])).toBe('none')
    })
  })
})
