"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  try {
    const { isSignedIn } = useAuth();

    if (isSignedIn) {
      return (
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      );
    }

    return (
      <SignInButton mode="modal">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </SignInButton>
    );
  } catch (error) {
    // Clerk not configured, show setup message
    return (
      <Button variant="outline" size="sm" disabled>
        Setup Clerk
      </Button>
    );
  }
}