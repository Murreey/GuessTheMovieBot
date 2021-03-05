import FlairManager from '../../src/scores/ScoreFlairManager'

describe('ScoreFlairManager', () => {
  let redditBot
  beforeEach(() => {
    redditBot = mockRedditBot("1234")
  })

  describe('getPoints', () => {
    it('returns users points as a number', async () => {
      const points = await FlairManager(redditBot).getPoints("username")
      expect(redditBot.getUserFlair).toHaveBeenCalledWith("username")
      expect(points).toBe(1234)
    })

    it('returns 0 if the user has no flair', async () => {
      redditBot = mockRedditBot(null)

      const points = await FlairManager(redditBot).getPoints("username")
      expect(points).toBe(0)
    })

    it('returns 0 if flair was non-numeric', async () => {
      redditBot = mockRedditBot("flair")

      const points = await FlairManager(redditBot).getPoints("username")
      expect(points).toBe(0)
    })

    it('strips out non-numeric characters', async () => {
      redditBot = mockRedditBot("ab45c6")

      const points = await FlairManager(redditBot).getPoints("username")
      expect(points).toBe(456)
    })
  })

  describe('setPoints', () => {
    it('sets the users flair', async () => {
      await FlairManager(redditBot).setPoints("username", 789)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username", "789", "points points-500")
    })

    it('works with negative score', async () => {
      await FlairManager(redditBot).setPoints("username", -500)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username", "0", "points points-1")
    })

    it('does not reduce points below 0', async () => {
      await FlairManager(redditBot).setPoints("username", -9999)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username", "0", "points points-1")
    })

    it('uses the right css threshold uses the max css threshold if exceeded', async () => {
      await FlairManager(redditBot).setPoints("username", 999999999)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username", "999999999", "points points-10000")
    })
  })
})

const mockRedditBot = (flair: string) => ({
  getUserFlair: jest.fn().mockResolvedValue(flair),
  setUserFlair: jest.fn()
})