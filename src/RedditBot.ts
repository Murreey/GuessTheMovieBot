import snoowrap, { ReplyableContent } from 'snoowrap'
import { loadConfig } from './config'
import { Logger } from './Logger'

// getConfirmations(): Comment[]
// isPostIdentified(): boolean
// getCorrectAnswer(): Comment
// setFlair (flair: FlairEnum maybe?)
// reply()

// Flair should maybe be a class of it's own
// Pass in a submission and desired flair

export const create = ({ readOnly, debug, startFrom }: RedditBotOptions = { debug: false, readOnly: false }): RedditBot => {
  const config = loadConfig()
  const r = new snoowrap({
    userAgent: config.userAgent,
    refreshToken: config.refreshToken,
    clientId: config.clientId,
    clientSecret: config.clientSecret
  })
  r.config({ continueAfterRatelimitError: true, debug })

  const subreddit = r.getSubreddit(config.subreddit)

  let lastFetchedComment = startFrom

  const isDeleted = (comment: snoowrap.Comment) =>
    comment.body === "[deleted]" ||
    (comment.author as any) === "[deleted]" || // Seen this happen before for whatever reason
    comment.author.name === "[deleted]"

  return {
    fetchComment: async (id) => {
      const comment = await (r.getComment(id) as any).fetch()
      return () => comment
      // Why? https://github.com/not-an-aardvark/snoowrap/issues/221
      // snoowrap.Comment extends Promise, rather than getComment returning one
      // This prevents needing the 'as any' everywhere we need this function
    },
    fetchPostFromComment: (comment) => r.getSubmission(comment.link_id),
    fetchNewConfirmations: async () => {
      const fetchOptions = {}
      if(lastFetchedComment) fetchOptions["before"] = lastFetchedComment
      Logger.verbose(`Fetching new comments ${lastFetchedComment ? `since ${lastFetchedComment}`: ''}`)
      const newComments = await (await subreddit.getNewComments(fetchOptions)).fetchAll()

      if(newComments.length === 0) {
        Logger.verbose('No new comments fetched')
        return []
      }

      lastFetchedComment = newComments[0].name
      return newComments
        .filter(comment => comment.body.toLowerCase().startsWith("correct"))
        .filter(comment => comment.is_submitter)
        .filter(comment => !isDeleted(comment))
    },
    isCommentAReply: (comment) => !comment.parent_id.startsWith("t1"),
    reply: async (content, body) => {
      if(readOnly) {
        Logger.warn('reply() ignored, read only mode is enabled')
        return
      }

      const reply = (await (content as any).reply(body) as snoowrap.Comment);
      if(reply) reply.distinguish()
      Logger.verbose('Reply sent!')
    },
    setFlair: async (post, template, text) => {
      if(readOnly) {
        Logger.warn('setFlair() ignored, read only mode is enabled')
        return
      }

      await (post as any).selectFlair({ flair_template_id: template, text })
      Logger.verbose(`Setting flair ${template} ${text ? `(${text})`: ''} on ${post.name}`)
    }
  }
}

export type RedditBot = {
  fetchComment: (id: string) => Promise<() => snoowrap.Comment>
  fetchPostFromComment: (comment: snoowrap.Comment) => snoowrap.Submission
  fetchNewConfirmations: () => Promise<snoowrap.Comment[]>,
  isCommentAReply: (comment: snoowrap.Comment) => boolean,
  reply: (content: snoowrap.ReplyableContent<snoowrap.Submission | snoowrap.Comment>, body: string) => Promise<void>,
  setFlair: (post: snoowrap.Submission, template: string, text?: string) => Promise<void>
}

export type RedditBotOptions = {
  readOnly?: boolean,
  debug?: boolean,
  startFrom?: string
}

