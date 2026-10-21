import { BoundableStatement } from "../../_chunks/statement.mjs";
function libSqlCoreConnector(opts) {
	const query = async (sql) => (await opts.getClient()).execute(sql);
	return {
		name: opts.name || "libsql-core",
		dialect: "libsql",
		capabilityOverrides: opts.capabilityOverrides,
		getInstance: async () => opts.getClient(),
		exec: (sql) => query(sql),
		prepare: (sql) => new StatementWrapper(sql, query),
		dispose: opts.dispose || (async () => {
			(await opts.getClient())?.close?.();
		})
	};
}
var StatementWrapper = class extends BoundableStatement {
	#query;
	#sql;
	constructor(sql, query) {
		super();
		this.#sql = sql;
		this.#query = query;
	}
	async all(...params) {
		return (await this.#query({
			sql: this.#sql,
			args: params
		})).rows;
	}
	async run(...params) {
		return { ...await this.#query({
			sql: this.#sql,
			args: params
		}) };
	}
	async get(...params) {
		return (await this.#query({
			sql: this.#sql,
			args: params
		})).rows[0];
	}
};
export { libSqlCoreConnector as default };
