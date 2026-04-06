import { useState } from "react";
import { Layout } from "./components/Layout";
import { LoginPage } from "./components/LoginPage";
import { AppPreferencesProvider } from "./context/AppPreferencesContext";
import { apiUrl } from "./lib/api";
import "./styles/globals.css";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState("");

  const handleLogin = async ({ email, password }) => {
    const response = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || "Invalid email or password");
    }

    setCurrentUser(data.user ?? null);
    setAccessToken(data.access_token ?? "");
    setIsAuthenticated(true);
  };

  return (
    <AppPreferencesProvider>
      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Layout
          onCurrentUserChange={setCurrentUser}
          onSignOut={() => {
            setCurrentUser(null);
            setAccessToken("");
            setIsAuthenticated(false);
          }}
          currentUser={currentUser}
          accessToken={accessToken}
        />
      )}
    </AppPreferencesProvider>
  );
}

export default App;
