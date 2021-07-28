import { Logger } from "../Logger";
import { RedditBot } from "../RedditBot";
import { ScoreManager } from "../types";

const thresholds: [number, string][] = [
  [1, '#7EFF7B'], [5, '#68B4E7'], [10, '#FFE47B'],
  [20, '#FFBC7B'], [50, '#7B9BFF'], [100, '#C07BFF'],
  [200, '#FF7BD0'], [500, '#FF7B85'], [1000, '#FFDA7B'],
  [2000, '#7B82FF'], [5000, '#FF25D3']
]

const chooseTextColour = (colour: string): 'light' | 'dark' => {
  // Magic code that chooses light or dark text based on the background colour
  // I'd hoped to be able to use one text colour for all of them (they all look okay on dark)
  // But when actually displayed on reddit the design makes some a bit hard to read
  const r = parseInt(colour.substring(1, 3), 16)
  const g = parseInt(colour.substring(3, 5), 16)
  const b = parseInt(colour.substring(5, 7), 16)
  return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) ? 'dark' : 'light'
}

const getThresholdInfo = (points: number) => [...thresholds].reverse().find(threshold => threshold[0] <= points) || thresholds[0]

export default (bot: RedditBot, scoreManager?: ScoreManager) => {
  const setPoints = async (user: string, amount: number): Promise<void> => {
    if(bot.readOnly) return

    if(amount < 0 || !amount) amount = 0

    const [ threshold, colour ] = getThresholdInfo(amount)

    const options = {
      text: `${amount} points`,
      css_class: `points points-${threshold || 1}`,
      background_color: colour,
      text_color: chooseTextColour(colour)
    }

    await bot.setUserFlair(user, options)

    Logger.info(`Set ${user}'s points flair to ${amount} (${options.background_color})`)
  }

  return {
    setPoints,
    syncPoints: async (username: string) => {
      if(!scoreManager) return
      await setPoints(username, await scoreManager.getUserPoints(username))
    }
  }
}