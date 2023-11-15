import { createClient } from '@supabase/supabase-js';

export class TelegramBot {
  private static readonly BASE_API = `https://api.telegram.org/bot`;

  private supabase: any;
  private botToken: string;
  private botUsername: string;
  private coverImageUrl: string;
  private readonly packAmount: number = 6;
  private readonly packRate: number = 1.8;

  constructor(env: Env) {
    this.botToken = env.BOT_TOKEN;
    this.botUsername = env.BOT_USERNAME;
    this.coverImageUrl = env.COVER_IMG_URL;
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  }

  public async handlerWebhook(update: any) {
    if (update?.message?.text) { // 文本消息
      const chatType = update?.message?.chat?.type;
      if (chatType == 'group' || chatType == 'supergroup') {
        await this.handlerGroupTextMessage(update);
      } else if (chatType == 'private') {
        await this.handlerPrivateTextMessage(update);
      }
    } else if (update?.message?.new_chat_members) { // 新用户入群
      console.log('收到进群消息.');
      await this.handlerNewChatMember(update);
    } else if (update?.message?.left_chat_member) { // 用户退群
      console.log('收到退群消息.');
    } else if (update?.chat_member?.invite_link) { // 推广用户进群消息
      console.log('通过推广码进群消息');
      // await this.handlerNewMemberWithInviteLinkMessage(update);
    } else if (update?.callback_query) {
      await this.handlerCallbackMessage(update);
    }

    return Response.json({'code': 0});
  }

  private async handlerGroupTextMessage(update: any) {
    const { message } = update;
    if (message?.text) {
      const regex = /^\d+(\/|\-)[0-9]$/;
      if (regex.test(message.text)) {
        const tguserid = message.from.id;
        const tgusername = `${message?.from?.first_name || ''}${message?.from?.last_name || ''}` || '木有名字';
        const arr = message.text.split(/\-|\//);
        const pack = parseInt(arr[0]);
        const boom = parseInt(arr[1]);
        if (pack < 5) {
          const replyPayload = {
            chat_id: message.chat.id,
            text: `红包最小为5U.`,
            reply_to_message_id: message.message_id
          };
          await this.sendApi('sendMessage', replyPayload);
          return;
        }

        console.log('tguserid', tguserid);
        const subpacks = this.generateRandomNumbers(pack);
        console.log('create order params', tguserid, tgusername, pack, boom, subpacks);
        const { data, error } = await this.supabase.rpc('create_order', { tguserid, tgusername, pack, boom, subpacks });
        console.log('function create_order', data, error);
        if (error) {
          console.log('服务器内部错误');
          return;
        }
        const { code, orderId } = data;
        if (code == 1) {
          const replyPayload = {
            chat_id: message.chat.id,
            text: `余额不足`,
            reply_to_message_id: message.message_id
          };
          await this.sendApi('sendMessage', replyPayload);
          return;
        } else if (code == 2) {
          console.log('其他错误');
          return;
        }

        const textMsg = `【${tgusername}】发了一个${pack}U的红包，大家快来抢啊！`;
        console.log(textMsg);
        const fistInlineKeyboardText = this.formatFirstInlineKeyboardText(pack, 0, boom);
        const reply_markup = {
          inline_keyboard: [
            [{ text: fistInlineKeyboardText, callback_data: `joinGame-${orderId}` }],
            ...this.generateDefaultInlineKeyboards()
          ]
        };

        const payload = {
          chat_id: message.chat.id,
          photo: this.coverImageUrl,
          caption: textMsg,
          reply_to_message_id: message.message_id,
          reply_markup: JSON.stringify(reply_markup)
        };
        await this.sendApi('sendPhoto', payload);
      } else if (/^\/help$/.test(message.text)) {

      } else if (/^\/invite$/.test(message.text)) {
        console.log('invite');
        await this.createChatInviteLink(message.chat.id);
      } else if (/^\/uninvite\shttps:\/\/t\.me\/\+\w+/.test(message.text)) {
        const [, inviteUrl] = message.text.split(/\s/);
        console.log('uninvite', inviteUrl);
        await this.revokeChatInviteLink(message.chat.id, inviteUrl);
      }
    }
  }

  private async handlerPrivateTextMessage(update: any) {

  }

  private async handlerCallbackMessage(update: any) {
    const {data: callback_data, message, from, id: callback_query_id} = update.callback_query;
    console.log('callback_data -> ' + JSON.stringify(callback_data));

    const { id: tgid, first_name = '', last_name = '' } = from;
    const tgname = `${first_name}${last_name}` || '木有名字';

    if (/^joinGame\-\d+/.test(callback_data)) {
      const [, orderId] = callback_data.split("-");
      let { data, error } = await this.supabase.rpc('get_pack', { tgid, tgname, oid: orderId }, { transaction: true });
      console.log('get_pack', data, error);
      if (error) return;
      const { code, done, isBoom, orderBoom, pack, subpack, msg, progress, settlement, orderDetails } = data;
      if (code == 0) {
        const answerText = isBoom ? `恭喜老板，喜提💣一颗, 结算${settlement}U.` : `恭喜老板，抢到🧧${subpack}U.`;
        await this.answerCallbackQuery(callback_query_id, answerText);
        if (done) {
          let { data: dbOrder, error: e1 } = await this.supabase.from('orders').select().eq('id', orderId).maybeSingle();
          console.log('e1', e1);
          if (e1) return;
          let { data: dbOrderDetails, error: e2 } = await this.supabase.from('order_details').select().eq('order_id', orderId);
          console.log('e2', e2);
          if (e2) return;
          const formatText = this.generateSettlementText(dbOrder, dbOrderDetails);
          const reply_markup = {
            inline_keyboard: [
              ...this.generateDefaultInlineKeyboards()
            ]
          };
          const payload = {
            chat_id: message?.chat?.id,
            message_id: message?.message_id,
            caption: formatText,
            parse_mode: 'HTML',
            reply_markup: JSON.stringify(reply_markup)
          };
          await this.sendApi('editMessageCaption', payload);
        } else {
          // 更新进度
          const fistInlineKeyboardText = this.formatFirstInlineKeyboardText(pack, progress, orderBoom);
          const reply_markup = {
            inline_keyboard: [
              [{ text: fistInlineKeyboardText, callback_data: `${callback_data}` }],
              ...this.generateDefaultInlineKeyboards()
            ]
          };
          const payload = {
            chat_id: message?.chat?.id,
            message_id: message?.message_id,
            reply_markup: JSON.stringify(reply_markup)
          };
          await this.sendApi('editMessageReplyMarkup', payload);
        }
      } else if (code == -1) {
        await this.answerCallbackQuery(callback_query_id, '抢包失败.');
      } else if (code == 1) {
        await this.answerCallbackQuery(callback_query_id, msg);
      } else if (code == 2) {
        await this.answerCallbackQuery(callback_query_id, '您已经抢过这个包.');
      } else if (code == 3) {
        await this.answerCallbackQuery(callback_query_id, '包已抢完.');
      } else if (code == 4) {
        await this.answerCallbackQuery(callback_query_id, '无法抢自己的包.');
      }



      return;
    } else if (/^queryBalance/.test(callback_data)) {
      let { data: { amount }, error } = await this.supabase.from('users').select('amount').eq('tg_id', tgid).maybeSingle();
      await this.answerCallbackQuery(callback_query_id, `当前余额：${amount} U.`);
      console.log('query balance', amount, error);
      return;
    } else if (/^queryPromo/.test(callback_data)) {

      return;
    }

  }

  private async handlerNewChatMember(update: any) {
    const { message_id, new_chat_members, chat } = update.message;
    const [ newMember ] = new_chat_members;
    // 是否已经存在
    let { count, error } = await this.supabase.from('users').select('*', { count: 'exact' }).eq('tg_id', newMember.id);
    console.log('memeber if exists', count, error);
    if (error) return;
    if (count == 0) {
      let { error } = await this.supabase.from('users').insert({ tg_id: newMember.id });
      console.log('new member', error);
      if (error) return;
      const replyPayload = {
        chat_id: chat.id,
        text: `你好，[${newMember.first_name}](tg://user?id=${newMember.id})，欢迎光临`,
        parse_mode: 'MarkdownV2'
      };
      await this.sendApi('sendMessage', replyPayload);
    } else {
      const replyPayload = {
        chat_id: chat.id,
        text: `你好，[${newMember.first_name}](tg://user?id=${newMember.id})，欢迎回家`,
        parse_mode: 'MarkdownV2'
      };
      await this.sendApi('sendMessage', replyPayload);
    }
  }

  private async answerCallbackQuery(callback_query_id: number, text: string, show_alert: boolean = true) {
    let payload = {
      callback_query_id,
      text,
      show_alert
    }
    await this.sendApi('answerCallbackQuery', payload);
  }

  private async createChatInviteLink(chat_id: number, member_limit: number = 99999) {
    let payload = {
      chat_id,
      // expire_date: 4100774399,
      // member_limit
    };
    const res = await this.sendApi('createChatInviteLink', payload);
    console.log('createChatInviteLink', res);
    // let payload2 = {chat_id}
    // const res2 = await this.sendApi('exportChatInviteLink', payload2);
    // console.log('exportChatInviteLink', res2);
  }

  private async revokeChatInviteLink(chat_id: number, invite_link: string) {
    let payload = {
      chat_id,
      invite_link
    };
    const res = await this.sendApi('revokeChatInviteLink', payload);
    console.log('revokeChatInviteLink', res);
  }

  private async sendApi(apiName: string, payload: any) {
    const url = `${TelegramBot.BASE_API}${this.botToken}/${apiName}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resultJson = await res.json();
    if (res.ok) {
      console.log(`call api[ ${url} ] success.`, resultJson);
    } else {
      console.log(`call api[ ${url} ] fail.`, resultJson);
    }

    return resultJson;
  }

  private generateRandomNumbers(totalAmount: number): number[] {
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

  private formatFirstInlineKeyboardText(pack: number, progress: number, orderBoom: number) {
    return `🧧抢红包[ ${this.packAmount} / ${progress} ]总 ${pack} U💣雷${orderBoom}`
  }

  private formatRowText(row: any) {
    const flag = row.boom ? '💥' : '💵';
    return `[${flag}] ${row.sub_pack.toFixed(2)}  U ${row.tg_name}`;
  }

  private generateDefaultInlineKeyboards() {
    return [
      [
        { text: '自助服务', url: `https://t.me/${this.botUsername}` },
        { text: '联系客服', url: `https://t.me/${this.botUsername}` },
        { text: '自助开群', url: `https://t.me/${this.botUsername}` }
      ],
      [
        { text: '余额', callback_data: 'queryBalance' },
        { text: '邀请', callback_data: 'queryPromo' }
      ]
    ];
  }

  private generateSettlementText(order: any, orderDetails: any[]) {

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
🛎红包倍数：${this.packRate}
💣中雷数字：${order.boom}


--------领取详情--------
1️⃣. ${this.formatRowText(orderDetails[0])}
2️⃣. ${this.formatRowText(orderDetails[1])}
3️⃣. ${this.formatRowText(orderDetails[2])}
4️⃣. ${this.formatRowText(orderDetails[3])}
5️⃣. ${this.formatRowText(orderDetails[4])}
6️⃣. ${this.formatRowText(orderDetails[5])}

💹 中雷盈利：${zlyl.toFixed(2)}
💹 发包成本：-${order.pack.toFixed(2)}
💹 包主实收：${bzss.toFixed(2)}
    `;

    return formatText;
  }

}
