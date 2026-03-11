import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = "", ...props }: CardProps): JSX.Element {
  return <div className={`card ${className}`} {...props} />;
}
