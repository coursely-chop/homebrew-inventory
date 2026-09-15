import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import { InventoryProvider } from "./lib/InventoryContext";
import { RecipeProvider } from "./lib/RecipeContext";
import { ShoppingListProvider } from "./lib/ShoppingListContext";
import { CloudSyncBoot } from "./lib/CloudSyncBoot";
import { InventoryIcon, RecipesIcon, ShoppingListIcon } from "./components/NavIcons";
import { Inventory } from "./screens/Inventory";
import { Recipes } from "./screens/Recipes";
import { RecipeDetailPage } from "./screens/RecipeDetailPage";
import { ShoppingList } from "./screens/ShoppingList";

function Nav() {
  return (
    <nav className="app-nav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")} aria-label="Inventory">
        <InventoryIcon />
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => (isActive ? "active" : "")} aria-label="Recipes">
        <RecipesIcon />
      </NavLink>
      <NavLink to="/shopping-list" className={({ isActive }) => (isActive ? "active" : "")} aria-label="Shopping List">
        <ShoppingListIcon />
      </NavLink>
    </nav>
  );
}

function App() {
  return (
    <InventoryProvider>
      <RecipeProvider>
        <ShoppingListProvider>
          <CloudSyncBoot />
          <BrowserRouter>
            <Nav />
            <Routes>
              <Route path="/" element={<Inventory />} />
              <Route path="/history" element={<Inventory />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/recipes/:id" element={<RecipeDetailPage />} />
              <Route path="/shopping-list" element={<ShoppingList />} />
            </Routes>
          </BrowserRouter>
        </ShoppingListProvider>
      </RecipeProvider>
    </InventoryProvider>
  );
}

export default App;
