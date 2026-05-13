"use client";

type Props = {
  status?: number;
  message: string;
};

export function ApiErrorState({ status, message }: Props) {
  return (
    <div className="error-state" role="alert">
      {status ? <strong>Error {status}</strong> : null}
      <p>{message}</p>
    </div>
  );
}
