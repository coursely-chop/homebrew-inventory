import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import { InventoryProvider } from "./lib/InventoryContext";
import { RecipeProvider } from "./lib/RecipeContext";
import { Inventory } from "./screens/Inventory";
import { Recipes } from "./screens/Recipes";
import { ShoppingList } from "./screens/ShoppingList";

function Nav() {
  return (
    <nav className="app-nav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
        Inventory
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => (isActive ? "active" : "")}>
        Recipes
      </NavLink>
      <NavLink to="/shopping-list" className={({ isActive }) => (isActive ? "active" : "")}>
        Shopping List
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
            <Route path="/shopping-list" element={<ShoppingList />} />
          </Routes>
        </BrowserRouter>
      </RecipeProvider>
    </InventoryProvider>
  );
}

export default App;
