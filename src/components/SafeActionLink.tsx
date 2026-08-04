import React from "react";
import { isApprovedLink } from "../lib/knowledge/links";

interface SafeActionLinkProps {
  label: string;
  url: string;
}

/**
 * Safe action link component that only renders approved URLs.
 * 
 * Performs defensive validation even though actions should already be
 * validated server-side (defense-in-depth principle).
 * 
 * All links open in a new tab with security attributes.
 */
export default function SafeActionLink({ label, url }: SafeActionLinkProps) {
  // Defensive check: validate URL against allowlist
  if (!isApprovedLink(url)) {
    console.error(`SafeActionLink: URL not in allowlist: ${url}`);
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="action-link"
      aria-label={`${label} - opens in new tab`}
    >
      {label} ↗
    </a>
  );
}
