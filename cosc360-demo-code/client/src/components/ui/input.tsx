import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, ...props }: InputProps): JSX.Element {
  return (
    <div className="input-group">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className="input" {...props} />
    </div>
  );
}
