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

    it('matches the first numeric group including commas', async () => {
      redditBot = mockRedditBot("45 6")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(45)

      redditBot = mockRedditBot("ab45c6")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(45)

      redditBot = mockRedditBot("123 points 456")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(123)

      redditBot = mockRedditBot("points 58")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(58)

      redditBot = mockRedditBot("1 2 3 4 5 6 7")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(1)

      redditBot = mockRedditBot("130,300")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(130300)

      redditBot = mockRedditBot("1,000,000 points")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(1000000)

      redditBot = mockRedditBot("wow 1,234,567,890 such points")
      expect(await FlairManager(redditBot).getPoints("username")).toBe(1234567890)
    })
  })

  describe('setPoints', () => {
    it('sets the users flair with the correct class and colour', async () => {
      await FlairManager(redditBot).setPoints("username", 789)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "789", css_class: "points points-500", background_color: "#FF7B85", text_color: "light"})
    })

    it('works with negative score', async () => {
      await FlairManager(redditBot).setPoints("username", -500)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "0", css_class: "points points-1", background_color: "#7EFF7B", text_color: "dark"})
    })

    it('uses the max css threshold if exceeded', async () => {
      await FlairManager(redditBot).setPoints("username", 999999999)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "999999999", css_class: "points points-5000", background_color: "#FF25D3", text_color: "light"})
    })
  })
})

const mockRedditBot = (flair: string) => ({
  getUserFlair: jest.fn().mockResolvedValue(flair),
  setUserFlair: jest.fn()
})