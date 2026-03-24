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

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-gray-100 bg-white shadow-xl">
      <div
        className={`border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-green-50 to-lime-50 px-4 sm:px-5 ${
          isCustomerView ? "py-2.5" : "py-3"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
                {participantName}
              </h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
                {participantRole || "chat"}
              </span>
              {orderId && (
                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Order linked
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-gray-600">{headerCopy}</p>
          </div>

          <button
            type="button"
            onClick={onDeleteConversation}
            disabled={isDeleting}
            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete chat"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-5">
          {error}
        </div>
      )}

      <div
        className={`overflow-y-auto bg-gradient-to-b from-white via-white to-emerald-50/40 px-4 sm:px-5 ${
          isCustomerView
            ? "h-[17rem] py-3 sm:h-[18.5rem] lg:h-[20rem]"
            : "h-[22rem] py-4 sm:h-[24rem] lg:h-[26rem]"
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-sm rounded-3xl border border-dashed border-emerald-200 bg-white/80 px-6 py-8 shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-800">No messages yet</p>
              <p className="mt-1 text-sm text-gray-500">
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
                    className={`max-w-[86%] rounded-2xl px-3.5 py-3 shadow-sm sm:max-w-[75%] ${
                      isMine
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                        : "border border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-4">
                      <span className={`text-xs font-semibold ${isMine ? "text-emerald-50" : "text-emerald-700"}`}>
                        {isMine ? "You" : chat.senderName}
                      </span>
                      <span className={`text-[11px] ${isMine ? "text-emerald-100" : "text-gray-400"}`}>
                        {formatMessageTime(chat.timestamp)}
                      </span>
                    </div>

                    {(chat.message || chat.text) && (
                      <p className="whitespace-pre-wrap text-sm leading-6 sm:text-[0.95rem]">
                        {chat.message || chat.text}
                      </p>
                    )}

                    {chat.imageUrl && (
                      <a
                        href={chat.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block overflow-hidden rounded-2xl border border-white/20 bg-white/10"
                      >
                        <img
                          src={chat.imageUrl}
                          alt="Chat attachment"
                          className="max-h-56 w-full object-cover"
                        />
                      </a>
                    )}

                    <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${isMine ? "text-emerald-100" : "text-gray-400"}`}>
                      {isMine && <span>{chat.readStatus ? "✓✓" : "✓"}</span>}
                      {isMine && <span>{chat.readStatus ? "Read" : "Sent"}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {typingLabel && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-emerald-100 bg-white px-3.5 py-2.5 text-sm text-emerald-700 shadow-sm">
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
        className={`border-t border-gray-100 bg-white ${isCustomerView ? "p-3.5 sm:p-4" : "p-4 sm:p-5"}`}
      >
        {selectedImage && (
          <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Image ready to send</p>
                <img
                  src={selectedImage}
                  alt="Selected attachment"
                  className="mt-2 max-h-32 rounded-xl object-cover"
                />
              </div>
              <button
                type="button"
                onClick={onClearImage}
                className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
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
              className="min-h-[3rem] w-full rounded-xl border border-gray-300 px-4 py-3 text-[0.95rem] text-gray-900 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 sm:shrink-0">
            <label className="inline-flex min-h-[3rem] cursor-pointer items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
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
              className="min-h-[3rem] min-w-[7.25rem] rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:from-emerald-700 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
