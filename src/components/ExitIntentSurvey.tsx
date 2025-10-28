import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { trackEvent } from "@/lib/posthog";

interface ExitIntentSurveyProps {
  trigger: boolean; // True when mouse leaves viewport on checkout page
}

export const ExitIntentSurvey = ({ trigger }: ExitIntentSurveyProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (trigger && !hasShown) {
      setIsVisible(true);
      setHasShown(true);
      
      trackEvent("$survey_shown", {
        survey_id: "exit_intent_checkout",
        survey_name: "Exit Intent - Checkout Abandonment",
      });
    }
  }, [trigger, hasShown]);

  const handleDismiss = () => {
    setIsVisible(false);
    trackEvent("$survey_dismissed", {
      survey_id: "exit_intent_checkout",
    });
  };

  const handleSubmit = () => {
    if (selectedReason) {
      trackEvent("$survey_response", {
        survey_id: "exit_intent_checkout",
        survey_response: selectedReason,
      });
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle>Before you go... 🦔</CardTitle>
          <CardDescription>
            Help us improve! What stopped you from completing your purchase?
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price_too_high" id="price" />
                <Label htmlFor="price" className="cursor-pointer">
                  Price is too high
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shipping_cost" id="shipping" />
                <Label htmlFor="shipping" className="cursor-pointer">
                  Shipping costs too much
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="need_more_info" id="info" />
                <Label htmlFor="info" className="cursor-pointer">
                  Need more product information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="changed_mind" id="changed" />
                <Label htmlFor="changed" className="cursor-pointer">
                  Changed my mind
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="just_browsing" id="browsing" />
                <Label htmlFor="browsing" className="cursor-pointer">
                  Just browsing
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
        
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedReason} className="flex-1">
            Submit Feedback
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
