import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { identifyUser } from "@/lib/posthog";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (email: string, name: string) => void;
}

export const LoginDialog = ({ open, onOpenChange, onLoginSuccess }: LoginDialogProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleLogin = () => {
    if (email && name) {
      // Store in localStorage
      localStorage.setItem("user_email", email);
      localStorage.setItem("user_name", name);
      
      // Identify in PostHog
      identifyUser(email, { name, email });
      
      onLoginSuccess(email, name);
      onOpenChange(false);
      setEmail("");
      setName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome Back!</DialogTitle>
          <DialogDescription>
            Enter your details to continue shopping
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button onClick={handleLogin} className="w-full" disabled={!email || !name}>
            Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
