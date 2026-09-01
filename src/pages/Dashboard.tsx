import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageCircle,
  Radio,
  Users,
  Search,
  Send,
  Image,
  X,
  LogOut,
  Plus,
  Loader2,
  ArrowLeft,
  Smile,
  Hash,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type View = "chats" | "omegle" | "people";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("chats");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOmegleSearching, setIsOmegleSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const me = useQuery(api.chat.getMe);
  const conversations = useQuery(api.chat.getMyConversations);
  const messages = useQuery(
    api.chat.getMessages,
    selectedConvId ? { conversationId: selectedConvId as any } : "skip"
  );
  const searchResults = useQuery(
    api.chat.searchUsers,
    searchQuery ? { query: searchQuery } : "skip"
  );

  const sendMessage = useMutation(api.chat.sendMessage);
  const updateStatus = useMutation(api.chat.updateStatus);
  const createDM = useMutation(api.chat.createDM);
  const createGroup = useMutation(api.chat.createGroup);
  const joinQueue = useMutation(api.chat.joinOmegleQueue);
  const matchOmegle = useMutation(api.chat.matchOmegle);
  const leaveQueue = useMutation(api.chat.leaveOmegleQueue);

  // Set user online
  useEffect(() => {
    if (me) {
      updateStatus({ status: "online" });
      const interval = setInterval(() => updateStatus({ status: "online" }), 30000);
      return () => {
        updateStatus({ status: "offline" });
        clearInterval(interval);
      };
    }
  }, [me, updateStatus]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || !selectedConvId) return;
    const content = messageInput.trim();
    setMessageInput("");
    await sendMessage({
      conversationId: selectedConvId as any,
      content,
      type: "text",
    });
  }, [messageInput, selectedConvId, sendMessage]);

  const handleOmegleStart = useCallback(async () => {
    setIsOmegleSearching(true);
    await joinQueue();
    // Wait a bit then try to match
    setTimeout(async () => {
      const result = await matchOmegle();
      if (result) {
        setSelectedConvId(result.conversationId);
        setView("chats");
        setIsOmegleSearching(false);
      } else {
        setIsOmegleSearching(false);
        alert("No one else is in the queue right now. Try again later!");
        await leaveQueue();
      }
    }, 2000);
  }, [joinQueue, matchOmegle, leaveQueue]);

  const handleStartDM = useCallback(
    async (userId: string) => {
      const convId = await createDM({ otherUserId: userId });
      setSelectedConvId(convId);
      setShowNewChat(false);
      setView("chats");
    },
    [createDM]
  );

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const convId = await createGroup({
      name: groupName,
      memberIds: selectedMembers,
    });
    setSelectedConvId(convId);
    setShowGroupCreate(false);
    setGroupName("");
    setSelectedMembers([]);
    setView("chats");
  }, [groupName, selectedMembers, createGroup]);

  const selectedConv = conversations?.find(
    (c) => c._id === selectedConvId
  );

  const handleSignOut = async () => {
    await updateStatus({ status: "offline" });
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border/60 bg-sidebar transition-all duration-300 z-20",
          selectedConvId ? "hidden lg:flex w-80" : "flex w-full lg:w-80"
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Radio className="h-4 w-4 text-primary" />
              </div>
              <span className="text-lg font-bold">
                Pulse<span className="text-primary">.</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewChat(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                title="New chat"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={handleSignOut}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
            {([
              { id: "chats" as View, icon: MessageCircle, label: "Chats" },
              { id: "omegle" as View, icon: Radio, label: "Pulse Match" },
              { id: "people" as View, icon: Users, label: "People" },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors",
                  view === tab.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Chats list */}
          {view === "chats" && (
            <div className="p-2 space-y-0.5">
              {conversations?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a chat or try Pulse Match</p>
                </div>
              )}
              {conversations?.map((conv) => {
                const other = conv.members?.find(
                  (m) => m.userId !== me?._id
                );
                const name =
                  conv.type === "group"
                    ? conv.name
                    : other?.name ?? "Unknown";
                const isOnline = other?.status === "online";

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConvId(conv._id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl p-3 transition-colors text-left",
                      selectedConvId === conv._id
                        ? "bg-primary/10"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative",
                        conv.type === "group"
                          ? "bg-chart-2/20 text-chart-2"
                          : "bg-primary/20 text-primary"
                      )}
                    >
                      {conv.type === "group" ? (
                        <Users className="h-4 w-4" />
                      ) : other?.image ? (
                        <img
                          src={other.image}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        (name ?? "?").charAt(0).toUpperCase()
                      )}
                      {conv.type === "dm" && (
                        <div
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar",
                            isOnline ? "bg-green-500" : "bg-gray-500"
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage.senderName}:{" "}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Omegle */}
          {view === "omegle" && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-8">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Radio className="h-10 w-10 text-primary" />
                </div>
                {isOmegleSearching && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
                    <div
                      className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"
                      style={{ animationDelay: "0.5s" }}
                    />
                  </>
                )}
              </div>

              <h3 className="text-xl font-bold mb-2">Pulse Match</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-xs">
                {isOmegleSearching
                  ? "Looking for someone to chat with..."
                  : "Click below to connect with a random stranger instantly."}
              </p>

              {isOmegleSearching ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <button
                    onClick={async () => {
                      setIsOmegleSearching(false);
                      await leaveQueue();
                    }}
                    className="px-6 py-2.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleOmegleStart}
                  className="px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 animate-pulse-glow"
                >
                  Start Matching
                </button>
              )}
            </div>
          )}

          {/* People / Search */}
          {view === "people" && (
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {searchResults && searchResults.length > 0 && (
                <div className="space-y-0.5">
                  {searchResults.map((u) => (
                    <button
                      key={u.userId}
                      onClick={() => handleStartDM(u.userId)}
                      className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0 relative">
                        {u.image ? (
                          <img
                            src={u.image}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          u.name.charAt(0).toUpperCase()
                        )}
                        <div
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                            u.status === "online"
                              ? "bg-green-500"
                              : "bg-gray-500"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {u.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && searchResults?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No users found</p>
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Search for people to start chatting</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="p-3 border-t border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {(me?.name ?? me?.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {me?.name ?? me?.email?.split("@")[0] ?? "Guest"}
              </p>
              <p className="text-[10px] text-green-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                Online
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <main
        className={cn(
          "flex-1 flex flex-col bg-background",
          !selectedConvId && "hidden lg:flex"
        )}
      >
        {selectedConvId && selectedConv ? (
          <>
            {/* Chat header */}
            <div className="h-16 flex items-center gap-3 px-4 border-b border-border/40 bg-background/80 backdrop-blur-xl">
              <button
                onClick={() => setSelectedConvId(null)}
                className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {selectedConv.type === "group"
                    ? selectedConv.name
                    : selectedConv.members?.find(
                        (m) => m.userId !== me?._id
                      )?.name ?? "Unknown"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedConv.members
                    ?.map((m) => m.name)
                    .join(", ")}
                </p>
              </div>
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  selectedConv.members?.some(
                    (m) => m.userId !== me?._id && m.status === "online"
                  )
                    ? "bg-green-500"
                    : "bg-gray-500"
                )}
              />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages?.map((msg) => {
                const isMine = msg.senderId === me?._id;
                const isSystem = msg.type === "system";

                if (isSystem) {
                  return (
                    <div
                      key={msg._id}
                      className="flex justify-center"
                    >
                      <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] px-4 py-2.5",
                        isMine ? "bubble-sent" : "bubble-received"
                      )}
                    >
                      {!isMine && selectedConv.type === "group" && (
                        <p className="text-[10px] font-semibold text-primary mb-1">
                          {msg.senderName}
                        </p>
                      )}
                      {msg.type === "image" && msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Shared image"
                          className="rounded-lg mb-2 max-w-full"
                        />
                      )}
                      <p className="text-sm break-words">{msg.content}</p>
                      <p
                        className={cn(
                          "text-[9px] mt-1 opacity-60",
                          isMine
                            ? "text-right"
                            : "text-muted-foreground"
                        )}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/40 bg-background/80 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <button className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  <Image className="h-4 w-4" />
                </button>
                <button className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  <Smile className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 h-10 px-4 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim()}
                  className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-full transition-all",
                    messageInput.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="relative mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Radio className="h-8 w-8 text-primary" />
              </div>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border border-primary/10"
                  style={{
                    animation: `pulse-ring 3s ease-out ${i * 1}s infinite`,
                  }}
                />
              ))}
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Pulse</h2>
            <p className="text-muted-foreground max-w-sm mb-6">
              Select a conversation from the sidebar or start a new one to begin
              chatting.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewChat(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </button>
              <button
                onClick={() => setView("omegle")}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-6 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-all"
              >
                <Radio className="h-4 w-4" />
                Pulse Match
              </button>
            </div>
          </div>
        )}
      </main>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => {
              setShowNewChat(false);
              setShowGroupCreate(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-semibold">
                  {showGroupCreate ? "Create Group" : "New Conversation"}
                </h3>
                <button
                  onClick={() => {
                    setShowNewChat(false);
                    setShowGroupCreate(false);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                {!showGroupCreate ? (
                  <>
                    <button
                      onClick={() => setShowGroupCreate(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left mb-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-chart-2/20 flex items-center justify-center">
                        <Users className="h-4 w-4 text-chart-2" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Create Group</p>
                        <p className="text-xs text-muted-foreground">
                          Chat with multiple people
                        </p>
                      </div>
                    </button>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Or message someone
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {searchResults?.map((u) => (
                        <button
                          key={u.userId}
                          onClick={() => handleStartDM(u.userId)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">{u.name}</span>
                        </button>
                      ))}
                      {!searchResults && (
                        <input
                          type="text"
                          placeholder="Search for people..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          autoFocus
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Group name..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full h-10 px-4 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Search people to add..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {searchResults?.map((u) => (
                        <button
                          key={u.userId}
                          onClick={() => {
                            setSelectedMembers((prev) =>
                              prev.includes(u.userId)
                                ? prev.filter((id) => id !== u.userId)
                                : [...prev, u.userId]
                            );
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                            selectedMembers.includes(u.userId)
                              ? "bg-primary/10"
                              : "hover:bg-white/5"
                          )}
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm flex-1">{u.name}</span>
                          {selectedMembers.includes(u.userId) && (
                            <Hash className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleCreateGroup}
                      disabled={!groupName.trim() || selectedMembers.length === 0}
                      className={cn(
                        "w-full h-10 rounded-xl text-sm font-semibold transition-all",
                        groupName.trim() && selectedMembers.length > 0
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      Create Group ({selectedMembers.length} members)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
