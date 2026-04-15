// components/LinkifyText.tsx
import React from "react";

type Props = {
  text: string;
};

type Segment =
  | { type: "text"; value: string }
  | { type: "link"; value: string }
  | { type: "bold"; children: Segment[] }
  | { type: "italic"; children: Segment[] }
  | { type: "strike"; children: Segment[] }
  | { type: "br" };

const urlRegex =
  /((https?:\/\/|www\.)[^\s]+|\b[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?)/gi;

function splitWithLinks(text: string): Segment[] {
  const parts: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  urlRegex.lastIndex = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const index = match.index;

    if (index > lastIndex) {
      parts.push({
        type: "text",
        value: text.slice(lastIndex, index),
      });
    }

    parts.push({
      type: "link",
      value: url,
    });

    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return parts;
}

function parseInline(text: string): Segment[] {
  const lines = text.split("\n");
  const output: Segment[] = [];

  lines.forEach((line, idx) => {
    output.push(...parseInlineNoBreaks(line));
    if (idx < lines.length - 1) {
      output.push({ type: "br" });
    }
  });

  return output;
}

function parseInlineNoBreaks(text: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (char === "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i + 1) {
        const inner = text.slice(i + 1, end);
        segments.push({
          type: "bold",
          children: splitWithLinks(inner),
        });
        i = end + 1;
        continue;
      }
    }

    if (char === "_") {
      const end = text.indexOf("_", i + 1);
      if (end > i + 1) {
        const inner = text.slice(i + 1, end);
        segments.push({
          type: "italic",
          children: splitWithLinks(inner),
        });
        i = end + 1;
        continue;
      }
    }

    if (char === "~") {
      const end = text.indexOf("~", i + 1);
      if (end > i + 1) {
        const inner = text.slice(i + 1, end);
        segments.push({
          type: "strike",
          children: splitWithLinks(inner),
        });
        i = end + 1;
        continue;
      }
    }

    let j = i + 1;
    while (
      j < text.length &&
      text[j] !== "*" &&
      text[j] !== "_" &&
      text[j] !== "~"
    ) {
      j++;
    }

    segments.push(...splitWithLinks(text.slice(i, j)));
    i = j;
  }

  return segments;
}

function renderSegments(
  segments: Segment[],
  keyPrefix = "seg"
): React.ReactNode[] {
  return segments.map((seg, idx) => {
    const key = `${keyPrefix}-${idx}`;

    if (seg.type === "text") {
      return <React.Fragment key={key}>{seg.value}</React.Fragment>;
    }

    if (seg.type === "br") {
      return <br key={key} />;
    }

    if (seg.type === "link") {
      let href = seg.value;
      if (!/^https?:\/\//i.test(href)) {
        href = `https://${href}`;
      }

      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#38bdf8",
            textDecoration: "underline",
            wordBreak: "break-word",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {seg.value}
        </a>
      );
    }

    if (seg.type === "bold") {
      return (
        <strong key={key} style={{ fontWeight: 800 }}>
          {renderSegments(seg.children, `${key}-b`)}
        </strong>
      );
    }

    if (seg.type === "italic") {
      return (
        <em key={key} style={{ fontStyle: "italic" }}>
          {renderSegments(seg.children, `${key}-i`)}
        </em>
      );
    }

    if (seg.type === "strike") {
      return (
        <span key={key} style={{ textDecoration: "line-through" }}>
          {renderSegments(seg.children, `${key}-s`)}
        </span>
      );
    }

    return null;
  });
}

export default function LinkifyText({ text }: Props) {
  if (!text) return null;

  const segments = parseInline(text);
  return <>{renderSegments(segments)}</>;
}
