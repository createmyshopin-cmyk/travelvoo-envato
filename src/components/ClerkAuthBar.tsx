"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function ClerkAuthBar() {
  return (
    <header className="flex flex-wrap items-center justify-end gap-2 border-b border-border/60 bg-background/95 px-4 py-2">
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
}
