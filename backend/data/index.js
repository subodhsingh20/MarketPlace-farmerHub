const { CloudantRepository, ensureDatabase, getDatabaseName } = require("./cloudant");

const users = new CloudantRepository("users");
const products = new CloudantRepository("products");
const orders = new CloudantRepository("orders");
const chatMessages = new CloudantRepository("chatMessages", {
  dbName: getDatabaseName("chat_messages"),
});

const initializeCloudant = async () => {
  const databases = [users.dbName, products.dbName, orders.dbName, chatMessages.dbName];

  for (const dbName of databases) {
    await ensureDatabase(dbName);
  }
};

module.exports = {
  chatMessages,
  initializeCloudant,
  orders,
  products,
  users,
};
