import React, { useEffect, useState, useRef } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import {
  logoutUser,
  createConversationWithSampleUsers,
} from "../lib/cometChatService";
import { cometChatConfig } from "../lib/cometChatConfig";

interface ChatProps {
  currentUser: CometChat.User;
  onLogout: () => void;
}

interface TypingUser {
  uid: string;
  name: string;
}

const Chat: React.FC<ChatProps> = ({ currentUser, onLogout }) => {
  const [conversations, setConversations] = useState<CometChat.Conversation[]>(
    []
  );
  const [activeCall, setActiveCall] = useState<CometChat.Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<CometChat.Call | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<CometChat.Conversation | null>(null);
  const [messages, setMessages] = useState<CometChat.BaseMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingConversations, setCreatingConversations] = useState(false);
  const [callToStart, setCallToStart] = useState<CometChat.Call | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);
  const listenerId = "chat_listener_" + Date.now();
  const callListenerId = "call_listener_" + Date.now();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat data
  useEffect(() => {
    initializeChat();
    setupMessageListener();
    setupCallListener();

    return () => {
      CometChat.removeMessageListener(listenerId);
      CometChat.removeCallListener(callListenerId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Update message listener when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      // Remove existing listener and add new one to ensure proper filtering
      CometChat.removeMessageListener(listenerId);
      CometChat.removeCallListener(callListenerId);
      setupMessageListener();
      setupCallListener();
    }
  }, [selectedConversation]);

  // Start call session after DOM is ready
  useEffect(() => {
    if (callToStart && isInCall && callContainerRef.current) {
      startCallSession(callToStart);
      setCallToStart(null); // Clear the pending call
    }
  }, [callToStart, isInCall]);

  const initializeChat = async () => {
    try {
      await fetchConversations();
      setLoading(false);
    } catch (error) {
      console.error("Error initializing chat:", error);
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const conversationRequest = new CometChat.ConversationsRequestBuilder()
        .setLimit(30)
        .build();

      const conversations = await conversationRequest.fetchNext();
      setConversations(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchMessages = async (conversation: CometChat.Conversation) => {
    try {
      const conversationWith = conversation.getConversationWith();
      const isGroup =
        conversation.getConversationType() === CometChat.RECEIVER_TYPE.GROUP;

      const messagesRequest = isGroup
        ? new CometChat.MessagesRequestBuilder()
            .setGUID((conversationWith as CometChat.Group).getGuid())
            .setLimit(90)
            .build()
        : new CometChat.MessagesRequestBuilder()
            .setUID((conversationWith as CometChat.User).getUid())
            .setLimit(90)
            .build();

      const messages = await messagesRequest.fetchPrevious();
      setMessages(messages); // Remove .reverse() - fetchPrevious() returns messages in correct order
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const setupMessageListener = () => {
    CometChat.addMessageListener(
      listenerId,
      new CometChat.MessageListener({
        onTextMessageReceived: (textMessage: CometChat.TextMessage) => {
          console.log("Text message received successfully", textMessage);

          // Add message to current conversation if it matches
          if (selectedConversation) {
            const conversationWith = selectedConversation.getConversationWith();
            const isGroup =
              selectedConversation.getConversationType() ===
              CometChat.RECEIVER_TYPE.GROUP;

            let shouldAddMessage = false;

            if (isGroup) {
              // For group messages, check if the message is for this group
              const groupGuid = (conversationWith as CometChat.Group).getGuid();
              shouldAddMessage = textMessage.getReceiverId() === groupGuid;
            } else {
              // For direct messages, check if message is from or to this user
              const userUid = (conversationWith as CometChat.User).getUid();
              const senderUid = textMessage.getSender().getUid();
              const receiverUid = textMessage.getReceiverId();

              shouldAddMessage =
                senderUid === userUid ||
                (receiverUid === userUid && senderUid === currentUser.getUid());
            }

            if (shouldAddMessage) {
              setMessages((prev) => [...prev, textMessage]);
            }
          }

          // Update conversations list
          fetchConversations();
        },
        onTypingStarted: (typingIndicator: CometChat.TypingIndicator) => {
          console.log("Typing started:", typingIndicator);
          const sender = typingIndicator.getSender();
          setTypingUsers((prev) => {
            const existing = prev.find((user) => user.uid === sender.getUid());
            if (!existing) {
              return [
                ...prev,
                { uid: sender.getUid(), name: sender.getName() },
              ];
            }
            return prev;
          });
        },
        onTypingEnded: (typingIndicator: CometChat.TypingIndicator) => {
          console.log("Typing ended:", typingIndicator);
          const sender = typingIndicator.getSender();
          setTypingUsers((prev) =>
            prev.filter((user) => user.uid !== sender.getUid())
          );
        },
      })
    );
  };

  const setupCallListener = () => {
    CometChat.addCallListener(
      callListenerId,
      new CometChat.CallListener({
        onIncomingCallReceived: (call: CometChat.Call) => {
          console.log("Incoming call:", call);
          setIncomingCall(call);
        },
        onOutgoingCallAccepted: (call: CometChat.Call) => {
          console.log("Outgoing call accepted:", call);
          setActiveCall(call);
          setIncomingCall(null);
          setIsInCall(true);
          setCallToStart(call); // Store call to start after render
          // startCallSession(call);
        },
        onOutgoingCallRejected: (call: CometChat.Call) => {
          console.log("Outgoing call rejected:", call);
          setActiveCall(null);
          setIncomingCall(null);
        },
        onIncomingCallCancelled: (call: CometChat.Call) => {
          console.log("Incoming call cancelled:", call);
          setIncomingCall(null);
          scrollToBottom();
          CometChatCalls.endSession();
        },
        onCallEndedMessageReceived: (call: CometChat.Call) => {
          console.log("Call ended:", call);
          setActiveCall(null);
          setIncomingCall(null);
          setIsInCall(false);
          CometChatCalls.endSession();
          scrollToBottom();
        },
      })
    );
  };

  const initiateVideoCall = async () => {
    if (!selectedConversation) return;

    try {
      const conversationWith = selectedConversation.getConversationWith();
      const isGroup =
        selectedConversation.getConversationType() ===
        CometChat.RECEIVER_TYPE.GROUP;

      const receiverId = isGroup
        ? (conversationWith as CometChat.Group).getGuid()
        : (conversationWith as CometChat.User).getUid();

      const receiverType = isGroup
        ? CometChat.RECEIVER_TYPE.GROUP
        : CometChat.RECEIVER_TYPE.USER;

      const call = new CometChat.Call(
        receiverId,
        CometChat.CALL_TYPE.VIDEO,
        receiverType
      );

      const outgoingCall = await CometChat.initiateCall(call);
      console.log("Call initiated successfully:", outgoingCall);
      setActiveCall(outgoingCall);
    } catch (error) {
      console.error("Call initiation failed:", error);
    }
  };

  const acceptCall = async (call: CometChat.Call) => {
    try {
      const acceptedCall = await CometChat.acceptCall(call.getSessionId());
      console.log("Call accepted successfully:", acceptedCall);
      setActiveCall(acceptedCall);
      setIncomingCall(null);
      setIsInCall(true);
      setCallToStart(acceptedCall); // Store call to start after render
      // startCallSession(acceptedCall);
    } catch (error) {
      console.error("Call acceptance failed:", error);
    }
  };

  const rejectCall = async (call: CometChat.Call) => {
    try {
      const rejectedCall = await CometChat.rejectCall(
        call.getSessionId(),
        CometChat.CALL_STATUS.REJECTED
      );
      console.log("Call rejected successfully:", rejectedCall);
      setIncomingCall(null);
    } catch (error) {
      console.error("Call rejection failed:", error);
    }
  };

  // const endCall = async () => {
  //   if (!activeCall) return;

  //   try {
  //     await CometChat.endCall(activeCall.getSessionId());
  //     setActiveCall(null);
  //     setIsInCall(false);
  //     scrollToBottom();
  //     CometChatCalls.endSession();
  //   } catch (error) {
  //     console.error("End call failed:", error);
  //   }
  // };

  const startCallSession = async (call: CometChat.Call) => {
    console.log("Starting call session for:", call);
    try {
      const loggedInUser = await CometChat.getLoggedinUser();
      console.log("Logged in user:", loggedInUser);
      if (loggedInUser) {
        const authToken = loggedInUser.getAuthToken();
        console.log("Auth token:", authToken);
        const tokenResponse = await CometChatCalls.generateToken(
          call.getSessionId(),
          authToken
        );
        console.log("Token generated successfully:", tokenResponse);

        const callSettings = new CometChatCalls.CallSettingsBuilder()
          .enableDefaultLayout(true)
          .setIsAudioOnlyCall(false)
          .showEndCallButton(true)
          .showPauseVideoButton(false)
          .showMuteAudioButton(false)
          .showScreenShareButton(false)
          .showModeButton(false)
          .setCallListener(
            new CometChatCalls.OngoingCallListener({
              onCallEnded: () => {
                console.log("Call ended from listener");
                setActiveCall(null);
                setIsInCall(false);
              },
              onSessionTimeout: () => {
                console.log("Call ended due to session timeout");
              },
              onError: (error) => {
                console.log("Call error:", error);
              },
            })
          )
          .build();

        console.log("Call settings:", callSettings);

        const htmlElement = callContainerRef.current;
        console.log("HTML element for call:", htmlElement);

        if (htmlElement) {
          await CometChatCalls.startSession(
            tokenResponse.token,
            callSettings,
            htmlElement
          );
          console.log("Call session started successfully");
          // setIsInCall(true);
        }
      }
    } catch (error) {
      console.error("Failed to start call session:", error);
      setActiveCall(null);
      setIsInCall(false);
    }
  };

  const selectConversation = async (conversation: CometChat.Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setTypingUsers([]);
    await fetchMessages(conversation);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      const conversationWith = selectedConversation.getConversationWith();
      const isGroup =
        selectedConversation.getConversationType() ===
        CometChat.RECEIVER_TYPE.GROUP;

      const receiverId = isGroup
        ? (conversationWith as CometChat.Group).getGuid()
        : (conversationWith as CometChat.User).getUid();

      const receiverType = isGroup
        ? CometChat.RECEIVER_TYPE.GROUP
        : CometChat.RECEIVER_TYPE.USER;

      const textMessage = new CometChat.TextMessage(
        receiverId,
        messageText,
        receiverType
      );

      // Stop typing indicator
      if (isTyping) {
        const typingIndicator = new CometChat.TypingIndicator(
          receiverId,
          receiverType
        );
        CometChat.endTyping(typingIndicator);
        setIsTyping(false);
      }

      const sentMessage = await CometChat.sendMessage(textMessage);
      console.log("Message sent successfully:", sentMessage);

      setMessages((prev) => [...prev, sentMessage]);
      setMessageText("");

      // Update conversations
      fetchConversations();
    } catch (error) {
      console.error("Message sending failed:", error);
    }
  };

  const handleTyping = (text: string) => {
    setMessageText(text);

    if (!selectedConversation) return;

    const conversationWith = selectedConversation.getConversationWith();
    const isGroup =
      selectedConversation.getConversationType() ===
      CometChat.RECEIVER_TYPE.GROUP;

    const receiverId = isGroup
      ? (conversationWith as CometChat.Group).getGuid()
      : (conversationWith as CometChat.User).getUid();

    const receiverType = isGroup
      ? CometChat.RECEIVER_TYPE.GROUP
      : CometChat.RECEIVER_TYPE.USER;

    const typingIndicator = new CometChat.TypingIndicator(
      receiverId,
      receiverType
    );

    if (text.trim() && !isTyping) {
      CometChat.startTyping(typingIndicator);
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        CometChat.endTyping(typingIndicator);
        setIsTyping(false);
      }
    }, 2000);

    // Stop typing if text is empty
    if (!text.trim() && isTyping) {
      CometChat.endTyping(typingIndicator);
      setIsTyping(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
  };

  const handleStartDemoChats = async () => {
    setCreatingConversations(true);
    try {
      await createConversationWithSampleUsers(currentUser.getUid());
      // Wait a moment for messages to be sent, then refresh
      setTimeout(() => {
        fetchConversations();
        setCreatingConversations(false);
      }, 2000);
    } catch (error) {
      console.error("Error creating demo conversations:", error);
      setCreatingConversations(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversations */}
      <div className="w-1/3 bg-white border-r border-gray-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">
                Welcome, {currentUser.getName()}
              </h2>
              <p className="text-sm opacity-90">Online</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Conversations</h3>
            <button
              onClick={handleStartDemoChats}
              disabled={creatingConversations}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {creatingConversations ? "Creating..." : "Start Demo Chats"}
            </button>
          </div>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <p className="text-sm mt-2">
                Click "Start Demo Chats" to create sample conversations
              </p>
              <p className="text-xs mt-2 text-gray-400">
                Available users: {cometChatConfig.SAMPLE_USERS.join(", ")}
              </p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const conversationWith = conversation.getConversationWith();
              const isGroup =
                conversation.getConversationType() ===
                CometChat.RECEIVER_TYPE.GROUP;
              const name = isGroup
                ? (conversationWith as CometChat.Group).getName()
                : (conversationWith as CometChat.User).getName();
              const lastMessage = conversation.getLastMessage();

              return (
                <div
                  key={conversation.getConversationId()}
                  onClick={() => selectConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.getConversationId() ===
                    conversation.getConversationId()
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{name}</h4>
                      </div>
                      {lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {lastMessage.getType() === CometChat.MESSAGE_TYPE.TEXT
                            ? (lastMessage as CometChat.TextMessage).getText()
                            : "Media message"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {isInCall ? (
          <div className="flex-1 flex flex-col">
            <div ref={callContainerRef} className="flex-1"></div>
          </div>
        ) : (
          <>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.getConversationType() ===
                        CometChat.RECEIVER_TYPE.GROUP
                          ? (
                              selectedConversation.getConversationWith() as CometChat.Group
                            ).getName()
                          : (
                              selectedConversation.getConversationWith() as CometChat.User
                            ).getName()}
                      </h3>
                      {typingUsers.length > 0 &&
                      selectedConversation.getConversationType() ===
                        CometChat.RECEIVER_TYPE.GROUP ? (
                        <p className="text-sm text-blue-600">
                          {typingUsers.map((user) => user.name).join(", ")}{" "}
                          {typingUsers.length === 1 ? "is" : "are"} typing...
                        </p>
                      ) : (
                        <p className="text-sm text-blue-600">
                          {typingUsers.find(
                            (user) =>
                              user.uid ===
                              (
                                selectedConversation.getConversationWith() as CometChat.User
                              ).getUid()
                          )
                            ? (
                                selectedConversation.getConversationWith() as CometChat.User
                              ).getName() + " is typing..."
                            : ""}
                        </p>
                      )}
                    </div>
                    {selectedConversation.getConversationType() ===
                      CometChat.RECEIVER_TYPE.GROUP && (
                      <button
                        onClick={initiateVideoCall}
                        disabled={!!activeCall || !!incomingCall}
                        className="bg-green-500 text-white mt-2 px-4 py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        📹 Start Video Call
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((message, index) => {
                    const isOwnMessage =
                      message.getSender().getUid() === currentUser.getUid();
                    const messageText =
                      message.getType() === CometChat.MESSAGE_TYPE.TEXT
                        ? (message as CometChat.TextMessage).getText()
                        : "Media message";

                    return (
                      <div
                        key={message.getId() || index}
                        className={`flex ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-900"
                          }`}
                        >
                          {!isOwnMessage && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.getSender().getName()}
                            </p>
                          )}
                          <p className="text-sm">{messageText}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwnMessage ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            {formatTime(message.getSentAt())}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim()}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
                {/* Incoming Call Modal */}
                {incomingCall && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                      <h3 className="text-lg font-semibold mb-4">
                        Incoming Video Call
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {incomingCall.getCallInitiator().getName()} is
                        calling...
                      </p>
                      <div className="flex space-x-4">
                        <button
                          onClick={() => acceptCall(incomingCall)}
                          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectCall(incomingCall)}
                          className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <h3 className="text-xl font-medium mb-2">
                    Welcome to CometChat
                  </h3>
                  <p>Select a conversation to start chatting</p>
                  <div className="mt-4 text-sm">
                    <p>Available sample users:</p>
                    <p className="font-mono text-xs mt-1">
                      {cometChatConfig.SAMPLE_USERS.join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
