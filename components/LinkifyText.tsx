// components/LinkifyText.tsx
import React from "react";

type Props = {
  text: string;
};

const urlRegex =
  /((https?:\/\/|www\.)[^\s]+|\b[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?)/gi;

export default function LinkifyText({ text }: Props) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const index = match.index;

    // push plain text before the match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    // Normalise href: if no protocol, prepend https://
    let href = url;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }

    parts.push(
      <a
        key={`${href}-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#38bdf8", textDecoration: "underline" }}
      >
        {url}
      </a>
    );

    lastIndex = index + url.length;
  }

  // remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
