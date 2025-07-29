//config

// import dotenv from "dotenv";

// dotenv.config({ path: ".env" });

// export let cometChatConfig = {
//   APP_ID: process.env.COMETCHAT_APP_ID,
//   REGION: process.env.COMETCHAT_REGION,
//   AUTH_KEY: process.env.COMETCHAT_AUTH_KEY,

//   // Sample users provided by CometChat for testing
//   SAMPLE_USERS: [
//     "cometchat-uid-1",
//     "cometchat-uid-2",
//     "cometchat-uid-3",
//     "cometchat-uid-4",
//     "cometchat-uid-5",
//   ],
//   SAMPLE_GROUPS: ["cometchat-guid-1"],
// };

// services

// import { CometChat } from "@cometchat/chat-sdk-javascript";

// export const initializeCometChat = async (): Promise<boolean> => {
//   try {
//     const appSettings = new CometChat.AppSettingsBuilder()
//       .subscribePresenceForAllUsers()
//       .setRegion(cometChatConfig.REGION)
//       .autoEstablishSocketConnection(true)
//       .build();

//     await CometChat.init(cometChatConfig.APP_ID, appSettings);
//     console.log("CometChat initialized successfully");
//     return true;
//   } catch (error) {
//     console.log("CometChat initialization failed", error);
//     return false;
//   }
// };

// export const loginUser = async (
//   UID: string
// ): Promise<CometChat.User | null> => {
//   try {
//     const user = await CometChat.login(UID, cometChatConfig.AUTH_KEY);
//     console.log("Login successful:", { user });
//     return user;
//   } catch (error) {
//     console.log("Login failed", error);
//     return null;
//   }
// };

// export const logoutUser = async (): Promise<void> => {
//   try {
//     await CometChat.logout();
//     console.log("Logout successful");
//   } catch (error) {
//     console.log("Logout failed", error);
//   }
// };

// export const sendMessageToUser = async (
//   receiverUID: string,
//   messageText: string
// ): Promise<CometChat.BaseMessage | null> => {
//   try {
//     const textMessage = new CometChat.TextMessage(
//       receiverUID,
//       messageText,
//       CometChat.RECEIVER_TYPE.USER
//     );

//     const message = await CometChat.sendMessage(textMessage);
//     console.log("Message sent successfully:", message);
//     return message;
//   } catch (error) {
//     console.log("Message sending failed:", error);
//     return null;
//   }
// };

// export const sendMessageToGroup = async (
//   receiverGUID: string,
//   messageText: string
// ): Promise<CometChat.BaseMessage | null> => {
//   try {
//     const textMessage = new CometChat.TextMessage(
//       receiverGUID,
//       messageText,
//       CometChat.RECEIVER_TYPE.GROUP
//     );

//     const message = await CometChat.sendMessage(textMessage);
//     console.log("Message sent successfully:", message);
//     return message;
//   } catch (error) {
//     console.log("Message sending failed:", error);
//     return null;
//   }
// };

// const fetchMessages = async (conversation: CometChat.Conversation) => {
//     try {
//       const conversationWith = conversation.getConversationWith();
//       const isGroup =
//         conversation.getConversationType() === CometChat.RECEIVER_TYPE.GROUP;

//       const messagesRequest = isGroup
//         ? new CometChat.MessagesRequestBuilder()
//             .setGUID((conversationWith as CometChat.Group).getGuid())
//             .setLimit(90)
//             .build()
//         : new CometChat.MessagesRequestBuilder()
//             .setUID((conversationWith as CometChat.User).getUid())
//             .setLimit(90)
//             .build();

//       const messages = await messagesRequest.fetchPrevious();
//       setMessages(messages); // Remove .reverse() - fetchPrevious() returns messages in correct order
//     } catch (error) {
//       console.error("Error fetching messages:", error);
//     }
//   };

//index

// import {
//   McpServer,
//   ResourceTemplate,
// } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import { z } from "zod";
// import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";
// import {
//   loginUser,
//   logoutUser,
//   sendMessageToGroup,
//   sendMessageToUser,
// } from "./services.js";
// // import {
// //   loginUser,
// //   logoutUser,
// //   sendMessageToGroup,
// //   sendMessageToUser,
// //   initializeCometChat,
// // } from "./services";

// const server = new McpServer({
//   name: "test-video",
//   version: "1.0.0",
//   capabilities: {
//     resources: {},
//     tools: {},
//     prompts: {},
//   },
// });

// server.tool(
//   "send-message-user",
//   "Send a message to a user for the given user ID",
//   {
//     userId: z.string().uuid(),
//     message: z.string().min(1).max(500),
//   },
//   {
//     title: "Send Message to User",
//     readOnlyHint: false,
//     destructiveHint: false,
//     idempotentHint: false,
//     openWorldHint: true,
//   },
//   async ({ userId, message }) => {
//     try {
//       await loginUser("cometchat-uid-1");
//       await sendMessageToUser(userId, message);
//       await logoutUser();

//       return {
//         content: [{ type: "text", text: `Message sent successfully` }],
//       };
//     } catch {
//       return {
//         content: [{ type: "text", text: "Failed to send a message" }],
//       };
//     }
//   }
// );

// server.tool(
//   "send-message-group",
//   "Send a message to the hiking group",
//   {
//     message: z.string().min(1).max(500),
//   },
//   {
//     title: "Send Message to Group",
//     readOnlyHint: false,
//     destructiveHint: false,
//     idempotentHint: false,
//     openWorldHint: true,
//   },
//   async ({ message }) => {
//     try {
//       await loginUser("cometchat-uid-1");
//       await sendMessageToGroup("cometchat-guid-1", message);
//       await logoutUser();

//       return {
//         content: [{ type: "text", text: `Message sent successfully` }],
//       };
//     } catch {
//       return {
//         content: [{ type: "text", text: "Failed to send a message" }],
//       };
//     }
//   }
// );

// async function main() {
//   // await initializeCometChat();
//   // const transport = new StdioServerTransport();
//   // await server.connect(transport);
//   // try {
//   //   await Promise.all([
//   //     initializeCometChat(),
//   //     loginUser("cometchat-uid-1"),
//   //     sendMessageToGroup("cometchat-guid-1", "Message from MCP server"),
//   //     logoutUser(),
//   //   ]);
//   // } catch (error) {
//   //   console.error("Error during initialization:", error);
//   // }
//   console.log("CometChat initialized successfully");
// }

// main();
