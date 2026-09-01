import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type UserDoc = {
  _id: any;
  name?: string;
  image?: string;
  email?: string;
  status?: "online" | "offline" | "away";
  statusText?: string;
  lastSeen?: number;
};

// ─── User Status ──────────────────────────────────────
export const updateStatus = mutation({
  args: {
    status: v.union(v.literal("online"), v.literal("offline"), v.literal("away")),
    statusText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(userId, {
      status: args.status,
      statusText: args.statusText,
      lastSeen: Date.now(),
    });
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const doc = await ctx.db.get(userId) as UserDoc | null;
    if (!doc) return null;
    return {
      _id: doc._id,
      name: doc.name,
      image: doc.image,
      email: doc.email,
      status: doc.status,
      statusText: doc.statusText,
    };
  },
});

export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const doc = await ctx.db.get(userId as any) as UserDoc | null;
    if (!doc) return null;
    return {
      _id: doc._id,
      name: doc.name,
      image: doc.image,
      email: doc.email,
      status: doc.status,
      statusText: doc.statusText,
    };
  },
});

// ─── Conversations ────────────────────────────────────
export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const conversations = [];
    for (const membership of memberships) {
      const conv = await ctx.db.get(membership.conversationId);
      if (!conv) continue;

      const allMembers = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", membership.conversationId)
        )
        .collect();

      const memberDetails = [];
      for (const m of allMembers) {
        const user = await ctx.db.get(m.userId as any) as UserDoc | null;
        if (user) {
          memberDetails.push({
            userId: m.userId,
            name: user.name ?? "Unknown",
            image: user.image,
            status: user.status ?? "offline",
          });
        }
      }

      const lastMsg = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", membership.conversationId)
        )
        .order("desc")
        .first();

      conversations.push({
        ...conv,
        members: memberDetails,
        lastMessage: lastMsg
          ? { content: lastMsg.content, senderName: lastMsg.senderName, createdAt: lastMsg.createdAt }
          : null,
        unreadCount: 0,
      });
    }

    return conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const createDM = mutation({
  args: { otherUserId: v.string() },
  handler: async (ctx, { otherUserId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMemberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const m of myMemberships) {
      const conv = await ctx.db.get(m.conversationId);
      if (conv?.type !== "dm") continue;
      const otherMembers = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", m.conversationId)
        )
        .collect();
      if (otherMembers.length === 2 && otherMembers.some((om) => om.userId === otherUserId)) {
        return m.conversationId;
      }
    }

    const convId = await ctx.db.insert("conversations", {
      type: "dm",
      createdBy: userId,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId: convId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
    });
    await ctx.db.insert("conversationMembers", {
      conversationId: convId,
      userId: otherUserId,
      role: "member",
      joinedAt: Date.now(),
    });

    return convId;
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.string()),
  },
  handler: async (ctx, { name, memberIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const convId = await ctx.db.insert("conversations", {
      type: "group",
      name,
      createdBy: userId,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    const allIds = [userId, ...memberIds.filter((id) => id !== userId)];
    for (const id of allIds) {
      await ctx.db.insert("conversationMembers", {
        conversationId: convId,
        userId: id,
        role: id === userId ? "admin" : "member",
        joinedAt: Date.now(),
      });
    }

    return convId;
  },
});

// ─── Messages ─────────────────────────────────────────
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { conversationId, limit }) => {
    const results = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("desc")
      .take(limit ?? 50);

    return results.reverse();
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("system")),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId) as UserDoc | null;
    const senderName = user?.name ?? user?.email?.split("@")[0] ?? "Anonymous";

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      senderName,
      content: args.content,
      type: args.type,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });
  },
});

// ─── Omegle Matching ──────────────────────────────────
export const joinOmegleQueue = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("omegleQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    const user = await ctx.db.get(userId) as UserDoc | null;

    await ctx.db.insert("omegleQueue", {
      userId,
      userName: user?.name ?? user?.email?.split("@")[0] ?? "Stranger",
      userImage: user?.image,
      queuedAt: Date.now(),
    });

    return true;
  },
});

export const leaveOmegleQueue = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("omegleQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const matchOmegle = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const allQueued = await ctx.db.query("omegleQueue").collect();
    const waiting = allQueued.filter((q) => q.userId !== userId);

    if (waiting.length === 0) return null;

    const match = waiting[0];

    const myEntry = await ctx.db
      .query("omegleQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (myEntry) await ctx.db.delete(myEntry._id);
    await ctx.db.delete(match._id);

    const convId = await ctx.db.insert("conversations", {
      type: "omegle",
      createdBy: userId,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId: convId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
    await ctx.db.insert("conversationMembers", {
      conversationId: convId,
      userId: match.userId,
      role: "member",
      joinedAt: Date.now(),
    });

    await ctx.db.insert("messages", {
      conversationId: convId,
      senderId: "system",
      senderName: "System",
      content: `You're now chatting with ${match.userName}`,
      type: "system",
      createdAt: Date.now(),
    });

    return { conversationId: convId, matchedUser: match.userName };
  },
});

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const allUsers = await ctx.db.query("users").collect();
    return allUsers
      .filter((u) => {
        const doc = u as UserDoc;
        const name = (doc.name ?? "").toLowerCase();
        const email = (doc.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 20)
      .map((u) => {
        const doc = u as UserDoc;
        return {
          userId: doc._id,
          name: doc.name ?? "Unknown",
          image: doc.image,
          status: doc.status ?? "offline",
          statusText: doc.statusText,
        };
      });
  },
});
