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
  r.config({ continueAfterRatelimitError: true, proxies: false, debug })

  const subreddit = r.getSubreddit(config.subreddit)

  let lastFetchedComment = startFromComment
  let lastFetchedSubmission = startFromSubmission

  const isDeleted = (comment: snoowrap.Comment) =>
    comment.removed ||
    comment.body === "[deleted]" ||
    (comment.author as any) === "[deleted]" || // Seen this happen before for whatever reason
    comment.author.name === "[deleted]"

  return {
    username: config.bot_username,
    readOnly,
    fetchComment: async (id) => {
      const comment = await (r.getComment(id) as any).fetch()
      return () => comment
      // Why? https://github.com/not-an-aardvark/snoowrap/issues/221
      // snoowrap.Comment extends Promise, rather than getComment returning one
      // This prevents needing the 'as any' everywhere we need this function
    },
    fetchPostFromComment: (comment) => r.getSubmission(comment.link_id).fetch(),
    fetchNewConfirmations: async () => {
      // TODO: refactor all of this
      const fetchOptions = {}
      if(lastFetchedComment) {
        // If the comment was removed, fetching 'before' it will always return empty listing
        // So before using it, check if it was deleted
        // No easy way to do that unfortunately (Doesn't 404)
        let wasDeleted = false
        try {
          // @ts-ignore
          const c: snoowrap.Comment = await r.getComment(lastFetchedComment).fetch()
          wasDeleted = isDeleted(c)
        } catch (ex) {
          // It was probably deleted
          Logger.error(ex.message)
          wasDeleted = true
        }

        if(!wasDeleted) {
          fetchOptions["before"] = lastFetchedComment
        } else {
          Logger.verbose(`Previous comment '${lastFetchedComment}' doesn't exist anymore, fetching all`)
          lastFetchedComment = undefined
        }
      }
      Logger.verbose(`Fetching new comments ${lastFetchedComment ? `since ${lastFetchedComment}`: ''}`)
      const newComments = (await (await subreddit.getNewComments(fetchOptions)).fetchAll())
        .filter(comment => !isDeleted(comment))

      Logger.debug(`${newComments.length} new comments fetched`)

      if(newComments.length === 0) return []

      lastFetchedComment = newComments[0].name
      return newComments
        .filter(comment => /^[^a-z0-9]*correct/ig.test(comment?.body))
        .filter(comment => comment.is_submitter)

    },
    fetchNewSubmissions: async () => {
      const fetchOptions = {}

      if(lastFetchedSubmission) {
        // If the post was removed, fetching 'before' it will always return empty listing
        // So before using it, check if it was deleted
        // No easy way to do that unfortunately (Doesn't 404)
        let wasDeleted = false
        try {
          // @ts-ignore
          const s: snoowrap.Submission = await r.getSubmission(lastFetchedSubmission).fetch()
          wasDeleted = !s.author || s.author.name === '[deleted]' || !s.is_robot_indexable
        } catch (ex) {
          // It was probably deleted
          Logger.error(ex.message)
          wasDeleted = true
        }

        if(!wasDeleted) {
          fetchOptions["before"] = lastFetchedSubmission
        } else {
          Logger.verbose(`Previous submission '${lastFetchedSubmission}' doesn't exist anymore, fetching all`)
          lastFetchedSubmission = undefined
        }
      }
      Logger.verbose(`Fetching new submissions ${lastFetchedSubmission ? `since ${lastFetchedSubmission}`: ''}`)
      const newSubmissions = await (await subreddit.getNew(fetchOptions)).fetchAll()

      Logger.debug(`${newSubmissions.length} new submissions fetched`)

      if(newSubmissions.length === 0) return []

      lastFetchedSubmission = newSubmissions[0].name
      const oneDayAgo = (new Date().getTime() / 1000) - 86400
      return newSubmissions
        .filter(sub => sub.created_utc > oneDayAgo)
        .filter(sub => !sub.link_flair_text)
    },
    fetchNewReports: async () => (await subreddit
      .getReports({ only: "comments" }) as snoowrap.Comment[])
      .filter(c => c.mod_reports.length > 0),
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
      Logger.verbose(`Created new self post - '${title}'`)
    },
    setPostFlair: async (post, template) => {
      if(readOnly) {
        Logger.warn('setPostFlair() ignored, read only mode is enabled')
        return
      }
      if(!template) {
        // You can't remove flair with selectFlair so have to do this
        await (post as any).assignFlair({ text: "", cssClass: "" })
      } else {
        await (post as any).selectFlair({ flair_template_id: template })
      }
      Logger.verbose(`Setting flair ${template} on ${post.name}`)
    },
    getUserFlair: async (username) => subreddit.getUserFlair(username).then(flair => flair.flair_text),
    setUserFlair: async (username, { text, css_class, background_color, text_color = 'light'}) => {
      if(readOnly) {
        Logger.warn('setUserFlair() ignored, read only mode is enabled')
        return
      }

      await r.oauthRequest({
        uri: `/r/${subreddit.display_name}/api/selectflair`,
        method: 'POST',
        form: {
          name: username,
          text, css_class,
          background_color, text_color
        }
      })
    },
    hasReplied: async (content) => {
      const expanded = await (await (content as any).expandReplies())
      return (expanded.comments || expanded.replies || [])
        .some(comment => comment.author.name === config.bot_username && !comment.removed)
    },
    isCommentAReply: (comment) => comment.parent_id.startsWith("t1_"),
    rateLimit: () => ({ requestsRemaining: r.ratelimitRemaining ?? 99, resetsAt: new Date(r.ratelimitExpiration) })
  }
}

export type RedditBot = {
  username: string,
  readOnly: boolean,
  fetchComment: (id: string) => Promise<() => snoowrap.Comment>
  fetchPostFromComment: (comment: snoowrap.Comment) => Promise<snoowrap.Submission>
  fetchNewConfirmations: () => Promise<snoowrap.Comment[]>,
  fetchNewSubmissions: () => Promise<snoowrap.Submission[]>,
  fetchNewReports: () => Promise<snoowrap.Comment[]>,
  reply: (content: snoowrap.ReplyableContent<snoowrap.Submission | snoowrap.Comment>, body: string, sticky?: boolean) => Promise<void>,
  createPost: (title: string, text: string, sticky: boolean) => Promise<void>,
  setPostFlair: (post: snoowrap.Submission, template: string) => Promise<void>,
  getUserFlair: (username: string) => Promise<string>,
  setUserFlair: (username: string, options: { text?: string, css_class?: string, background_color?: string, text_color?: 'light' | 'dark' }) => Promise<void>,
  hasReplied: (content: snoowrap.ReplyableContent<snoowrap.Submission | snoowrap.Comment>) => Promise<boolean>,
  isCommentAReply: (comment: snoowrap.Comment) => boolean,
  rateLimit: () => { requestsRemaining: number, resetsAt: Date }
}

export type RedditBotOptions = {
  readOnly?: boolean,
  debug?: boolean,
  startFromComment?: string
  startFromSubmission?: string
}

