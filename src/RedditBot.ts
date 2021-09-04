import snoowrap from 'snoowrap'
import { getConfig } from './config'
import { Logger } from './Logger'

export const create = ({ readOnly, debug }: RedditBotOptions = { debug: false, readOnly: false }): RedditBot => {
  const config = getConfig()
  const r = new snoowrap({
    userAgent: config.userAgent,
    refreshToken: config.refreshToken,
    clientId: config.clientId,
    clientSecret: config.clientSecret
  })
  r.config({ continueAfterRatelimitError: true, proxies: false, debug })

  const subreddit = r.getSubreddit(config.subreddit)

  const processedContent: { [name in ContentTypes]: ProcessedContent[] } = {
    comments: [],
    submissions: []
  }

  const getContent = (name: string) => isComment({ name }) ? r.getComment(name) : r.getSubmission(name)
  const getPreviousFetchedID = async (type: ContentTypes): Promise<string> => {
    processedContent[type].sort((a, b) => b.time - a.time)
    const deleted: string[] = []
    for(const comment of processedContent[type]) {
      if(!await isDeleted(getContent(comment.name))) break
      deleted.push(comment.name)
    }

    processedContent[type] = processedContent[type].filter(item => !deleted.includes(item.name))
    return processedContent[type]?.[0]?.name
  }

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
    fetchNewComments: async () => {
      const fetchSince: string = await getPreviousFetchedID('comments')
      Logger.debug(`Fetching new comments ${fetchSince ? `since ${fetchSince}`: ''}`)
      const newComments = (await subreddit.getNewComments({ before: fetchSince }))

      processedContent.comments.push(...newComments.map(c => ({ name: c.name, time: c.created_utc })))

      Logger.debug(`${newComments.length} new comments fetched`)
      return newComments
    },
    fetchNewSubmissions: async () => {
      const fetchSince: string = await getPreviousFetchedID('submissions')
      Logger.debug(`Fetching new submissions ${fetchSince ? `since ${fetchSince}`: ''}`)
      const oneDayAgo = (new Date().getTime() / 1000) - 86400
      const newSubmissions = (await (await subreddit.getNew({ before: fetchSince })).fetchAll())
        .filter(sub => sub.created_utc > oneDayAgo)
        .filter(sub => !sub.link_flair_text)

      processedContent.submissions.push(...newSubmissions.map(c => ({ name: c.name, time: c.created_utc })))

      Logger.debug(`${newSubmissions.length} new submissions fetched`)
      return newSubmissions
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
        Logger.error(`Reply failed - ${ex.message}`)
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
        .some((comment: any) => comment.author.name === config.bot_username && !comment.removed)
    },
    isCommentAReply: (comment) => comment.parent_id.startsWith("t1_"),
    rateLimit: () => ({ requestsRemaining: r.ratelimitRemaining ?? 99, resetsAt: new Date(r.ratelimitExpiration) }),
    isDeleted,
    shortlink: (content) => isSubmission(content) ? `https://redd.it/${content?.id}` : `https://reddit.com/comments/${content?.link_id?.split('_')?.[1]}//${content?.id}`
  }
}

const isComment = (thing: { name: string }): thing is snoowrap.Comment => thing.name.startsWith('t1_')
const isSubmission = (thing: { name: string }): thing is snoowrap.Submission => thing.name.startsWith('t3_')

const isDeleted = async (content: snoowrap.Comment | snoowrap.Submission): Promise<boolean> => {
  if(!content.id) {
    try {
      // @ts-expect-error
      content = await content.fetch()
    } catch (ex) {
      return true
    }
  }

  if(isComment(content)) {
    return await content.removed ||
      await content.body === "[deleted]" ||
      !content.author ||
      content.author?.name === "[deleted]"
  } else if(isSubmission(content)) {
    return !content.author ||
      !await content.is_robot_indexable ||
      content.author?.name === '[deleted]'
  }

  return true
}

export type RedditBot = {
  username: string,
  readOnly: boolean,
  fetchComment: (id: string) => Promise<() => snoowrap.Comment>
  fetchPostFromComment: (comment: snoowrap.Comment) => Promise<snoowrap.Submission>
  fetchNewComments: () => Promise<snoowrap.Comment[]>,
  fetchNewSubmissions: () => Promise<snoowrap.Submission[]>,
  fetchNewReports: () => Promise<snoowrap.Comment[]>,
  reply: (content: snoowrap.ReplyableContent<snoowrap.Submission | snoowrap.Comment>, body: string, sticky?: boolean) => Promise<void>,
  createPost: (title: string, text: string, sticky: boolean) => Promise<void>,
  setPostFlair: (post: snoowrap.Submission, template: string) => Promise<void>,
  getUserFlair: (username: string) => Promise<string>,
  setUserFlair: (username: string, options: { text?: string, css_class?: string, background_color?: string, text_color?: 'light' | 'dark' }) => Promise<void>,
  hasReplied: (content: snoowrap.ReplyableContent<snoowrap.Submission | snoowrap.Comment>) => Promise<boolean>,
  isCommentAReply: (comment: snoowrap.Comment) => boolean,
  rateLimit: () => { requestsRemaining: number, resetsAt: Date },
  isDeleted: (content: snoowrap.Comment | snoowrap.Submission) => Promise<boolean>,
  shortlink: (content: snoowrap.Comment | snoowrap.Submission) => string
}

export type RedditBotOptions = {
  readOnly?: boolean,
  debug?: boolean
}

type ProcessedContent = {
  name: string,
  time: number
}

type ContentTypes = 'comments' | 'submissions'