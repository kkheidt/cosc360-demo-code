import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createTweetApi } from "../api/create-tweet";

interface CreateTweetFormProps {
  onCreate: () => void;
}

export function CreateTweetForm({
  onCreate,
}: CreateTweetFormProps): JSX.Element {
  const [content, setContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createTweetApi(content);
      setContent("");
      onCreate();
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="create-tweet">
      <form onSubmit={handleSubmit}>
        <textarea
          className="input"
          placeholder="What's happening?"
          value={content}
          onChange={(e): void => setContent(e.target.value)}
          required
        />
        <div className="create-tweet-row">
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? "Posting..." : "Tweet"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
