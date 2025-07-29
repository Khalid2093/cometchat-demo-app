import React, { useState } from "react";
import { loginUser } from "../lib/cometChatService";

const Login: React.FC<{ onLoginSuccess: (user: CometChat.User) => void }> = ({
  onLoginSuccess,
}) => {
  const [uid, setUid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const user = await loginUser(uid);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">CometChat Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label
            htmlFor="uid"
            className="block text-sm font-medium text-gray-700"
          >
            User ID
          </label>
          <input
            type="text"
            id="uid"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Use one of: cometchat-uid-1 to cometchat-uid-5
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
