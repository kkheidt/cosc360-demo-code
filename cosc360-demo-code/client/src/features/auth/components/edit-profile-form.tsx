import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { updateProfileApi } from "../api/update-profile";

interface EditProfileFormProps {
  onClose: () => void;
}

export function EditProfileForm({ onClose }: EditProfileFormProps): JSX.Element {
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState<string>(user?.username ?? "");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const updated = await updateProfileApi(username);
      setUser(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e): void => e.stopPropagation()}>
        <h2>Edit Profile</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <Input
            id="edit-username"
            label="Username"
            value={username}
            onChange={(e): void => setUsername(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
