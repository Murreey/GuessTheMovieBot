import FlairManager from '../../src/scores/ScoreFlairManager'

const mockRedditBot = (flair: string) => ({
  getUserFlair: jest.fn().mockResolvedValue(flair),
  setUserFlair: jest.fn()
})

describe('ScoreFlairManager', () => {
  let redditBot = mockRedditBot("1234")
  let scoreManager = {
    getUserPoints: jest.fn().mockResolvedValue(123)
  }
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('setPoints', () => {
    it('sets the users flair with the correct class and colour', async () => {
      await FlairManager(redditBot as any, scoreManager as any).setPoints("username", 789)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "789 points", css_class: "points points-500", background_color: "#FF7B85", text_color: "light"})
    })

    it('works with negative score', async () => {
      await FlairManager(redditBot as any, scoreManager as any).setPoints("username", -500)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "0 points", css_class: "points points-1", background_color: "#7EFF7B", text_color: "dark"})
    })

    it('uses the max css threshold if exceeded', async () => {
      await FlairManager(redditBot as any, scoreManager as any).setPoints("username", 999999999)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "999999999 points", css_class: "points points-5000", background_color: "#FF25D3", text_color: "light"})
    })

    it('defaults to 0 if unexpected input', async () => {
      await FlairManager(redditBot as any, scoreManager as any).setPoints("username", undefined)
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "0 points", css_class: "points points-1", background_color: "#7EFF7B", text_color: "dark"})
    })
  })

  describe('syncPoints', () => {
    it('fetches the user score from the database', async () => {
      await FlairManager(redditBot as any, scoreManager as any).syncPoints("username")
      expect(scoreManager.getUserPoints).toHaveBeenCalledWith("username")
    })

    it('sets the users flair with the correct class and colour', async () => {
      await FlairManager(redditBot as any, scoreManager as any).syncPoints("username")
      expect(redditBot.setUserFlair).toHaveBeenCalledWith("username",
        {text: "123 points", css_class: "points points-100", background_color: "#C07BFF", text_color: "light"})
    })

    it('does nothing if no score manager was provided', async () => {
      await FlairManager(redditBot as any).syncPoints("username")
      expect(redditBot.setUserFlair).not.toHaveBeenCalled()
    })
  })
})