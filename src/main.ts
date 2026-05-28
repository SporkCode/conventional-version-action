import * as core from '@actions/core'
import {
  getLastVersion,
  getCommitMessages,
  parseCommits,
  determineBump
} from './commits.js'
import { ChangeLevel } from './semanticVersion.js'

export async function run(): Promise<void> {
  try {
    const tagPrefix = core.getInput('tag-prefix') || 'v'

    const lastVersion = await getLastVersion(tagPrefix)
    core.info(
      lastVersion
        ? `Last version: ${lastVersion}`
        : 'No previous tag found, parsing all commits'
    )

    const lastTag = lastVersion ? `${tagPrefix}${lastVersion}` : null
    const rawCommits = await getCommitMessages(lastTag)
    const commits = parseCommits(rawCommits)
    const change = determineBump(commits)

    core.info(
      `Parsed ${commits.length} commit(s) since ${lastVersion ?? 'beginning'}`
    )
    core.info(`Suggested version bump: ${change}`)

    const next =
      lastVersion && change !== ChangeLevel.None
        ? lastVersion.increment(change).toString()
        : ''

    core.setOutput('change', change)
    core.setOutput('last', lastVersion?.toString() ?? '')
    core.setOutput('next', next)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
