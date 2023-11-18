import {TgBot} from "../../lib/telegram-bot";

const addtionalText = `
本群为USDT红包雷开源乱玩群

相关指令
玩家自助上分 /add 1000
`

const onNewChatMember = async (bot: TgBot) => {
	const { message_id, new_chat_members, chat } = bot.update.message;
	const [ newMember ] = new_chat_members;
	// 是否已经存在
	let { count, error } = await bot.supabase.from('users').select('*', { count: 'exact' }).eq('tg_id', newMember.id);
	console.log('memeber if exists', count, error);
	if (error) return;
	if (count == 0) {
		let { error } = await bot.supabase.from('users').insert({ tg_id: newMember.id });
		console.log('new member', error);
		if (error) return;
		const replyText = `你好，[${newMember.first_name}](tg://user?id=${newMember.id})，欢迎光临` + addtionalText
		const replyPayload = {
			chat_id: chat.id,
			text: replyText,
			parse_mode: 'MarkdownV2'
		};
		await bot.sendRaw('sendMessage', replyPayload);
	} else {
		const replyText = `你好，[${newMember.first_name}](tg://user?id=${newMember.id})，欢迎回家` + addtionalText
		const replyPayload = {
			chat_id: chat.id,
			text: replyText,
			parse_mode: 'MarkdownV2'
		};
		await bot.sendRaw('sendMessage', replyPayload);
	}
}

export default onNewChatMember;
