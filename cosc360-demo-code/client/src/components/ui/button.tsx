import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  danger: "btn btn-danger",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button className={`${variantClasses[variant]} ${className}`} {...props} />
  );
}
