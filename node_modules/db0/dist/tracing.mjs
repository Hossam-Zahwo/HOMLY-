import { sqlTemplate } from "./_chunks/template.mjs";
const QUERY_CHANNEL = "db0.query";
const TRACED = Symbol.for("db0.traced");
var TracedStatement = class TracedStatement {
	#statement;
	#query;
	#traceQuery;
	constructor(statement, query, traceQuery) {
		this.#statement = statement;
		this.#query = query;
		this.#traceQuery = traceQuery;
	}
	bind(...args) {
		return new TracedStatement(this.#statement.bind(...args), this.#query, this.#traceQuery);
	}
	all(...args) {
		return this.#traceQuery(async () => this.#statement.all(...args), "prepare.all", this.#query);
	}
	run(...args) {
		return this.#traceQuery(async () => this.#statement.run(...args), "prepare.run", this.#query);
	}
	get(...args) {
		return this.#traceQuery(async () => this.#statement.get(...args), "prepare.get", this.#query);
	}
};
function withTracing(db) {
	if (db[TRACED]) return db;
	let tracingChannel;
	try {
		tracingChannel = globalThis.process?.getBuiltinModule?.("node:diagnostics_channel")?.tracingChannel;
	} catch {
		tracingChannel = void 0;
	}
	if (!tracingChannel) return db;
	const queryChannel = tracingChannel(QUERY_CHANNEL);
	async function traceQuery(exec, method, query) {
		if (!queryChannel.hasSubscribers) return exec();
		return queryChannel.tracePromise(exec, {
			query: typeof query === "function" ? query() : query,
			method,
			connector: db.connector,
			dialect: db.dialect
		});
	}
	const tracedDb = {
		get connector() {
			return db.connector;
		},
		get dialect() {
			return db.dialect;
		},
		get capabilities() {
			return db.capabilities;
		},
		get disposed() {
			return db.disposed;
		},
		getInstance: () => db.getInstance(),
		exec: (query) => traceQuery(async () => db.exec(query), "exec", query),
		prepare: (query) => new TracedStatement(db.prepare(query), query, traceQuery),
		sql: (strings, ...values) => traceQuery(async () => db.sql(strings, ...values), "sql", () => sqlTemplate(strings, ...values)[0]),
		dispose: () => db.dispose(),
		[Symbol.asyncDispose]: () => db[Symbol.asyncDispose]()
	};
	Object.defineProperty(tracedDb, TRACED, { value: true });
	return tracedDb;
}
export { QUERY_CHANNEL, withTracing };
