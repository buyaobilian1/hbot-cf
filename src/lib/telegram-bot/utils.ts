

enum ParseMode {
	HTML = "HTML",
	Markdown = "Markdown",
	MarkdownV2 = "MarkdownV2"
}

// telegram文本处理
function escapeText(parseMode: 'HTML'|'Markdown'|'MarkdownV2', text: string): string {
	let replacer: [string, string][];

	if (parseMode === ParseMode.HTML) {
		replacer = [["<", "&lt;"], [">", "&gt;"], ["&", "&amp;"]];
	} else if (parseMode === ParseMode.Markdown) {
		replacer = [["_", "\\_"], ["*", "\\*"], ["`", "\\`"], ["[", "\\["]];
	} else if (parseMode === ParseMode.MarkdownV2) {
		replacer = [
			["_", "\\_"], ["*", "\\*"], ["[", "\\["], ["]", "\\]"], ["(", "\\("],
			[")", "\\)"], ["~", "\\~"], ["`", "\\`"], [">", "\\>"],
			["#", "\\#"], ["+", "\\+"], ["-", "\\-"], ["=", "\\="],
			["|", "\\|"], ["{", "\\{"], ["}", "\\}"], [".", "\\."], ["!", "\\!"],
		];
	} else {
		return "";
	}

	return replacer.reduce((acc, [search, replace]) => acc.split(search).join(replace), text);
}

export {
	escapeText
}

export type {
	ParseMode
}
