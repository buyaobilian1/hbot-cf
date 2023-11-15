import { IRequest } from "itty-router";

import { TelegramBot } from '../../lib/BotSdk';

const handler = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
  const data = await request.json();
  console.log('update => ', data);

  const bot = new TelegramBot(env);

  await bot.handlerWebhook(data);

  return new Response("ok");
}

export default handler;