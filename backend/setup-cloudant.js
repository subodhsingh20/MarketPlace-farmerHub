const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const { ensureDatabase, getDatabaseName, getDoc, putDoc, requestJson } = require("./data/cloudant");

const DESIGN_DOC_ID = "_design/farmdirect";

const mapByType = (type) =>
  `function (doc) {
  if (doc.type === "${type}") {
    emit(doc._id, null);
  }
}`;

const designDoc = {
  _id: DESIGN_DOC_ID,
  language: "javascript",
  views: {
    by_type: {
      map: `function (doc) {
  if (doc.type) {
    emit(doc.type, null);
  }
}`,
    },
    users: {
      map: mapByType("users"),
    },
    users_by_email: {
      map: `function (doc) {
  if (doc.type === "users" && doc.email) {
    emit(doc.email, null);
  }
}`,
    },
    farmers: {
      map: `function (doc) {
  if (doc.type === "users" && doc.role === "farmer") {
    emit(doc._id, null);
  }
}`,
    },
    products: {
      map: mapByType("products"),
    },
    products_by_farmer: {
      map: `function (doc) {
  if (doc.type === "products" && doc.farmerId) {
    emit(doc.farmerId, null);
  }
}`,
    },
    orders: {
      map: mapByType("orders"),
    },
    orders_by_user: {
      map: `function (doc) {
  if (doc.type === "orders" && doc.userId) {
    emit(doc.userId, null);
  }
}`,
    },
    orders_by_created_at: {
      map: `function (doc) {
  if (doc.type === "orders" && doc.createdAt) {
    emit(doc.createdAt, null);
  }
}`,
    },
    chat_messages: {
      map: mapByType("chatMessages"),
    },
    chat_messages_by_conversation: {
      map: `function (doc) {
  if (doc.type === "chatMessages" && doc.conversationId) {
    emit([doc.conversationId, doc.createdAt || ""], null);
  }
}`,
    },
  },
};

const seedStructureDoc = {
  _id: "farmdirect:database_structure",
  type: "system",
  name: "FarmDirect Cloudant structure",
  logicalCollections: ["users", "products", "orders", "chatMessages"],
  designDocument: DESIGN_DOC_ID,
  updatedAt: new Date().toISOString(),
};

const upsertDoc = async (dbName, doc) => {
  const current = await getDoc(dbName, doc._id);
  const payload = current ? { ...doc, _rev: current._rev } : doc;
  return putDoc(dbName, payload);
};

const main = async () => {
  const dbName = getDatabaseName("app");

  await ensureDatabase(dbName);
  const savedDesignDoc = await upsertDoc(dbName, designDoc);
  const savedStructureDoc = await upsertDoc(dbName, seedStructureDoc);

  await requestJson(
    `/${encodeURIComponent(dbName)}/_design/farmdirect/_view/by_type?limit=1`
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        database: dbName,
        designDocument: savedDesignDoc._id,
        structureDocument: savedStructureDoc._id,
        logicalCollections: seedStructureDoc.logicalCollections,
        message: "Cloudant app structure is ready.",
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error("Cloudant setup failed:", error.message);
  process.exit(1);
});
