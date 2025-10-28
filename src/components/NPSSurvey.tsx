import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { trackEvent } from "@/lib/posthog";

export const NPSSurvey = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);

  useEffect(() => {
    // Check if user made a purchase 3 days ago
    const checkPurchaseDate = () => {
      const checkoutData = localStorage.getItem("checkout_basket");
      if (!checkoutData) return false;

      try {
        const data = JSON.parse(checkoutData);
        const purchaseDate = data.timestamp;
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        
        // Show if purchase was ~3 days ago and survey not shown yet
        const surveyShown = localStorage.getItem("nps_survey_shown");
        return purchaseDate < threeDaysAgo && !surveyShown;
      } catch {
        return false;
      }
    };

    if (checkPurchaseDate()) {
      setIsVisible(true);
      localStorage.setItem("nps_survey_shown", "true");
      
      trackEvent("$survey_shown", {
        survey_id: "nps_post_purchase",
        survey_name: "Net Promoter Score - Post Purchase",
      });
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    trackEvent("$survey_dismissed", {
      survey_id: "nps_post_purchase",
    });
  };

  const handleSubmit = () => {
    if (selectedScore !== null) {
      trackEvent("$survey_response", {
        survey_id: "nps_post_purchase",
        survey_response: selectedScore,
        nps_score: selectedScore,
        nps_category: selectedScore >= 9 ? "promoter" : selectedScore >= 7 ? "passive" : "detractor",
      });
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-md">
      <Card className="shadow-2xl border-2">
        <CardHeader className="relative pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">How likely are you to recommend Hogster? 🦔</CardTitle>
          <CardDescription>
            Your feedback helps us improve
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            <div className="grid grid-cols-11 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <Button
                  key={score}
                  variant={selectedScore === score ? "default" : "outline"}
                  size="sm"
                  className={`h-10 w-full p-0 ${
                    selectedScore === score ? "" : "hover:bg-primary/10"
                  }`}
                  onClick={() => setSelectedScore(score)}
                >
                  {score}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-2 pt-3">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Maybe Later
          </Button>
          <Button onClick={handleSubmit} disabled={selectedScore === null} className="flex-1">
            Submit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
