const { randomUUID } = require("crypto");
const { isDeepStrictEqual } = require("node:util");

const DEFAULT_DB_PREFIX = process.env.CLOUDANT_DB_PREFIX || "farmer_marketplace";

const getCloudantBaseUrl = () => {
  const baseUrl =
    process.env.CLOUDANT_URL ||
    process.env.IBM_CLOUDANT_URL ||
    process.env.CLOUDANT_SERVICE_URL ||
    "";

  if (!baseUrl) {
    throw new Error("Cloudant URL is not configured.");
  }

  const parsed = new URL(baseUrl);
  parsed.username = "";
  parsed.password = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");

  return parsed.toString().replace(/\/+$/, "");
};

const getCloudantApiKey = () =>
  process.env.CLOUDANT_API_KEY ||
  process.env.IBM_CLOUDANT_APIKEY ||
  process.env.CLOUDANT_IAM_API_KEY ||
  "";

const getDatabaseName = (entity) => `${DEFAULT_DB_PREFIX}_${entity}`;

const getAuthHeaders = () => {
  const baseUrl =
    process.env.CLOUDANT_URL ||
    process.env.IBM_CLOUDANT_URL ||
    process.env.CLOUDANT_SERVICE_URL ||
    "";
  const apiKey = getCloudantApiKey();
  const parsed = baseUrl ? new URL(baseUrl) : null;

  if (parsed && parsed.username && parsed.password) {
    return {
      Authorization: `Basic ${Buffer.from(`${parsed.username}:${parsed.password}`).toString("base64")}`,
    };
  }

  if (!apiKey) {
    return {};
  }

  return {
    Authorization: `Basic ${Buffer.from(`apikey:${apiKey}`).toString("base64")}`,
  };
};

const requestJson = async (path, { method = "GET", body, headers = {} } = {}) => {
  const baseUrl = getCloudantBaseUrl();

  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const wrapped = new Error(`${method} ${path} failed: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }

  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message = payload?.reason || payload?.error || response.statusText || "Cloudant request failed.";
    const error = new Error(message);
    error.message = `${method} ${path} failed: ${message}`;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const ensureDatabase = async (dbName) => {
  try {
    await requestJson(`/${encodeURIComponent(dbName)}`, { method: "HEAD" });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    await requestJson(`/${encodeURIComponent(dbName)}`, { method: "PUT" });
  }
};

const listDocs = async (dbName) => {
  const docs = [];
  const limit = 1000;
  let skip = 0;

  while (true) {
    const payload = await requestJson(
      `/${encodeURIComponent(dbName)}/_all_docs?include_docs=true&limit=${limit}&skip=${skip}`
    );
    const rows = Array.isArray(payload.rows) ? payload.rows : [];

    rows.forEach((row) => {
      if (row.doc) {
        docs.push(row.doc);
      }
    });

    if (rows.length < limit) {
      break;
    }

    skip += limit;
  }

  return docs;
};

const getDoc = async (dbName, docId) => {
  try {
    return await requestJson(`/${encodeURIComponent(dbName)}/${encodeURIComponent(docId)}`);
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
};

const putDoc = async (dbName, doc) => {
  if (!doc || !doc._id) {
    throw new Error("Document _id is required.");
  }

  const payload = await requestJson(`/${encodeURIComponent(dbName)}/${encodeURIComponent(doc._id)}`, {
    method: "PUT",
    body: doc,
  });

  return {
    ...doc,
    _rev: payload.rev,
  };
};

const deleteDoc = async (dbName, doc) => {
  if (!doc || !doc._id || !doc._rev) {
    throw new Error("Document _id and _rev are required for deletion.");
  }

  return requestJson(
    `/${encodeURIComponent(dbName)}/${encodeURIComponent(doc._id)}?rev=${encodeURIComponent(doc._rev)}`,
    { method: "DELETE" }
  );
};

const getPathValues = (source, path) => {
  const segments = String(path || "").split(".").filter(Boolean);

  const walk = (value, index) => {
    if (index >= segments.length) {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => walk(item, index));
    }

    if (!value || typeof value !== "object") {
      return [undefined];
    }

    return walk(value[segments[index]], index + 1);
  };

  return walk(source, 0).flat();
};

const isOperatorObject = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).some((key) => key.startsWith("$"));

const matchesField = (fieldValues, condition) => {
  const values = fieldValues.length ? fieldValues : [undefined];

  if (!isOperatorObject(condition)) {
    return values.some((value) => isDeepStrictEqual(value, condition));
  }

  const operators = Object.entries(condition);

  return values.some((value) =>
    operators.every(([operator, expected]) => {
      if (operator === "$in") {
        return Array.isArray(expected) && expected.some((entry) => isDeepStrictEqual(entry, value));
      }

      if (operator === "$eq") {
        return isDeepStrictEqual(value, expected);
      }

      if (operator === "$ne") {
        return !isDeepStrictEqual(value, expected);
      }

      if (operator === "$gt") {
        return value > expected;
      }

      if (operator === "$gte") {
        return value >= expected;
      }

      if (operator === "$lt") {
        return value < expected;
      }

      if (operator === "$lte") {
        return value <= expected;
      }

      if (operator === "$exists") {
        return expected ? value !== undefined : value === undefined;
      }

      return true;
    })
  );
};

const matchesSelector = (doc, selector = {}) => {
  if (!selector || Object.keys(selector).length === 0) {
    return true;
  }

  if (Array.isArray(selector.$or) && !selector.$or.some((branch) => matchesSelector(doc, branch))) {
    return false;
  }

  if (Array.isArray(selector.$and) && !selector.$and.every((branch) => matchesSelector(doc, branch))) {
    return false;
  }

  return Object.entries(selector).every(([field, condition]) => {
    if (field === "$or" || field === "$and") {
      return true;
    }

    return matchesField(getPathValues(doc, field), condition);
  });
};

const getSortValue = (doc, field) => {
  const values = getPathValues(doc, field);
  const value = values.find((entry) => entry !== undefined && entry !== null);

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && /date|at|time/i.test(field)) {
      return parsed;
    }
  }

  return value;
};

const sortDocs = (docs, sort = []) => {
  const normalizedSort = Array.isArray(sort)
    ? sort.flatMap((entry) =>
        Object.entries(entry || {}).map(([field, direction]) => ({
          field,
          direction: Number(direction) < 0 ? -1 : 1,
        }))
      )
    : Object.entries(sort || {}).map(([field, direction]) => ({
        field,
        direction: Number(direction) < 0 ? -1 : 1,
      }));

  if (!normalizedSort.length) {
    return docs;
  }

  return [...docs].sort((left, right) => {
    for (const { field, direction } of normalizedSort) {
      const leftValue = getSortValue(left, field);
      const rightValue = getSortValue(right, field);

      if (leftValue === rightValue) {
        continue;
      }

      if (leftValue === undefined || leftValue === null) {
        return 1 * direction;
      }

      if (rightValue === undefined || rightValue === null) {
        return -1 * direction;
      }

      if (leftValue < rightValue) {
        return -1 * direction;
      }

      if (leftValue > rightValue) {
        return 1 * direction;
      }
    }

    return 0;
  });
};

const createTimestampedDoc = (entity, doc = {}) => {
  const now = new Date().toISOString();

  return {
    _id: doc._id || `${entity}_${randomUUID()}`,
    type: entity,
    createdAt: doc.createdAt || now,
    updatedAt: now,
    ...doc,
  };
};

class CloudantRepository {
  constructor(entity, { dbName } = {}) {
    this.entity = entity;
    this.dbName = dbName || getDatabaseName(entity);
    this.ready = null;
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = ensureDatabase(this.dbName);
    }

    return this.ready;
  }

  async listAll() {
    await this.ensureReady();
    return listDocs(this.dbName);
  }

  async find(selector = {}, { sort = [], limit, skip } = {}) {
    const docs = (await this.listAll()).filter((doc) => doc.type === this.entity && matchesSelector(doc, selector));
    const sorted = sortDocs(docs, sort);
    const start = Number.isInteger(skip) ? skip : 0;
    const end = Number.isInteger(limit) ? start + limit : undefined;
    return sorted.slice(start, end);
  }

  async findOne(selector = {}, options = {}) {
    return (await this.find(selector, options))[0] || null;
  }

  async findById(id) {
    await this.ensureReady();
    const doc = await getDoc(this.dbName, id);
    if (!doc || doc.type !== this.entity) {
      return null;
    }

    return doc;
  }

  async create(doc = {}) {
    await this.ensureReady();
    const payload = createTimestampedDoc(this.entity, doc);
    const saved = await putDoc(this.dbName, payload);
    return saved;
  }

  async save(doc) {
    await this.ensureReady();

    if (!doc || !doc._id) {
      throw new Error("Document _id is required.");
    }

    const current = await this.findById(doc._id);

    if (!current) {
      throw new Error("Document not found.");
    }

    const payload = {
      ...current,
      ...doc,
      type: this.entity,
      createdAt: current.createdAt || doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (current._rev) {
      payload._rev = current._rev;
    }

    return putDoc(this.dbName, payload);
  }

  async updateById(id, updater) {
    const doc = await this.findById(id);
    if (!doc) {
      return null;
    }

    const nextDoc = typeof updater === "function" ? await updater({ ...doc }) : { ...doc, ...updater };
    nextDoc._id = doc._id;
    nextDoc._rev = doc._rev;
    nextDoc.type = this.entity;
    nextDoc.createdAt = doc.createdAt;
    nextDoc.updatedAt = new Date().toISOString();
    return this.save(nextDoc);
  }

  async deleteById(id) {
    const doc = await this.findById(id);
    if (!doc) {
      return null;
    }

    await deleteDoc(this.dbName, doc);
    return doc;
  }

  async deleteMany(selector = {}) {
    const docs = await this.find(selector);
    for (const doc of docs) {
      await deleteDoc(this.dbName, doc);
    }

    return { deletedCount: docs.length };
  }

  async updateMany(selector = {}, updater) {
    const docs = await this.find(selector);
    let modifiedCount = 0;

    for (const doc of docs) {
      const nextDoc = typeof updater === "function" ? await updater({ ...doc }) : { ...doc, ...updater };
      nextDoc._id = doc._id;
      nextDoc._rev = doc._rev;
      nextDoc.type = this.entity;
      nextDoc.createdAt = doc.createdAt;
      nextDoc.updatedAt = new Date().toISOString();
      await this.save(nextDoc);
      modifiedCount += 1;
    }

    return { modifiedCount };
  }
}

module.exports = {
  CloudantRepository,
  createTimestampedDoc,
  ensureDatabase,
  getCloudantApiKey,
  getCloudantBaseUrl,
  getDatabaseName,
  matchesSelector,
  sortDocs,
};
