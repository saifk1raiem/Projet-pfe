import { useState } from "react";
import { Layout } from "./components/Layout";
import { LoginPage } from "./components/LoginPage";
import { AppPreferencesProvider } from "./context/AppPreferencesContext";
import "./styles/globals.css";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <AppPreferencesProvider>
      {!isAuthenticated ? (
        <LoginPage onLogin={() => setIsAuthenticated(true)} />
      ) : (
        <Layout onSignOut={() => setIsAuthenticated(false)} />
      )}
    </AppPreferencesProvider>
  );
}

export default App;
