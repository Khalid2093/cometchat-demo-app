import React, { useEffect, useState } from "react";
import {
  initializeCometChat,
  getCurrentUser,
  initializeCometChatCalls,
} from "./lib/cometChatService";
import Chat from "./components/Chat";
import Login from "./components/Login";

const App: React.FC = () => {
  const [isChatInitialized, setIsChatInitialized] = useState(false);
  const [isCallsInitialized, setIsCallsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<CometChat.User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const init = async () => {
      const chatInitialized = await initializeCometChat();
      setIsChatInitialized(chatInitialized);

      const callsInitialized = await initializeCometChatCalls();
      setIsCallsInitialized(callsInitialized);

      if (chatInitialized && callsInitialized) {
        // Check if user is already logged in
        const existingUser = await getCurrentUser();
        if (existingUser) {
          setCurrentUser(existingUser);
          console.log("Found existing session for:", existingUser.getName());
        }
      }

      setIsCheckingSession(false);
    };

    init();
  }, []);

  const handleLoginSuccess = (user: CometChat.User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (isCheckingSession || !isChatInitialized || !isCallsInitialized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">
          {isCheckingSession
            ? "Checking session..."
            : "Initializing CometChat..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {currentUser ? (
        <Chat currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
