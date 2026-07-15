const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const { CloudantRepository, getDatabaseName } = require("./data/cloudant");

const main = async () => {
  const repo = new CloudantRepository("connectionTests", {
    dbName: getDatabaseName("connection_tests"),
  });

  const marker = `cloudant-test-${Date.now()}`;
  const docId = `connection_test_${Date.now()}`;

  await repo.ensureReady();

  const saved = await repo.create({
    _id: docId,
    marker,
    purpose: "Verify FarmDirect Cloudant read/write access",
  });

  const loaded = await repo.findById(saved._id);

  if (!loaded || loaded.marker !== marker) {
    throw new Error("Cloudant test document could not be read back correctly.");
  }

  await repo.deleteById(saved._id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        database: repo.dbName,
        documentId: saved._id,
        message: "Cloudant read/write/delete test passed.",
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error("Cloudant connection test failed:", error.message);
  process.exit(1);
});
