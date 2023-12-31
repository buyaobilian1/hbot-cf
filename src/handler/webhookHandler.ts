import { IRequest } from "itty-router";
import {TelegramBot} from "../lib/telegram-bot";
import startRoundHandler from "./bot/startRoundHandler";
import {getPackHandler, queryBalanceHandler, queryPromoHandler} from "./bot/gameCallbackHandler";
import onNewChatMember from "./bot/onNewChatMember";
import {addCommandHandler, helpCommandHandler} from "./bot/gameCommandHandler";
import onMemberLeave from "./bot/onMemberLeave";


const handler = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
	const data = await request.json();
	console.log('update => ', data);

	const bot = new TelegramBot(env);

	bot.setPrecondition((update: any) => {
		if (update?.message) {
			const {chat} = update?.message;
			return !!(chat?.type && (chat?.type === 'group' || chat?.type === 'supergroup'));
		}

		return true;
	});
	bot.onText(/^\/help$/, helpCommandHandler);
	bot.onText(/^\/add \d+/, addCommandHandler);
	bot.onText(/^\d+(\/|\-)[0-9]$/, startRoundHandler);
	bot.onCallback(/^joinGame\-\d+/, getPackHandler);
	bot.onCallback(/^queryBalance/, queryBalanceHandler);
	bot.onCallback(/^queryPromo$/, queryPromoHandler);
	bot.onNewChatMember(onNewChatMember);
	bot.onLeftChatMember(onMemberLeave);

	await bot.handleWebhook(data);

	return new Response("ok");
}

export default handler;
