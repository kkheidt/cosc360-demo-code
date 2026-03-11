import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { Navigate } from "react-router";
import type { User } from "@/features/auth/types";
import { apiClient } from "./api-client";

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect((): void => {
    const userId: string | null = localStorage.getItem("userId");
    if (!userId) {
      setIsLoading(false);
      return;
    }

    apiClient<User>("/api/auth/me")
      .then((res): void => {
        if (res.data) {
          setUser(res.data);
        } else {
          localStorage.removeItem("userId");
        }
        setIsLoading(false);
      })
      .catch((): void => {
        localStorage.removeItem("userId");
        setIsLoading(false);
      });
  }, []);

  function login(user: User): void {
    localStorage.setItem("userId", user.id);
    setUser(user);
  }

  function logout(): void {
    localStorage.removeItem("userId");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
