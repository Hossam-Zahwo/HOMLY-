function normalizeParams(sql) {
	if (!sql.includes("?")) return sql;
	let result = "";
	let index = 0;
	let paramIndex = 0;
	let hasNumberedParams = false;
	while (index < sql.length) {
		const char = sql[index];
		switch (char) {
			case "'":
			case "\"": {
				const end = skipQuoted(sql, index, char);
				result += sql.slice(index, end);
				index = end;
				continue;
			}
			case "-": {
				if (sql[index + 1] !== "-") break;
				const newline = sql.indexOf("\n", index);
				const end = newline === -1 ? sql.length : newline;
				result += sql.slice(index, end);
				index = end;
				continue;
			}
			case "/": {
				if (sql[index + 1] !== "*") break;
				const end = skipBlockComment(sql, index);
				result += sql.slice(index, end);
				index = end;
				continue;
			}
			case "$": {
				if (isIdentifierChar(sql[index - 1])) break;
				if (isDigit(sql[index + 1])) {
					hasNumberedParams = true;
					break;
				}
				const end = skipDollarQuoted(sql, index);
				if (end === -1) break;
				result += sql.slice(index, end);
				index = end;
				continue;
			}
			case "?":
				result += `$${++paramIndex}`;
				index++;
				continue;
		}
		result += char;
		index++;
	}
	if (hasNumberedParams && paramIndex > 0) throw new Error("[db0] cannot mix `?` placeholders with numbered `$n` parameters in the same query");
	return result;
}
function skipQuoted(sql, start, quote) {
	const escapes = quote === "'" && isEscapeStringPrefix(sql, start);
	let index = start + 1;
	while (index < sql.length) {
		if (escapes && sql[index] === "\\") index++;
		else if (sql[index] === quote) {
			if (sql[index + 1] === quote) index++;
			else return index + 1;
		}
		index++;
	}
	return sql.length;
}
const IDENTIFIER_CHAR_RE = /[\w$\u0080-\uFFFF]/;
function isIdentifierChar(char) {
	return char !== void 0 && IDENTIFIER_CHAR_RE.test(char);
}
function isDigit(char) {
	return char !== void 0 && char >= "0" && char <= "9";
}
function isEscapeStringPrefix(sql, start) {
	const prefix = sql[start - 1];
	return (prefix === "E" || prefix === "e") && !isIdentifierChar(sql[start - 2]);
}
function skipBlockComment(sql, start) {
	let index = start + 2;
	let depth = 1;
	while (index < sql.length && depth > 0) if (sql[index] === "/" && sql[index + 1] === "*") {
		depth++;
		index += 2;
	} else if (sql[index] === "*" && sql[index + 1] === "/") {
		depth--;
		index += 2;
	} else index++;
	return index;
}
const DOLLAR_TAG_RE = /\$[A-Z_a-z\u0080-\uFFFF][\w\u0080-\uFFFF]*\$|\$\$/y;
function skipDollarQuoted(sql, start) {
	DOLLAR_TAG_RE.lastIndex = start;
	const tag = DOLLAR_TAG_RE.exec(sql)?.[0];
	if (!tag) return -1;
	const end = sql.indexOf(tag, start + tag.length);
	return end === -1 ? sql.length : end + tag.length;
}
export { normalizeParams };
