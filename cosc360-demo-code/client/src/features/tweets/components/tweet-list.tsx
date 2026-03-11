import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { EditProfileForm } from "@/features/auth/components/edit-profile-form";
import { getTweetsApi } from "../api/get-tweets";
import { TweetCard } from "./tweet-card";
import { CreateTweetForm } from "./create-tweet-form";
import type { TweetWithAuthor } from "../types";

export function FeedPage(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showEditProfile, setShowEditProfile] = useState<boolean>(false);

  const fetchTweets = useCallback(async (): Promise<void> => {
    try {
      const data = await getTweetsApi();
      setTweets(data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): void => {
    fetchTweets();
  }, [fetchTweets]);

  function handleLogout(): void {
    logout();
    navigate("/login");
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <h1>Feed</h1>
          <div className="header-actions">
            <span className="username-display">@{user?.username}</span>
            <button
              className="btn-link"
              onClick={(): void => setShowEditProfile(true)}
            >
              Edit
            </button>
            <Button variant="secondary" className="btn-sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <CreateTweetForm onCreate={fetchTweets} />

        {isLoading ? (
          <div className="empty-state">Loading tweets...</div>
        ) : tweets.length === 0 ? (
          <div className="empty-state">
            No tweets yet. Be the first to tweet!
          </div>
        ) : (
          tweets.map(
            (tweet: TweetWithAuthor): JSX.Element => (
              <TweetCard key={tweet.id} tweet={tweet} onUpdate={fetchTweets} />
            )
          )
        )}
      </div>

      {showEditProfile && (
        <EditProfileForm
          onClose={(): void => {
            setShowEditProfile(false);
            fetchTweets();
          }}
        />
      )}
    </div>
  );
}
