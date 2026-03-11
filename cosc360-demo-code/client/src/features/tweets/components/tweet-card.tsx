import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { updateTweetApi } from "../api/update-tweet";
import { deleteTweetApi } from "../api/delete-tweet";
import type { TweetWithAuthor } from "../types";

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onUpdate: () => void;
}

export function TweetCard({ tweet, onUpdate }: TweetCardProps): JSX.Element {
  const { user } = useAuth();
  const isOwner: boolean = user?.id === tweet.authorId;
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>(tweet.content);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleEdit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateTweetApi(tweet.id, editContent);
      setIsEditing(false);
      onUpdate();
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setIsSubmitting(true);
    try {
      await deleteTweetApi(tweet.id);
      onUpdate();
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  }

  const timeStr: string = new Date(tweet.createdAt).toLocaleString();

  return (
    <Card className="tweet-card">
      <div className="tweet-header">
        <span className="tweet-author">@{tweet.author.username}</span>
        <span className="tweet-time">{timeStr}</span>
      </div>

      {isEditing ? (
        <form className="edit-tweet-form" onSubmit={handleEdit}>
          <textarea
            className="input"
            value={editContent}
            onChange={(e): void => setEditContent(e.target.value)}
            required
          />
          <div className="edit-tweet-actions">
            <Button
              type="button"
              variant="secondary"
              className="btn-sm"
              onClick={(): void => {
                setIsEditing(false);
                setEditContent(tweet.content);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="btn-sm" disabled={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="tweet-content">{tweet.content}</p>
          {isOwner && (
            <div className="tweet-actions">
              <Button
                variant="secondary"
                className="btn-sm"
                onClick={(): void => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                className="btn-sm"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
