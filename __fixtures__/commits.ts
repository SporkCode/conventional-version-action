import type * as commitsModule from '../src/commits.js'
import { jest } from '@jest/globals'

export const getLastVersion = jest.fn<typeof commitsModule.getLastVersion>()
export const getCommitMessages =
  jest.fn<typeof commitsModule.getCommitMessages>()
export const parseCommits = jest.fn<typeof commitsModule.parseCommits>()
export const determineBump = jest.fn<typeof commitsModule.determineBump>()
