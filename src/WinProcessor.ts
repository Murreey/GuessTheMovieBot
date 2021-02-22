
import snoowrap from "snoowrap";
import PointsManager from "./PointsManager";
import { RedditBot } from "./RedditBot";

export default async (bot: RedditBot, comment: snoowrap.Comment): Promise<void> => {
  const submission = bot.fetchPostFromComment(comment)
  const guessComment = (await bot.fetchComment(comment.parent_id))()

  const currentFlair = await submission.link_flair_text
  const flairTypes = await submission.getLinkFlairTemplates()

  let newFlair = "identified"
  if(currentFlair === "easy") newFlair = newFlair + " + easy"
  if(currentFlair === "hard") newFlair = newFlair + " + hard"

  const flairTemplate = flairTypes.find((template) => newFlair === template.flair_text)
  if(flairTemplate) bot.setFlair(submission, flairTemplate.flair_template_id)

  PointsManager(bot).addPoints(guessComment.author, 6)
  PointsManager(bot).addPoints(comment.author, 3)

  bot.reply(comment, "Guess Confirmed")
}