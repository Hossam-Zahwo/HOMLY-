import { BoundableStatement } from "../_chunks/statement.mjs";
function cloudflareD1Connector(options) {
	const getDB = () => {
		const binding = globalThis.__env__?.[options.bindingName] || globalThis.__cf_env__?.[options.bindingName];
		if (!binding) throw new Error(`[db0] [d1] binding \`${options.bindingName}\` not found`);
		return binding;
	};
	return {
		name: "cloudflare-d1",
		dialect: "sqlite",
		capabilityOverrides: { transactions: false },
		getInstance: () => getDB(),
		exec: (sql) => getDB().exec(sql),
		prepare: (sql) => new StatementWrapper(getDB().prepare(sql))
	};
}
var StatementWrapper = class extends BoundableStatement {
	async all(...params) {
		return (await this._statement.bind(...params).all()).results;
	}
	async run(...params) {
		return await this._statement.bind(...params).run();
	}
	async get(...params) {
		return await this._statement.bind(...params).first();
	}
};
export { cloudflareD1Connector as default };
