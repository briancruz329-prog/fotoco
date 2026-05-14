import PublicShop from "./pages/PublicShop";
import Login from "./pages/login";
import Admin from "./pages/admin";
import Employee from "./pages/employee";

export default function App() {
  const path = window.location.pathname;

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/admin") {
    return <Admin />;
  }

  if (path === "/employee") {
    return <Employee />;
  }

  return <PublicShop />;
}