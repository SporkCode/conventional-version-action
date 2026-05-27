import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as commits from '../__fixtures__/commits.js'
import { ChangeLevel, SemanticVersion } from '../src/semanticVersion.js'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/commits.js', () => commits)

const { run } = await import('../src/main.js')

const PARSED_COMMITS = [
  { hash: 'abc', type: 'feat', scope: null, subject: 'add thing', breaking: false, raw: 'feat: add thing' }
]

describe('main.ts', () => {
  beforeEach(() => {
    core.getInput.mockReturnValue('v')
    commits.getLastVersion.mockResolvedValue(new SemanticVersion(1, 0, 0))
    commits.getCommitMessages.mockResolvedValue([{ hash: 'abc', message: 'feat: add thing' }])
    commits.parseCommits.mockReturnValue(PARSED_COMMITS)
    commits.determineBump.mockReturnValue(ChangeLevel.Minor)
  })

  afterEach(() => { jest.resetAllMocks() })

  it('outputs change, last, and next on success', async () => {
    await run()

    expect(core.setOutput).toHaveBeenCalledWith('change', 'minor')
    expect(core.setOutput).toHaveBeenCalledWith('last', '1.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('next', '1.1.0')
  })

  it('outputs empty next when change is none', async () => {
    commits.determineBump.mockReturnValue(ChangeLevel.None)
    await run()

    expect(core.setOutput).toHaveBeenCalledWith('next', '')
  })

  it('outputs empty last and next when no previous tag exists', async () => {
    commits.getLastVersion.mockResolvedValue(null)
    commits.determineBump.mockReturnValue(ChangeLevel.Minor)
    await run()

    expect(core.setOutput).toHaveBeenCalledWith('last', '')
    expect(core.setOutput).toHaveBeenCalledWith('next', '')
  })

  it('passes tag-prefix input to getLastVersion', async () => {
    core.getInput.mockReturnValue('release-')
    await run()
    expect(commits.getLastVersion).toHaveBeenCalledWith('release-')
  })

  it('reconstructs the full tag ref for getCommitMessages', async () => {
    await run()
    expect(commits.getCommitMessages).toHaveBeenCalledWith('v1.0.0')
  })

  it('passes null to getCommitMessages when no previous tag exists', async () => {
    commits.getLastVersion.mockResolvedValue(null)
    await run()
    expect(commits.getCommitMessages).toHaveBeenCalledWith(null)
  })

  it('marks the action as failed when an error is thrown', async () => {
    commits.getLastVersion.mockRejectedValue(new Error('git not found'))
    await run()
    expect(core.setFailed).toHaveBeenCalledWith('git not found')
  })
})
