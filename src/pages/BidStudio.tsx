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
          <h1 className="text-3xl font-display font-bold mb-4">Bid Studio</h1>
          <p className="text-muted-foreground mb-8">Bid Studio is a Pro feature. Upgrade to access AI-powered bid writing tools.</p>
          <Button onClick={() => setShowUpgrade(true)} className="bg-accent text-accent-foreground">Upgrade to Pro</Button>
        </div>
      </>
    );
  }

  return (
    <div className="container py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Welcome to Bid Studio</h1>
        <p className="text-muted-foreground mt-1">Your AI-powered bid writing assistant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card key={tool.path} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                </div>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={tool.path}>Launch Tool</Link>
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
