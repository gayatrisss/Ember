"use client";

import { useState } from "react";

// Renders a fully-formed email HTML document in an isolated iframe (so the email's
// own <html>/<body> styles don't leak into the app) and auto-sizes to its content.
export function EmailFrame({ html, title }: { html: string; title: string }) {
  const [height, setHeight] = useState(640);

  return (
    <iframe
      title={title}
      srcDoc={html}
      onLoad={(e) => {
        const doc = e.currentTarget.contentDocument;
        if (doc?.body) setHeight(doc.body.scrollHeight);
      }}
      className="w-full block rounded-xl border border-wax/10 bg-white"
      style={{ height }}
    />
  );
}
