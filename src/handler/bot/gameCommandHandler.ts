import {TelegramBot} from "../../lib/telegram-bot";

// 命令上分
const addCommandHandler = async (bot: TelegramBot) => {
	const { message } = bot.update;
	const { text, from } = message;
	const { id: telegramId } = from;

	const str = (text as string).split(' ');
	const addAmount = parseInt(str[1]);

	const {data, error: e1} = await bot.supabase.from('users').select('amount').eq('tg_id', telegramId).maybeSingle()
	if (e1) return Promise.resolve();
	const { data: d2, error: e2 } = await bot.supabase.from('users').update({amount: data?.amount + addAmount})
		.eq("tg_id", telegramId).select().maybeSingle();
	if (e2) return Promise.resolve();
	return await bot.reply(`成功上分${addAmount}, 当前分数：${d2.amount}`);
}

const helpCommandHandler = async (bot: TelegramBot) => {
	const replyText = `
玩家自助:
发包 100-2 或 100/2
玩家自助上分 /add 100
	`;

	return await bot.reply(replyText);
}

export {
	addCommandHandler,
	helpCommandHandler
};
