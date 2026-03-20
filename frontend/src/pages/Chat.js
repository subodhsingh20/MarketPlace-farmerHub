import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const otherUserId = searchParams.get("user") || "";
  const otherUserName = searchParams.get("name") || "User";

  useEffect(() => {
    if (!socket || !otherUserId) {
      return undefined;
    }

    socket.emit("join_chat", { otherUserId });

    const handleReceiveMessage = (message) => {
      const isForCurrentChat =
        (message.senderId === otherUserId && message.recipientId === user?.id) ||
        (message.senderId === user?.id && message.recipientId === otherUserId);

      if (isForCurrentChat) {
        setMessages((current) => [...current, message]);
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [otherUserId, socket, user?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!socket || !otherUserId || !draft.trim()) {
      return;
    }

    socket.emit("send_message", {
      recipientId: otherUserId,
      text: draft,
    });
    setDraft("");
  };

  if (!otherUserId) {
    return (
      <section className="page">
        <span className="page__eyebrow">Chat</span>
        <h1>Start a conversation from a product card.</h1>
        <p>Open chat from the marketplace to message a farmer in real time.</p>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page__header">
        <div className="page__header-copy">
          <span className="page__eyebrow">Live conversation</span>
          <h1>Chat with {otherUserName}</h1>
          <p>Coordinate availability, pickup timing, and delivery details in real time.</p>
        </div>
      </div>

      <div className="chat-panel">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">No messages yet. Start the conversation below.</div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.senderId === user?.id
                    ? "chat-bubble chat-bubble--mine"
                    : "chat-bubble"
                }
              >
                <strong>{message.senderName}</strong>
                <span>{message.text}</span>
              </div>
            ))
          )}
        </div>
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type your message"
          />
          <button type="submit" className="button-primary">
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

export default Chat;
