import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import { cometChatConfig } from "./cometChatConfig";

export const initializeCometChat = async (): Promise<boolean> => {
  try {
    const appSettings = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(cometChatConfig.REGION)
      .autoEstablishSocketConnection(true)
      .build();

    await CometChat.init(cometChatConfig.APP_ID, appSettings);
    console.log("CometChat initialized successfully");
    return true;
  } catch (error) {
    console.log("CometChat initialization failed", error);
    return false;
  }
};

export const initializeCometChatCalls = async (): Promise<boolean> => {
  const appID = cometChatConfig.APP_ID;
  const region = cometChatConfig.REGION;

  try {
    const callAppSetting = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(appID)
      .setRegion(region)
      .build();

    await CometChatCalls.init(callAppSetting);
    console.log("CometChatCalls initialized successfully");
    return true;
  } catch (error) {
    console.log("CometChatCalls initialization failed with error:", error);
    return false;
  }
};

export const getCurrentUser = async (): Promise<CometChat.User | null> => {
  try {
    const user = await CometChat.getLoggedinUser();
    return user;
  } catch (error) {
    console.log("No user currently logged in", error);
    return null;
  }
};

export const loginUser = async (
  UID: string
): Promise<CometChat.User | null> => {
  try {
    const user = await CometChat.login(UID, cometChatConfig.AUTH_KEY);
    console.log("Login successful:", { user });
    return user;
  } catch (error) {
    console.log("Login failed", error);
    return null;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await CometChat.logout();
    console.log("Logout successful");
  } catch (error) {
    console.log("Logout failed", error);
  }
};

export const sendMessageToUser = async (
  receiverUID: string,
  messageText: string
): Promise<CometChat.BaseMessage | null> => {
  try {
    const textMessage: CometChat.TextMessage = new CometChat.TextMessage(
      receiverUID,
      messageText,
      CometChat.RECEIVER_TYPE.USER
    );

    const message = await CometChat.sendMessage(textMessage);
    console.log("Message sent successfully:", message);
    return message;
  } catch (error) {
    console.log("Message sending failed:", error);
    return null;
  }
};

export const sendMessageToGroup = async (
  receiverGUID: string,
  messageText: string
): Promise<CometChat.BaseMessage | null> => {
  try {
    const textMessage = new CometChat.TextMessage(
      receiverGUID,
      messageText,
      CometChat.RECEIVER_TYPE.GROUP
    );

    const message = await CometChat.sendMessage(textMessage);
    console.log("Message sent successfully:", message);
    return message;
  } catch (error) {
    console.log("Message sending failed:", error);
    return null;
  }
};

export const createConversationWithSampleUsers = async (
  currentUserUID: string
): Promise<void> => {
  // Send a welcome message to other sample users to create conversations
  const otherUsers = cometChatConfig.SAMPLE_USERS.filter(
    (uid) => uid !== currentUserUID
  );

  for (const userUID of otherUsers.slice(0, 2)) {
    // Create conversations with first 2 other users
    try {
      await sendMessageToUser(
        userUID,
        `Hi! This is ${currentUserUID}. Let's start chatting!`
      );
    } catch (error) {
      console.log(`Failed to create conversation with ${userUID}:`, error);
    }
  }

  // Also try to send message to sample group if it exists
  if (cometChatConfig.SAMPLE_GROUPS.length > 0) {
    try {
      const groupGUID = cometChatConfig.SAMPLE_GROUPS[0].trim();
      await sendMessageToGroup(
        groupGUID,
        `Hi everyone! This is ${currentUserUID} joining the group.`
      );
    } catch (error) {
      console.log("Failed to send message to sample group:", error);
    }
  }
};
