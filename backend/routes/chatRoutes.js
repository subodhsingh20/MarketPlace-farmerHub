const express = require("express");
const {
  deleteChatConversation,
  getChatConversations,
  getChatHistory,
  markChatAsRead,
  sendChatMessage,
} = require("../controllers/chatController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/send", protect, authorizeRoles("customer", "farmer"), sendChatMessage);
router.patch("/read", protect, authorizeRoles("customer", "farmer"), markChatAsRead);
router.get("/history", protect, authorizeRoles("customer", "farmer"), getChatHistory);
router.get(
  "/conversations",
  protect,
  authorizeRoles("customer", "farmer"),
  getChatConversations
);
router.delete(
  "/conversation/:otherUserId",
  protect,
  authorizeRoles("customer", "farmer"),
  deleteChatConversation
);

module.exports = router;
