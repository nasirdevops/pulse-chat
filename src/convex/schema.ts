import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      status: v.optional(v.union(v.literal("online"), v.literal("offline"), v.literal("away"))),
      statusText: v.optional(v.string()),
      lastSeen: v.optional(v.number()),
    }).index("email", ["email"]),

    conversations: defineTable({
      type: v.union(v.literal("dm"), v.literal("group"), v.literal("omegle")),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      createdBy: v.string(),
      createdAt: v.number(),
      lastMessageAt: v.number(),
    }).index("by_type", ["type"])
      .index("by_last_message", ["lastMessageAt"]),

    conversationMembers: defineTable({
      conversationId: v.id("conversations"),
      userId: v.string(),
      role: v.union(v.literal("admin"), v.literal("member")),
      joinedAt: v.number(),
    }).index("by_conversation", ["conversationId"])
      .index("by_user", ["userId"])
      .index("by_conv_user", ["conversationId", "userId"]),

    messages: defineTable({
      conversationId: v.id("conversations"),
      senderId: v.string(),
      senderName: v.string(),
      content: v.string(),
      type: v.union(v.literal("text"), v.literal("image"), v.literal("system")),
      imageUrl: v.optional(v.string()),
      replyTo: v.optional(v.id("messages")),
      createdAt: v.number(),
    }).index("by_conversation", ["conversationId", "createdAt"])
      .index("by_sender", ["senderId"]),

    omegleQueue: defineTable({
      userId: v.string(),
      userName: v.string(),
      userImage: v.optional(v.string()),
      queuedAt: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
