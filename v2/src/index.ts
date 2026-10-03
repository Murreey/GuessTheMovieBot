import { Hono } from 'hono';
import { serve } from '@hono/node-server'
import type { TriggerResponse, OnCommentCreateRequest } from '@devvit/web/shared'
import { createServer, getServerPort } from '@devvit/web/server'

const app = new Hono();

app.post('/internal/triggers/on-comment-create', async (c) => {
  const comment = await c.req.json<OnCommentCreateRequest>();
  console.log('Comment created:', comment.author?.name, comment.comment?.body)
  return c.json<TriggerResponse>({ status: "ok" })
})

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort()
})