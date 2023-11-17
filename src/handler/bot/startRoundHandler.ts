import {TgBot} from "../../lib/telegram-bot";

const packAmount = 6;
const botUsername = 'pindaodaotest_bot'
const coverImageUrl = 'https://pub-85281c80c72347508a7215db14b52360.r2.dev/hbot_cover.jpg'

const startRoundHandler = async (bot: TgBot) => {
	const { message } = bot.update;
	const { chat, from } = message;

	const tguserid = from.id;
	const tgusername = `${from?.first_name || ''}${from?.last_name || ''}` || '木有名字';
	const arr = message.text.split(/\-|\//);
	const pack = parseInt(arr[0]);
	const boom = parseInt(arr[1]);
	if (pack < 5) {
		const replyPayload = {
			chat_id: chat.id,
			text: `红包最小为5U.`,
			reply_to_message_id: message.message_id
		};
		await bot.sendRaw('sendMessage', replyPayload);
		return;
	}

	console.log('tguserid', tguserid);
	const subpacks = generateRandomNumbers(pack);
	console.log('create order params', tguserid, tgusername, pack, boom, subpacks);
	const { data, error } = await bot.supabase.rpc('create_order', { tguserid, tgusername, pack, boom, subpacks });
	console.log('function create_order', data, error);
	if (error) {
		console.log('服务器内部错误');
		return;
	}
	const { code, orderId } = data;
	if (code == 1) {
		const replyPayload = {
			chat_id: chat.id,
			text: `余额不足`,
			reply_to_message_id: message.message_id
		};
		await bot.sendRaw('sendMessage', replyPayload);
		return;
	} else if (code == 2) {
		console.log('其他错误');
		return;
	}

	const textMsg = `【${tgusername}】发了一个${pack}U的红包，大家快来抢啊！`;
	console.log(textMsg);
	const fistInlineKeyboardText = formatFirstInlineKeyboardText(pack, 0, boom);
	const reply_markup = {
		inline_keyboard: [
			[{ text: fistInlineKeyboardText, callback_data: `joinGame-${orderId}` }],
			...generateDefaultInlineKeyboards()
		]
	};

	const payload = {
		chat_id: chat.id,
		photo: coverImageUrl,
		caption: textMsg,
		reply_to_message_id: message.message_id,
		reply_markup: JSON.stringify(reply_markup)
	};
	await bot.sendRaw('sendPhoto', payload);

}

function generateRandomNumbers(totalAmount: number): number[] {
	const redPacketAmounts: number[] = [];
	let remainingAmount = totalAmount;

	for (let i = 0; i < 5; i++) {
		const maxAmount = remainingAmount * 0.7;
		const randomAmount = Math.random() * maxAmount;
		const roundedAmount = Math.round(randomAmount * 100) / 100;
		redPacketAmounts.push(roundedAmount);
		remainingAmount -= roundedAmount;
	}
	const last = Math.round(remainingAmount * 100) / 100;
	redPacketAmounts.push(last);

	return redPacketAmounts;
}

function formatFirstInlineKeyboardText(pack: number, progress: number, orderBoom: number) {
	return `🧧抢红包[ ${packAmount} / ${progress} ]总 ${pack} U💣雷${orderBoom}`
}

function generateDefaultInlineKeyboards() {
	return [
		[
			{ text: '自助服务', url: `https://t.me/${botUsername}` },
			{ text: '联系客服', url: `https://t.me/${botUsername}` },
			{ text: '自助开群', url: `https://t.me/${botUsername}` }
		],
		[
			{ text: '余额', callback_data: 'queryBalance' },
			{ text: '邀请', callback_data: 'queryPromo' }
		]
	];
}

export default startRoundHandler;
