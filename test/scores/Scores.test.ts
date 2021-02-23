import { getScores } from '../../src/scores/Scores'

import { getConfig } from '../../src/config'
jest.mock('../../src/config')

import { mocked } from 'ts-jest/utils'

describe('Scores', () => {
  beforeEach(() => {
    setMockPoints(3, 5, 7, 9)
  })

  it('should return the right scores for a non-googled image', () => {
    expect(getScores(false)).toEqual({
      guesser: 3,
      submitter: 7
    })
  })

  it('should return the right scores for a googled image', () => {
    expect(getScores(true)).toEqual({
      guesser: 5,
      submitter: 9
    })
  })

  it('should return the default scores if any are missing from config', () => {
    setMockPoints(1)
    expect(getScores(false)).toEqual({
      guesser: 1,
      submitter: 3
    })

    setMockPoints(undefined, undefined, 1)
    expect(getScores(false)).toEqual({
      guesser: 6,
      submitter: 1
    })

    mocked(getConfig).mockReturnValue({} as any)
    expect(getScores(false)).toEqual({
      guesser: 6,
      submitter: 3
    })

    mocked(getConfig).mockReturnValue({ points: {} } as any)
    expect(getScores(false)).toEqual({
      guesser: 6,
      submitter: 3
    })

    mocked(getConfig).mockReturnValue({ points: { guesser: {} } } as any)
    expect(getScores(false)).toEqual({
      guesser: 6,
      submitter: 3
    })
  })
})

const setMockPoints = (...points) => {
  mocked(getConfig).mockReturnValue({
    points: {
      guesser: {
        normal: points[0],
        google: points[1]
      },
      submitter: {
        normal: points[2],
        google: points[3]
      }
    }
  } as any)
}