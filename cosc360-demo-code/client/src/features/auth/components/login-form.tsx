import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { loginApi } from "../api/login";

export function LoginForm(): JSX.Element {
  const [username, setUsername] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await loginApi(username);
      login(user);
      navigate("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Twitter Clone</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e): void => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
          {error && <p className="error">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
