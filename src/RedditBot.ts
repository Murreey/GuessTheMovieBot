import snoowrap from 'snoowrap'
import { getConfig } from './config'
import { Logger } from './Logger'

export const create = ({ readOnly, debug, startFromComment, startFromSubmission }: RedditBotOptions = { debug: false, readOnly: false }): RedditBot => {
  const config = getConfig()
  const r = new snoowrap({
    userAgent: config.userAgent,
    refreshToken: config.refreshToken,
    clientId: config.clientId,
    clientSecret: config.clientSecret
  })
  r.config({ continueAfterRatelimitError: true, debug })

  const subreddit = r.getSubreddit(config.subreddit)

  let lastFetchedComment = startFromComment
  let lastFetchedSubmission = startFromSubmission

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
        Logger.debug('No new comments fetched')
        return []
      }

      lastFetchedComment = newComments[0].name
      return newComments
        .filter(comment => comment.body.toLowerCase().startsWith("correct"))
        .filter(comment => comment.is_submitter)
        .filter(comment => !isDeleted(comment))
    },
    fetchNewSubmissions: async () => {
      const fetchOptions = {}
      if(lastFetchedSubmission) fetchOptions["before"] = lastFetchedSubmission
      Logger.verbose(`Fetching new submissions ${lastFetchedSubmission ? `since ${lastFetchedSubmission}`: ''}`)
      const newSubmissions = await (await subreddit.getNew(fetchOptions)).fetchAll()

      if(newSubmissions.length === 0) {
        Logger.debug('No new submissions fetched')
        return []
      }

      lastFetchedSubmission = newSubmissions[0].name
      return newSubmissions
        .filter(sub => !sub.link_flair_text)
    },
    reply: async (content, body, sticky = false) => {
      if(readOnly) {
        Logger.warn('reply() ignored, read only mode is enabled')
        return
      }

      try {
        const reply = (await (content as any).reply(body) as snoowrap.Comment);
        if (reply) await (reply as any).distinguish({ status: true, sticky })
        Logger.verbose(`Posted comment on ${content.id}`)
      } catch (ex) {
        // Do nothing
        // This likely meant the parent comment was deleted or the post is now archived
        Logger.error(`Reply failed - ${ex}`)
      }
    },
    createPost: async (title, text, sticky = false) => {
      if(readOnly) {
        Logger.warn('createPost() ignored, read only mode is enabled')
        return
      }

      const post = await (r.submitSelfpost({
        subredditName: subreddit.display_name,
        title,
        text,
        sendReplies: false
      }) as any)
      if(post && sticky) await post.sticky({ num: 2 })
      Logger.verbose(`Created new self post - ${await post.id}`)
    },
    setPostFlair: async (post, template) => {
      if(readOnly) {
        Logger.warn('setPostFlair() ignored, read only mode is enabled')
        return
      }

      await (post as any).selectFlair({ flair_template_id: template })
      Logger.verbose(`Setting flair ${template} on ${post.name}`)
    },
    getUserFlair: async (username) => subreddit.getUserFlair(username).then(flair => flair.flair_text),
    setUserFlair: async (username, text, cssClass) => {
      if(readOnly) {
        Logger.warn('setUserFlair() ignored, read only mode is enabled')
        return
      }

      const user = await (r.getUser(username) as any);
      await user.assignFlair({
        subredditName: subreddit.display_name,
        text, cssClass
      })
    },
    hasReplied: async (content) => (await (content as any).expandReplies()).comments.some(comment => comment.author.name === config.bot_username),
    isCommentAReply: (comment) => comment.parent_id.startsWith("t1_"),
    isReadOnly: () => readOnly
  }
}

export type RedditBot = {
  fetchComment: (id: string) => Promise<() => snoowrap.Comment>
  fetchPostFromComment: (comment: snoowrap.Comment) => snoowrap.Submission
  fetchNewConfirmations: () => Promise<snoowrap.Comment[]>,
  fetchNewSubmissions: () => Promise<snoowrap.Submission[]>,
  reply: (content: snoowrap.ReplyableContent<snoowrap.Submission | snoowrap.Comment>, body: string, sticky?: boolean) => Promise<void>,
  createPost: (title: string, text: string, sticky: boolean) => Promise<void>,
  setPostFlair: (post: snoowrap.Submission, template: string) => Promise<void>,
  getUserFlair: (username: string) => Promise<string>,
  setUserFlair: (username: string, text: string, cssClass: string) => Promise<void>,
  hasReplied: (content: snoowrap.ReplyableContent<snoowrap.Submission | snoowrap.Comment>) => Promise<boolean>,
  isCommentAReply: (comment: snoowrap.Comment) => boolean,
  isReadOnly: () => boolean
}

export type RedditBotOptions = {
  readOnly?: boolean,
  debug?: boolean,
  startFromComment?: string
  startFromSubmission?: string
}

