import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { identifyUser, trackEvent } from "@/lib/posthog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

export const RegistrationDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide both name and email.",
      });
      return;
    }

    // Use email as the unique identifier for PostHog
    identifyUser(email, {
      email,
      name,
      registered_at: new Date().toISOString(),
    });

    trackEvent("user_registered", {
      email,
      name,
    });

    toast({
      title: "Welcome to HogShop! 🦔",
      description: "You're now part of the hedgehog family.",
    });

    setOpen(false);
    setEmail("");
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Join Us
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join the Hedgehog Family</DialogTitle>
          <DialogDescription>
            Get exclusive updates and be part of our PostHog community!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Max Hedgehog"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="max@posthog.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Join HogShop
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
