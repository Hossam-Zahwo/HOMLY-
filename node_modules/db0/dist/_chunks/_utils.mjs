import { Column, SQL, Subquery, getColumnTable, getTableName, getTableUniqueName, is } from "drizzle-orm";
const converters = /* @__PURE__ */ new WeakMap();
const byInsertionOrder = (row) => {
	const keys = Object.keys(row);
	assertOrdered(keys);
	return keys.map((key) => row[key]);
};
function getRowConverter(mapper) {
	return (mapper && converters.get(mapper)) ?? byInsertionOrder;
}
function trackSelectedFields(dialect) {
	const generators = dialect.mapperGenerators;
	const generateRows = generators.rows;
	generators.rows = (columns, joinsNotNullableMap) => {
		const mapper = generateRows(columns, joinsNotNullableMap);
		let checked = false;
		const checkedMapper = (rows) => {
			if (!checked) {
				assertAliasesUnambiguous(columns);
				checked = true;
			}
			return mapper(rows);
		};
		converters.set(checkedMapper, createRowConverter(columns));
		return checkedMapper;
	};
	return dialect;
}
function getKey(field) {
	if (is(field, Column)) return field.name;
	if (is(field, SQL.Aliased)) return field.fieldAlias;
	if (is(field, Subquery)) return field._.alias;
}
function isAliasKeyed(field) {
	return is(field, SQL.Aliased) || is(field, Subquery);
}
const expressionIds = /* @__PURE__ */ new WeakMap();
let lastExpressionId = 0;
function expressionId(expression) {
	let id = expressionIds.get(expression);
	if (id === void 0) expressionIds.set(expression, id = ++lastExpressionId);
	return id;
}
function getIdentity(field) {
	if (is(field, Column)) return `${getTableUniqueName(getColumnTable(field))}.${field.name}`;
	if (is(field, Subquery)) return `subquery.${field._.alias}#${expressionId(field._.sql)}`;
	const aliased = field;
	return `alias.${aliased.fieldAlias}#${expressionId(aliased.sql)}`;
}
function getLabel(field, path) {
	if (is(field, Column)) return `${getTableLabel(getColumnTable(field))}.${field.name}`;
	if (is(field, Subquery)) return `${path.join(".")} (subquery "${field._.alias}")`;
	return `${path.join(".")} (aliased as "${field.fieldAlias}")`;
}
function getTableLabel(table) {
	const name = getTableName(table);
	const uniqueName = getTableUniqueName(table);
	return uniqueName === `public.${name}` ? name : uniqueName;
}
function createRowConverter(fields) {
	let convert;
	return (row) => (convert ??= planRowConverter(fields, row))(row);
}
function planRowConverter(fields, row) {
	const rowKeys = Object.keys(row);
	const named = new Set(rowKeys);
	const keys = fields.map(({ field }) => {
		const key = getKey(field);
		return key !== void 0 && named.has(key) ? key : void 0;
	});
	assertUnambiguous(fields, keys);
	if (keys.every((key) => key !== void 0)) return (row) => keys.map((key) => row[key]);
	const claimed = new Set(keys.filter((key) => key !== void 0));
	const unclaimed = rowKeys.filter((key) => !claimed.has(key));
	assertMatched(fields, keys, unclaimed);
	assertOrdered(unclaimed);
	let index = 0;
	const resolved = keys.map((key) => key ?? unclaimed[index++]);
	return (row) => resolved.map((key) => row[key]);
}
const ARRAY_INDEX_KEY_RE = /^(?:0|[1-9]\d{0,9})$/;
function isArrayIndexKey(key) {
	const first = key.charCodeAt(0);
	if (first < 48 || first > 57) return false;
	return ARRAY_INDEX_KEY_RE.test(key) && Number(key) < 2 ** 32 - 1;
}
function assertOrdered(keys) {
	if (keys.length < 2) return;
	const reordered = keys.find((key) => isArrayIndexKey(key));
	if (reordered !== void 0) throw new Error(`[db0] [drizzle] cannot map query result: the driver named a selected expression \`${reordered}\`, and JavaScript enumerates such keys before all others, so the remaining expressions can no longer be told apart. Alias the expression (\`sql\`...\`.as("name")\`) so it can be matched by name.`);
}
function assertMatched(fields, keys, unclaimed) {
	const unmatched = fields.filter((_, index) => keys[index] === void 0);
	if (unmatched.length === unclaimed.length) return;
	const labels = unmatched.map(({ path }) => `\`${path.join(".")}\``).join(", ");
	throw new Error(`[db0] [drizzle] cannot map query result: the driver returned ${unclaimed.length} column(s) no selected field is named after, for the ${unmatched.length} selected expression(s) ${labels} that have to be matched by position. db0 connectors return object rows, so identically named expressions collapse into one value. Select them with unique aliases (\`sql\`...\`.as("alias")\`) so they can be matched by name.`);
}
function assertUnambiguous(fields, keys) {
	const owners = /* @__PURE__ */ new Map();
	for (const [index, key] of keys.entries()) {
		if (key === void 0) continue;
		const { field, path } = fields[index];
		const identity = getIdentity(field);
		const owner = owners.get(key);
		if (owner === void 0) owners.set(key, {
			identity,
			label: getLabel(field, path)
		});
		else if (owner.identity !== identity) throw new Error(`[db0] [drizzle] cannot map query result: \`${owner.label}\` and \`${getLabel(field, path)}\` both come back as \`${key}\`. db0 connectors return object rows, so same-named columns collapse into one value. Select them with unique aliases (\`sql\`\${table.column}\`.as("alias")\`) or use the relational query builder (\`db.query.*\`).`);
	}
}
function assertAliasesUnambiguous(fields) {
	const aliased = fields.filter(({ field }) => isAliasKeyed(field));
	assertUnambiguous(aliased, aliased.map(({ field }) => getKey(field)));
}
function useJitMappers(enabled) {
	if (!enabled) return false;
	try {
		return new Function("input", "\"use strict\"; return input;")(true) === true;
	} catch {
		return false;
	}
}
function assertNoCasingOption(config) {
	if (config && typeof config === "object" && "casing" in config) throw new Error("[db0] [drizzle] The `casing` option was removed in drizzle-orm v1. Apply `snakeCase.table()` / `camelCase.table()` (from `drizzle-orm`) to your schema instead.");
}
function attachCache(db, cache) {
	if (!cache) return;
	const $cache = cache;
	$cache.invalidate = cache.onMutate;
	db.$cache = $cache;
}
export { assertNoCasingOption, attachCache, getRowConverter, trackSelectedFields, useJitMappers };
