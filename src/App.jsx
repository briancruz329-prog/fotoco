import PublicShop from "./pages/PublicShop";
import Login from "./pages/login";
import Admin from "./pages/admin";

export default function App() {
  const path = window.location.pathname;

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/admin") {
    return <Admin />;
  }

  return <PublicShop />;
}