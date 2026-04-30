import { useEffect, useMemo, useRef } from "react";

const formatMessageTime = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

function ChatWindow({
  currentUserId,
  viewerRole,
  participantName,
  participantRole,
  messages,
  draft,
  onDraftChange,
  onSend,
  isSending,
  error,
  orderId,
  typingLabel,
  selectedImage,
  onImageSelect,
  onClearImage,
  onDeleteConversation,
  isDeleting,
}) {
  const bottomRef = useRef(null);
  const isCustomerView = viewerRole === "customer";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typingLabel]);

  const headerCopy = useMemo(
    () =>
      participantRole === "farmer"
        ? "Ask about freshness, pickup windows, and order updates in real time."
        : "Reply to customer questions instantly with clear, real-time updates.",
    [participantRole]
  );
  const mineTextColor = "#ffffff";
  const otherTextColor = "#e8f2ee";
  const metaTextColor = "#d5e7df";

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div
        className={`border-b border-white/10 bg-gradient-to-r from-emerald-500/18 via-white/8 to-lime-500/18 px-4 sm:px-5 ${
          isCustomerView ? "py-2.5 lg:py-2" : "py-3 lg:py-2.5"
        }`}
      >
        <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-white sm:text-xl">
                {participantName}
              </h2>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100 shadow-sm">
                {participantRole || "chat"}
              </span>
              {orderId && (
                <span className="rounded-full border border-emerald-400/20 bg-white/6 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  Order linked
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-200/90" style={{ color: "#e4f0ea" }}>
              {headerCopy}
            </p>
          </div>

          <button
            type="button"
            onClick={onDeleteConversation}
            disabled={isDeleting}
            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-red-300/30 bg-red-500/18 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(244,63,94,0.12)] transition hover:-translate-y-0.5 hover:bg-red-500/26 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete chat"}
          </button>
        </div>
      </div>

      {error && (
        <div
          aria-live="polite"
          className="mx-4 mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 sm:mx-5"
        >
          {error}
        </div>
      )}

      <div
        className={`overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900/95 to-emerald-950/55 px-4 sm:px-5 ${
          isCustomerView
            ? "h-[17rem] py-3 sm:h-[18.5rem] lg:h-[22rem]"
            : "h-[22rem] py-4 sm:h-[24rem] lg:h-[28rem]"
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-sm rounded-3xl border border-dashed border-emerald-400/20 bg-white/6 px-6 py-8 shadow-sm backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                <svg className="h-7 w-7 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
                </svg>
              </div>
              <p className="font-semibold text-white">No messages yet</p>
              <p className="mt-1 text-sm text-slate-300">
                Start the conversation below and it will appear here instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((chat) => {
              const isMine = String(chat.senderId) === String(currentUserId);

              return (
                <div
                  key={chat.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[75%] ${
                      isMine
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                        : "border border-white/10 bg-slate-900/75 text-slate-100 backdrop-blur-md"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-4">
                      <span className={`text-xs font-semibold ${isMine ? "text-emerald-50" : "text-emerald-200"}`}>
                        <span style={{ color: isMine ? mineTextColor : "#c8f5dc" }}>
                          {isMine ? "You" : chat.senderName}
                        </span>
                      </span>
                      <span className={`text-[11px] ${isMine ? "text-emerald-100" : "text-slate-400"}`}>
                        <span style={{ color: isMine ? "#f2fffa" : metaTextColor }}>
                          {formatMessageTime(chat.timestamp)}
                        </span>
                      </span>
                    </div>

                    {(chat.message || chat.text) && (
                      <p
                        className={`whitespace-pre-wrap text-sm leading-6 sm:text-[0.95rem] ${isMine ? "text-white" : "text-slate-100"}`}
                        style={{ color: isMine ? mineTextColor : otherTextColor }}
                      >
                        {chat.message || chat.text}
                      </p>
                    )}

                    {chat.imageUrl && (
                      <a
                        href={chat.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block overflow-hidden rounded-2xl border border-white/10 bg-white/10"
                      >
                        <img
                          src={chat.imageUrl}
                          alt="Chat attachment"
                          className="max-h-56 w-full object-cover"
                        />
                      </a>
                    )}

                    <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${isMine ? "text-emerald-100" : "text-slate-400"}`}>
                      {isMine && <span style={{ color: "#f2fffa" }}>{chat.readStatus ? "Read" : "Sent"}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {typingLabel && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-emerald-400/20 bg-slate-900/70 px-3.5 py-2.5 text-sm text-emerald-100 shadow-sm">
                  {typingLabel}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={onSend}
        className={`border-t border-white/10 bg-slate-950/80 backdrop-blur-md ${isCustomerView ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4"}`}
      >
        {selectedImage && (
          <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-100">Image ready to send</p>
                <img
                  src={selectedImage}
                  alt="Selected attachment"
                  className="mt-2 max-h-32 rounded-xl object-cover"
                />
              </div>
              <button
                type="button"
                onClick={onClearImage}
                className="rounded-lg border border-emerald-400/20 bg-white/6 px-2.5 py-1.5 text-xs font-semibold text-emerald-100"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <input
              type="text"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Type your message"
              className="premium-input min-h-[2.85rem] w-full px-4 py-3 text-[0.95rem] text-slate-900 placeholder-slate-500"
            />
          </div>

          <div className="flex gap-2 sm:shrink-0">
            <label className="inline-flex min-h-[2.85rem] cursor-pointer items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-3 text-sm font-semibold text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-500/20">
              Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onImageSelect}
              />
            </label>
            <button
              type="submit"
              disabled={isSending || (!draft.trim() && !selectedImage)}
              className="premium-button min-h-[2.85rem] min-w-[7rem] bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:from-emerald-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;
