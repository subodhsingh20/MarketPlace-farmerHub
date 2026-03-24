import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  deleteChatConversation,
  getChatConversations,
  getChatHistory,
  markChatAsRead,
  sendChatMessage,
} from "../services/authService";

const appendUniqueMessage = (currentMessages, nextMessage) => {
  if (!nextMessage?.id) {
    return currentMessages;
  }

  if (currentMessages.some((message) => message.id === nextMessage.id)) {
    return currentMessages;
  }

  return [...currentMessages, nextMessage];
};

const markConversationMessagesRead = (currentMessages, currentUserId, otherUserId) =>
  currentMessages.map((message) => {
    const isOutgoing =
      String(message.senderId) === String(currentUserId) &&
      String(message.receiverId || message.recipientId) === String(otherUserId);

    return isOutgoing ? { ...message, readStatus: true } : message;
  });

const upsertConversation = (currentConversations, nextConversation) => [
  nextConversation,
  ...currentConversations.filter(
    (conversation) => String(conversation.userId) !== String(nextConversation.userId)
  ),
];

const formatConversationTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

const getConversationPreview = (conversation) => {
  if (conversation.lastMessage) {
    return conversation.lastMessage;
  }

  if (conversation.imageUrl) {
    return "Image";
  }

  return "No messages yet";
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });

const loadImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = source;
  });

const resizeChatImage = async (file) => {
  const source = await readFileAsDataUrl(file);

  if (file.size <= 250 * 1024) {
    return source;
  }

  const image = await loadImage(source);
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.72);
};

function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = user?.id || user?._id || "";
  const currentUserRole = user?.role || "";
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [typingState, setTypingState] = useState({ isTyping: false, name: "" });
  const typingTimeoutRef = useRef(null);
  const lastTypingStateRef = useRef(false);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const otherUserId = searchParams.get("user") || "";
  const fallbackOtherUserName = searchParams.get("name") || "User";
  const orderId = searchParams.get("order") || "";

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => String(conversation.userId) === String(otherUserId)
      ) || null,
    [conversations, otherUserId]
  );

  const otherUserName = activeConversation?.name || fallbackOtherUserName;
  const otherUserRole =
    activeConversation?.role || (currentUserRole === "farmer" ? "customer" : "farmer");
  const typingLabel =
    typingState.isTyping && typingState.name ? `${typingState.name} is typing...` : "";

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const loadConversations = async () => {
      try {
        setIsLoadingConversations(true);
        const response = await getChatConversations();
        setConversations(response.data.conversations || []);
      } catch (_requestError) {
        setConversations([]);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (otherUserId || !conversations.length) {
      return;
    }

    const [latestConversation] = conversations;

    navigate(
      `/chat?user=${latestConversation.userId}&name=${encodeURIComponent(
        latestConversation.name || "User"
      )}`,
      { replace: true }
    );
  }, [conversations, navigate, otherUserId]);

  useEffect(() => {
    if (!otherUserId || !currentUserId) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getChatHistory(currentUserId, otherUserId, orderId);
        setMessages(response.data.messages || []);
        setConversations((current) =>
          current.map((conversation) =>
            String(conversation.userId) === String(otherUserId)
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
        );
        await markChatAsRead({ otherUserId, orderId: orderId || undefined });
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load chat history.");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [currentUserId, orderId, otherUserId]);

  useEffect(() => {
    if (!socket || !currentUserId) {
      return undefined;
    }

    if (otherUserId) {
      socket.emit("join_chat", { otherUserId });
      socket.emit("mark_read", { otherUserId, orderId: orderId || undefined });
    }

    const handleSocketMessage = (payload) => {
      const nextMessage = payload?.chatMessage || payload;
      const senderId = String(nextMessage?.senderId || "");
      const receiverId = String(
        nextMessage?.receiverId || nextMessage?.recipientId || ""
      );

      if (!senderId || !receiverId) {
        return;
      }

      const touchesCurrentUser =
        senderId === String(currentUserId) || receiverId === String(currentUserId);

      if (!touchesCurrentUser) {
        return;
      }

      const peerId =
        senderId === String(currentUserId) ? receiverId : senderId;
      const isForCurrentChat = String(peerId) === String(otherUserId);

      if (isForCurrentChat) {
        setMessages((current) => appendUniqueMessage(current, nextMessage));
        setTypingState({ isTyping: false, name: "" });

        if (senderId !== String(currentUserId)) {
          socket.emit("mark_read", { otherUserId: peerId, orderId: orderId || undefined });
          setConversations((current) =>
            current.map((conversation) =>
              String(conversation.userId) === String(peerId)
                ? { ...conversation, unreadCount: 0 }
                : conversation
            )
          );
        }
      }

      setConversations((current) => {
        const existing = current.find(
          (conversation) => String(conversation.userId) === String(peerId)
        );

        return upsertConversation(current, {
          userId: peerId,
          name:
            senderId === String(currentUserId)
              ? nextMessage.receiverName || otherUserName
              : nextMessage.senderName || "User",
          role:
            senderId === String(currentUserId)
              ? nextMessage.receiverRole || otherUserRole
              : nextMessage.senderRole || "user",
          lastMessage: nextMessage.message || nextMessage.text || "",
          lastMessageType:
            nextMessage.imageUrl && !(nextMessage.message || nextMessage.text)
              ? "image"
              : "text",
          imageUrl: nextMessage.imageUrl || null,
          timestamp: nextMessage.timestamp || new Date().toISOString(),
          unreadCount:
            senderId !== String(currentUserId) && !isForCurrentChat
              ? (existing?.unreadCount || 0) + 1
              : 0,
          readStatus:
            senderId === String(currentUserId) ? false : nextMessage.readStatus,
        });
      });
    };

    const handleMessagesRead = ({ userId: readerId, otherUserId: peerId }) => {
      if (
        String(readerId) === String(currentUserId) ||
        String(peerId) !== String(currentUserId)
      ) {
        return;
      }

      setMessages((current) =>
        markConversationMessagesRead(current, currentUserId, readerId)
      );

      setConversations((current) =>
        current.map((conversation) =>
          String(conversation.userId) === String(readerId)
            ? { ...conversation, readStatus: true }
            : conversation
        )
      );
    };

    const handleTyping = (payload) => {
      if (
        String(payload?.senderId) !== String(otherUserId) ||
        String(payload?.receiverId) !== String(currentUserId)
      ) {
        return;
      }

      setTypingState({
        isTyping: Boolean(payload?.isTyping),
        name: payload?.senderName || otherUserName,
      });
    };

    const handleChatDeleted = (payload) => {
      const matchesThread =
        [String(payload?.userId), String(payload?.otherUserId)].includes(
          String(currentUserId)
        ) &&
        [String(payload?.userId), String(payload?.otherUserId)].includes(
          String(otherUserId)
        );

      setConversations((current) =>
        current.filter(
          (conversation) =>
            ![
              String(payload?.userId),
              String(payload?.otherUserId),
            ].includes(String(conversation.userId))
        )
      );

      if (matchesThread) {
        setMessages([]);
        setDraft("");
        setSelectedImage("");
        setTypingState({ isTyping: false, name: "" });
        navigate("/chat", { replace: true });
      }
    };

    socket.on("chatMessage", handleSocketMessage);
    socket.on("receive_message", handleSocketMessage);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("typing", handleTyping);
    socket.on("chatDeleted", handleChatDeleted);

    return () => {
      socket.off("chatMessage", handleSocketMessage);
      socket.off("receive_message", handleSocketMessage);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("typing", handleTyping);
      socket.off("chatDeleted", handleChatDeleted);
    };
  }, [
    currentUserId,
    navigate,
    orderId,
    otherUserId,
    otherUserName,
    otherUserRole,
    socket,
  ]);

  useEffect(() => {
    if (!socket || !otherUserId) {
      return undefined;
    }

    const hasContent = Boolean(draft.trim());

    if (hasContent !== lastTypingStateRef.current) {
      socket.emit("typing", {
        receiverId: otherUserId,
        isTyping: hasContent,
      });
      lastTypingStateRef.current = hasContent;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (hasContent) {
      typingTimeoutRef.current = window.setTimeout(() => {
        socket.emit("typing", {
          receiverId: otherUserId,
          isTyping: false,
        });
        lastTypingStateRef.current = false;
      }, 1200);
    }

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [draft, otherUserId, socket]);

  useEffect(
    () => () => {
      if (socket && otherUserId && lastTypingStateRef.current) {
        socket.emit("typing", {
          receiverId: otherUserId,
          isTyping: false,
        });
      }
    },
    [otherUserId, socket]
  );

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    resizeChatImage(file)
      .then((nextImage) => {
        setSelectedImage(nextImage);
      })
      .catch(() => {
        setError("Failed to process image.");
      });
    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!otherUserId || (!draft.trim() && !selectedImage)) {
      return;
    }

    try {
      setIsSending(true);
      setError("");
      const response = await sendChatMessage({
        senderId: currentUserId,
        receiverId: otherUserId,
        message: draft.trim(),
        imageUrl: selectedImage || undefined,
        orderId: orderId || undefined,
      });

      const nextMessage = response.data.chatMessage;

      setMessages((current) => appendUniqueMessage(current, nextMessage));
      setConversations((current) =>
        upsertConversation(current, {
          userId: otherUserId,
          name: otherUserName,
          role: otherUserRole,
          lastMessage: nextMessage?.message || "",
          lastMessageType: nextMessage?.imageUrl && !(nextMessage?.message || nextMessage?.text) ? "image" : "text",
          imageUrl: nextMessage?.imageUrl || null,
          timestamp: nextMessage?.timestamp || new Date().toISOString(),
          unreadCount: 0,
          readStatus: false,
        })
      );

      if (socket && lastTypingStateRef.current) {
        socket.emit("typing", {
          receiverId: otherUserId,
          isTyping: false,
        });
        lastTypingStateRef.current = false;
      }

      setDraft("");
      setSelectedImage("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!otherUserId || !window.confirm(`Delete the chat with ${otherUserName}?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      setError("");
      await deleteChatConversation(otherUserId);
      setMessages([]);
      setDraft("");
      setSelectedImage("");
      setConversations((current) =>
        current.filter(
          (conversation) => String(conversation.userId) !== String(otherUserId)
        )
      );
      navigate("/chat", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Failed to delete conversation."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="page">
      <div className="page__header">
        <div className="page__header-copy max-w-3xl gap-3">
          <span className="page__eyebrow">Chat</span>
          <h1 className="max-w-[14ch]">
            {otherUserId
              ? `Chat with ${otherUserName}`
              : currentUserRole === "farmer"
                ? "Farmer messages"
                : "Customer inbox"}
          </h1>
          <p>
            {currentUserRole === "farmer"
              ? "Manage farmer conversations in one place with fast replies and real-time updates."
              : "Manage customer conversations in one place with fast replies and real-time updates."}
          </p>
        </div>
      </div>

      {error && !otherUserId && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[1.35rem] border border-gray-100 bg-white shadow-xl">
          <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3.5">
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">Inbox</h2>
            <p className="text-sm text-gray-600">
              {isLoadingConversations
                ? "Loading conversations..."
                : `${conversations.length} active chat${conversations.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="max-h-[31rem] overflow-y-auto p-3">
            {isLoadingConversations ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Loading inbox...
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                <p className="font-semibold text-gray-700">No messages yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Your active chats will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {conversations.map((conversation) => {
                  const isActive = String(conversation.userId) === String(otherUserId);

                  return (
                    <Link
                      key={conversation.userId}
                      to={`/chat?user=${conversation.userId}&name=${encodeURIComponent(
                        conversation.name
                      )}`}
                      className={`block rounded-2xl border px-3.5 py-3 transition ${
                        isActive
                          ? "border-emerald-300 bg-emerald-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-gray-900">
                              {conversation.name}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex min-h-[1.3rem] min-w-[1.3rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] capitalize tracking-[0.12em] text-emerald-700">
                            {conversation.role || "user"}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                            {getConversationPreview(conversation)}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {formatConversationTime(conversation.timestamp)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div>
          {otherUserId ? (
            isLoading ? (
              <div className="chat-panel">
                <div className="empty-state">Loading conversation...</div>
              </div>
            ) : (
              <ChatWindow
                currentUserId={currentUserId}
                viewerRole={currentUserRole}
                participantName={otherUserName}
                participantRole={otherUserRole}
                messages={messages}
                draft={draft}
                onDraftChange={setDraft}
                onSend={handleSubmit}
                isSending={isSending}
                error={error}
                orderId={orderId}
                typingLabel={typingLabel}
                selectedImage={selectedImage}
                onImageSelect={handleImageSelect}
                onClearImage={() => setSelectedImage("")}
                onDeleteConversation={handleDeleteConversation}
                isDeleting={isDeleting}
              />
            )
          ) : (
            <div className="rounded-[1.35rem] border border-gray-100 bg-white px-6 py-12 text-center shadow-xl sm:px-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-7 w-7 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Choose a conversation</h2>
              <p className="mt-2 text-gray-600">
                Pick a thread from the inbox to view history and reply in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Chat;
