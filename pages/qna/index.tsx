import React from "react";
import QnAMiddle from "../../components/qna/QnAMiddle";

export default function QnAPage() {
  return <QnAMiddle />;
}

// keep your layoutProps exactly as before
// if your app reads layoutProps to render per-page layout:
(QnAPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  mobileMain: <QnAMiddle />,
};
