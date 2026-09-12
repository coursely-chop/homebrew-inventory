import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import { InventoryProvider } from "./lib/InventoryContext";
import { RecipeProvider } from "./lib/RecipeContext";
import { Inventory } from "./screens/Inventory";
import { Recipes } from "./screens/Recipes";

function Nav() {
  return (
    <nav className="app-nav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
        Inventory
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => (isActive ? "active" : "")}>
        Recipes
      </NavLink>
    </nav>
  );
}

function App() {
  return (
    <InventoryProvider>
      <RecipeProvider>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route path="/" element={<Inventory />} />
            <Route path="/recipes" element={<Recipes />} />
          </Routes>
        </BrowserRouter>
      </RecipeProvider>
    </InventoryProvider>
  );
}

export default App;
