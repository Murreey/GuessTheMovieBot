import { Comment } from "snoowrap"
import { Logger } from "../Logger"
import { RedditBot } from "../RedditBot"

import ForceCorrect from './ForceCorrect'
import CorrectGIS from './CorrectGIS'
import Undo from './Undo'

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

export default async (bot: RedditBot, comment: Comment, input: string) => {
  for (const command of COMMANDS) {
    if(command.matchers.some(matches(input)))  {
      Logger.info(`Executing mod command '${input}' detected on ${comment.name}!`)
      await command.process(bot, comment)
    }
  }
}

const matches = (test) => (matcher) => `${COMMAND_PREFIX}${matcher.toLowerCase()}` === test.toLowerCase().trim()

type CommandMatchers = {
  matchers: string[],
  process: (bot: RedditBot, comment: Comment) => Promise<any>
}