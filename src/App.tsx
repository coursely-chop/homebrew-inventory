import "./App.css";
import { InventoryProvider } from "./lib/InventoryContext";
import { Inventory } from "./screens/Inventory";

function App() {
  return (
    <InventoryProvider>
      <Inventory />
    </InventoryProvider>
  );
}

export default App;
