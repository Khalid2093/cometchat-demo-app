// This file stores our CometChat configuration values
export const cometChatConfig = {
  APP_ID: import.meta.env.VITE_COMETCHAT_APP_ID,
  REGION: import.meta.env.VITE_COMETCHAT_REGION,
  AUTH_KEY: import.meta.env.VITE_COMETCHAT_AUTH_KEY,

  // Sample users provided by CometChat for testing
  SAMPLE_USERS: [
    "cometchat-uid-1",
    "cometchat-uid-2",
    "cometchat-uid-3",
    "cometchat-uid-4",
    "cometchat-uid-5",
  ],
  SAMPLE_GROUPS: ["cometchat-guid-1"],
};
