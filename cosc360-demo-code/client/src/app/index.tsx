import { AppProvider } from "./provider";
import { AppRouter } from "./router";

export function App(): JSX.Element {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
