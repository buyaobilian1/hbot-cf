import { IRequest } from "itty-router";
import {TgBot} from "../lib/telegram-bot";
import startRoundHandler from "./bot/startRoundHandler";
import {getPackHandler, queryBalanceHandler} from "./bot/gameCallbackHandler";
import onNewChatMember from "./bot/onNewChatMember";


const handler = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	const data = await request.json();
	console.log('update => ', data);

	const bot = new TgBot(env);

	bot.setPrecondition((update: any) => {
		if (update?.message) {
			const {chat} = update?.message;
			return !!(chat?.type && (chat?.type === 'group' || chat?.type === 'supergroup'));
		}

		return true;
	})
	bot.onText(/^\d+(\/|\-)[0-9]$/, startRoundHandler);
	bot.onCallback(/^joinGame\-\d+/, getPackHandler);
	bot.onCallback(/^queryBalance/, queryBalanceHandler);
	bot.onNewChatMember(onNewChatMember);

	await bot.handleWebhook(data);

	return new Response("ok");
}

export default handler;