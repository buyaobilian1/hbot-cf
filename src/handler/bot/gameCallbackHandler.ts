import {TgBot} from "../../lib/telegram-bot";

const getPackHandler = async (bot: TgBot) => {
	const {data: callback_data, message, from, id: callback_query_id} = bot.update?.callback_query;
	const { id: tgid, first_name = '', last_name = '' } = from;
	const tgname = `${first_name}${last_name}` || '木有名字';

	const [, orderId] = callback_data.split("-");
	let { data, error } = await bot.supabase.rpc('get_pack', { tgid, tgname, oid: orderId });
	console.log('get_pack', data, error);
	if (error) return;
	const { code, done, isBoom, orderBoom, pack, subpack, msg, progress, settlement, orderDetails } = data;
	if (code == 0) {
		const answerText = isBoom ? `恭喜老板，喜提💣一颗, 结算${settlement}U.` : `恭喜老板，抢到🧧${subpack}U.`;
		await bot.answerCallbackQuery(callback_query_id, answerText);
		if (done) {
			let { data: dbOrder, error: e1 } = await bot.supabase.from('orders').select().eq('id', orderId).maybeSingle();
			console.log('e1', e1);
			if (e1) return;
			let { data: dbOrderDetails, error: e2 } = await bot.supabase.from('order_details').select().eq('order_id', orderId);
			console.log('e2', e2);
			if (e2) return;
			const formatText = generateSettlementText(dbOrder, dbOrderDetails || [], bot.env.PACK_RATE);
			const reply_markup = {
				inline_keyboard: [
					...generateDefaultInlineKeyboards(bot.env.BOT_USERNAME)
				]
			};
			const payload = {
				chat_id: message?.chat?.id,
				message_id: message?.message_id,
				caption: formatText,
				parse_mode: 'HTML',
				reply_markup: JSON.stringify(reply_markup)
			};
			await bot.sendRaw('editMessageCaption', payload);
		} else {
			// 更新进度
			const fistInlineKeyboardText = formatFirstInlineKeyboardText(bot.env.PACK_AMOUNT, pack, progress, orderBoom);
			const reply_markup = {
				inline_keyboard: [
					[{ text: fistInlineKeyboardText, callback_data: `${callback_data}` }],
					...generateDefaultInlineKeyboards(bot.env.BOT_USERNAME)
				]
			};
			const payload = {
				chat_id: message?.chat?.id,
				message_id: message?.message_id,
				reply_markup: JSON.stringify(reply_markup)
			};
			await bot.sendRaw('editMessageReplyMarkup', payload);
		}
	} else if (code == -1) {
		await bot.answerCallbackQuery(callback_query_id, '抢包失败.');
	} else if (code == 1) {
		await bot.answerCallbackQuery(callback_query_id, msg);
	} else if (code == 2) {
		await bot.answerCallbackQuery(callback_query_id, '您已经抢过这个包.');
	} else if (code == 3) {
		await bot.answerCallbackQuery(callback_query_id, '包已抢完.');
	} else if (code == 4) {
		await bot.answerCallbackQuery(callback_query_id, '无法抢自己的包.');
	}



	return await bot.answerCallbackQuery(callback_query_id, '');
}

const queryBalanceHandler = async (bot: TgBot) => {
    const {data: callback_data, message, from, id: callback_query_id} = bot.update?.callback_query;
    const { id: tgid, first_name = '', last_name = '' } = from;
    let { data: { amount }, error } = await bot.supabase.from('users').select('amount').eq('tg_id', tgid).maybeSingle() as any;
    await bot.answerCallbackQuery(callback_query_id, `当前余额：${amount} U.`);
    console.log('query balance', amount, error);
    return;
}



function formatFirstInlineKeyboardText(packAmount: number, pack: number, progress: number, orderBoom: number) {
	return `🧧抢红包[ ${packAmount} / ${progress} ]总 ${pack} U💣雷${orderBoom}`
}

function generateDefaultInlineKeyboards(botUsername: string) {
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

function generateSettlementText(order: any, orderDetails: any[], packRate: number) {

    let zlyl: number = 0;
    orderDetails.forEach((v) => {
        if (v.boom) {
            zlyl += order.pack * 1.8;
        }
    });

    let bzss: number = zlyl - order.pack;
    console.log('settlementyyyyyyyyyyyyyyyyyyyyy', zlyl, bzss);
    const formatText = `
【${order.tg_name}】 的红包已被领完！
🧧红包金额：${order.pack} U
🛎红包倍数：${packRate}
💣中雷数字：${order.boom}


--------领取详情--------
1️⃣. ${formatRowText(orderDetails[0])}
2️⃣. ${formatRowText(orderDetails[1])}
3️⃣. ${formatRowText(orderDetails[2])}
4️⃣. ${formatRowText(orderDetails[3])}
5️⃣. ${formatRowText(orderDetails[4])}
6️⃣. ${formatRowText(orderDetails[5])}

💹 中雷盈利：${zlyl.toFixed(2)}
💹 发包成本：-${order.pack.toFixed(2)}
💹 包主实收：${bzss.toFixed(2)}
    `;

    return formatText;
}

function formatRowText(row: any) {
    const flag = row.boom ? '💥' : '💵';
    return `[${flag}] ${row.sub_pack.toFixed(2)}  U ${row.tg_name}`;
}

export {
	getPackHandler,
	queryBalanceHandler

}
