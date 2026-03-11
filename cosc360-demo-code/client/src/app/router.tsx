import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ProtectedRoute } from "@/lib/auth";
import { LoginForm } from "@/features/auth/components/login-form";
import { FeedPage } from "@/features/tweets/components/tweet-list";

export function AppRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
