function ChatThread({
  currentUserId,
  messages,
  draft,
  onDraftChange,
  onSubmit,
  isSending,
  otherUserName,
  orderId,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-5 bg-gradient-to-r from-emerald-50 to-green-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Chat with {otherUserName}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Send in-app messages for product questions, pickup planning, and order updates.
            </p>
          </div>
          {orderId && (
            <span className="px-3 py-1 rounded-full bg-white text-emerald-700 text-xs font-semibold border border-emerald-200">
              Order linked
            </span>
          )}
        </div>
      </div>

      <div className="h-[420px] overflow-y-auto px-6 py-5 bg-gradient-to-b from-white to-emerald-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-sm">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold">No messages yet</p>
              <p className="text-sm text-gray-500 mt-1">Start the conversation below.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isMine = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      isMine
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={`text-xs font-semibold ${isMine ? "text-emerald-50" : "text-emerald-700"}`}>
                        {message.senderName}
                      </span>
                      <span className={`text-[11px] ${isMine ? "text-emerald-100" : "text-gray-400"}`}>
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-gray-100 p-4 bg-white">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Type your message"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatThread;
