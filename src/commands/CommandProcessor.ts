import { Comment } from "snoowrap"
import { Logger } from "../Logger"
import { RedditBot } from "../RedditBot"

import ForceCorrect from './ForceCorrect'
import CorrectGIS from './CorrectGIS'
import Undo from './Undo'
import { ScoreManager } from "../types"

export const COMMAND_PREFIX = '!'
const COMMANDS: CommandMatchers[] = [
  {
    matchers: ["correct"],
    process: ForceCorrect
  },
  {
    matchers: ["gis", "google"],
    process: CorrectGIS
  },
  {
    matchers: ["undo", "remove"],
    process: Undo
  },
]

export default async (bot: RedditBot, scoreManager: ScoreManager, comment: Comment, input: string) => {
  for (const command of COMMANDS) {
    if(command.matchers.some(matches(input))) {
      Logger.info(`Executing mod command '${input}' on ${comment.name}`)
      const result = await command.process(bot, comment, scoreManager)

      if(result && !bot.readOnly) {
        Logger.verbose(`Command ran, approving comment`)
        await (comment as any).approve()
      } else if (!result) {
        Logger.verbose(`Command failed, ignoring`)
      }
    }
  }

}

const matches = (test: string) => (matcher: string) => `${COMMAND_PREFIX}${matcher.toLowerCase()}` === test.toLowerCase().trim()

type CommandMatchers = {
  matchers: string[],
  process: (bot: RedditBot, comment: Comment, scoreManager?: ScoreManager) => Promise<any>
}