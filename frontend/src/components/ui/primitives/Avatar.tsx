"use client";

import { forwardRef } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "square";
export type AvatarStatus = "online" | "offline" | "busy";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt: string;
  /** Fallback initials when no image */
  initials?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Shape variant */
  shape?: AvatarShape;
  /** Online status indicator */
  status?: AvatarStatus;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  {
    src,
    alt,
    initials,
    size = "md",
    shape = "circle",
    status,
    className = "",
    ...props
  },
  ref
) {
  const avatarClasses = [
    "dh-avatar",
    `dh-avatar--${size}`,
    shape === "square" && "dh-avatar--square",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const avatar = (
    <div ref={ref} className={avatarClasses} aria-label={alt} {...props}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <span aria-hidden="true">
          {initials || alt.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  if (status) {
    return (
      <div className="dh-avatar-container">
        {avatar}
        <span
          className={`dh-avatar-status dh-avatar-status--${status}`}
          aria-label={`Status: ${status}`}
        />
      </div>
    );
  }

  return avatar;
});
