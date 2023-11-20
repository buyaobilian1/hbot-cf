import {createClient, SupabaseClient} from "@supabase/supabase-js";

type GenericAsyncFunction<T, R> = (arg: T) => Promise<R>;
type WebhookHandleFunction = GenericAsyncFunction<TgBot, any>;
type ConditionFunction = (update: any) => boolean;

export class TgBot {
	private static readonly BASE_API = `https://api.telegram.org/bot`;
	// private static readonly BASE_API = `http://localhost:3100/bot`;

	private _update: any;
	public readonly env: Env;
	public readonly supabase: SupabaseClient;

	get update(): any {
		return this._update;
	}
	set update(update: any) {
		this._update = update;
	}

	// 消息处理的前置条件
	private preconditions: Set<ConditionFunction> = new Set<ConditionFunction>();
	private newChatMemberHandler: WebhookHandleFunction | undefined;
	private leftChatMemberHandler: WebhookHandleFunction | undefined;
	// text handlers
	private textHandlers: Map<string | RegExp, WebhookHandleFunction> = new Map<string | RegExp, WebhookHandleFunction>();
	// callback handlers
	private callbackHandlers: Map<string | RegExp, WebhookHandleFunction> = new Map<string | RegExp, WebhookHandleFunction>();


	constructor(env: Env) {
		this.env = env;
		this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
	}

	public setPrecondition(condition: ConditionFunction) {
		this.preconditions.add(condition);
	}

	public onText(arg: string|RegExp, func: WebhookHandleFunction) {
		this.textHandlers.set(arg, func);
	}

	public onCallback(arg: string | RegExp, func: WebhookHandleFunction) {
		this.callbackHandlers.set(arg, func);
	}

	public onNewChatMember(func: WebhookHandleFunction) {
		this.newChatMemberHandler = func;
	}

	public onLeftChatMember(func: WebhookHandleFunction) {
		this.leftChatMemberHandler = func;
	}

	// 发送text消息
	public async sendMessage(text: string, args: {[key: string]: any}) {
		const { message } = this.update;
		const { chat } = message;
		let payload = {
			chat_id: chat.id,
			text,
			...args
		}
		await this.sendRaw('sendMessage', payload)
	}

	// 编辑text消息
	public async editMessage(text: string, args: {[key: string]: any}) {
		const { message } = this.update;
		const { chat,  message_id } = message;
		let payload = {
			chat_id: chat?.id,
			message_id,
			text,
			...args
		}
		await this.sendRaw('editMessageText', payload);
	}

	// 消息转发
	public async forward(chatId: number, args?: {[key:string]: any}) {
		const {message} = this.update;
		const {chat, message_id} = message;

		let payload = {
			from_chat_id: chat?.id,
			chat_id: chatId,
			message_id,
			...args
		}
		await this.sendRaw('forwardMessage', payload);
	}

	// 复制消息
	public async copy(chatId: number, args?: {[key:string]: any}) {
		const {message} = this.update;
		const {chat, message_id} = message;

		let payload = {
			from_chat_id: chat?.id,
			chat_id: chatId,
			message_id,
			...args
		}
		await this.sendRaw('forwardMessage', payload);
	}

	// 回复消息
	public async reply(text: string, args?: {[key: string]: any}) {
		let message, chat;
		if (this.update?.message) {
			message = this.update.message;
			chat = message?.chat;
		} else if (this.update?.callback_query) {
			message = this.update.callback_query?.message;
			chat = message.chat;
		}

		let payload = {
			chat_id: chat.id,
			reply_to_message_id: message.message_id,
			text,
			...args
		}
		await this.sendRaw('sendMessage', payload)
	}

	// 删除消息
	public async deleteMessage(args?: { [key: string]: any }) {
		const { message } = this.update;
		const { chat } = message;
		let payload = {
			chat_id: chat.id,
			message_id: message.message_id,
			...args
		}
		await this.sendRaw('deleteMessage', payload);
	}

	public async answerCallbackQuery( args?: { [key: string]: any }) {
		if (!this.update?.callback_query) {
			console.error('is not callback query');
			return Promise.resolve();
		}
		const { id } = this.update?.callback_query;
		let payload = {
			callback_query_id: id,
			...args
		}
		await this.sendRaw('answerCallbackQuery', payload);
	}

	public async handleWebhook(update: any): Promise<any> {
		this.update = update;

		// 前置过滤
		for (const condFun of this.preconditions) {
			if (!condFun(update)) {
				return
			}
		}

		// 文本消息匹配
		if (update?.message?.text) {
			for (const [key, func] of this.textHandlers) {
				// 正则匹配
				if (key instanceof RegExp) {
					if ((key as RegExp).test(update.message.text)) {
						return await func(this);
					}
				}

				if (update.message.text === key) {
					return await func(this);
				}
			}
		}

		// callback消息处理
		if (update?.callback_query) {
			for (const [key, func] of this.callbackHandlers) {
				// 正则匹配
				if (key instanceof RegExp) {
					if ((key as RegExp).test(update?.callback_query?.data)) {
              return await func(this);
					}
				}

				if (update?.callback_query?.data === key) {
					return await func(this);
				}
			}
		}

		// 成员进群消息
		if (update?.message?.new_chat_members && this.newChatMemberHandler) {
			await this.newChatMemberHandler(this);
		}
		// 成员退群消息
		if (update?.message?.left_chat_member && this.leftChatMemberHandler) {
			await this.leftChatMemberHandler(this);
		}


		return new Response();
	}

	public async sendRaw(apiName: string, payload: any) {
		const url = `${TgBot.BASE_API}${this.env.BOT_TOKEN}/${apiName}`;
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

}
