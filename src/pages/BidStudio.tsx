import { Link } from "react-router-dom";
import { Search, PenTool, ClipboardCheck, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/UpgradeModal";
import { useState } from "react";

const tools = [
  {
    icon: Search,
    name: "RFP Analyser",
    emoji: "🔍",
    description: "Understand any RFP in 60 seconds",
    path: "/bid-studio/analyser",
  },
  {
    icon: PenTool,
    name: "Bid Writer",
    emoji: "✍️",
    description: "Generate professional bid sections instantly",
    path: "/bid-studio/writer",
  },
  {
    icon: ClipboardCheck,
    name: "Bid Reviewer",
    emoji: "📋",
    description: "Score your bid before you submit",
    path: "/bid-studio/reviewer",
  },
  {
    icon: CheckSquare,
    name: "Submission Checklist",
    emoji: "✅",
    description: "Never miss a deadline or document again",
    path: "/bid-studio/checklist",
  },
];

const BidStudio = () => {
  const { isPro } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(!isPro);

  if (!isPro) {
    return (
      <>
        <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} feature="Bid Studio" />
        <div className="container py-16 text-center">
          <h1 className="screen-title font-display font-semibold mb-4">Bid Studio</h1>
          <p className="text-muted-foreground mb-8">Bid Studio is a Pro feature. Upgrade to access AI-powered bid writing tools.</p>
          <Button onClick={() => setShowUpgrade(true)} className="bg-accent text-accent-foreground">Upgrade to Pro</Button>
        </div>
      </>
    );
  }

  return (
    <div className="container py-6 space-y-5 panel-enter">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="screen-title font-display font-semibold">Bid Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Analyse a tender, draft the bid, score it, and check it off before you submit.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link to="/bid-studio/history">View my history</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card key={tool.path} className="rounded-md">
              <CardHeader className="p-4 pb-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-base">{tool.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button asChild className="w-full h-9">
                  <Link to={tool.path}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BidStudio;
