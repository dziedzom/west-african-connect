import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CURRENCIES = ["USD", "NGN", "KES", "GHS", "ZAR", "ETB", "TZS", "UGX", "RWF"];

interface WonContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfpId: string;
  rfpTitle: string;
}

const WonContractModal = ({ open, onOpenChange, rfpId, rfpTitle }: WonContractModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contractValue, setContractValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const numericValue = parseFloat(contractValue) || 0;
  const successFee = useMemo(() => Math.min(Math.round(numericValue * 0.035 * 100) / 100, 5000), [numericValue]);

  const handleSubmit = async () => {
    if (!user || !agreed || numericValue <= 0) return;
    setSubmitting(true);

    const { error } = await supabase.from("won_contracts").insert({
      user_id: user.id,
      rfp_id: rfpId,
      rfp_title: rfpTitle,
      contract_value: numericValue,
      currency,
      agreement_confirmed: true,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Congratulations! 🎉", description: "Your won contract has been recorded. An invoice will be sent shortly." });
      onOpenChange(false);
      setContractValue("");
      setCurrency("USD");
      setAgreed(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-accent" />
            <DialogTitle className="font-display text-xl">I Won This Contract</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Report your contract win to complete the success fee process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">RFP Title</Label>
            <Input value={rfpTitle} readOnly className="bg-muted/50 mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Contract Value</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {numericValue > 0 && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">MiddlBrand success fee: 3.5%</p>
              <p className="text-2xl font-display font-bold text-accent mt-1">
                USD ${successFee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {successFee >= 5000 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">Capped at $5,000</p>
              )}
            </div>
          )}

          <div className="flex items-start gap-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              I agree to pay the MiddlBrand success fee of ${successFee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} within 30 days of first payment receipt from the contracting authority.
            </Label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!agreed || numericValue <= 0 || submitting}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
          >
            {submitting ? "Submitting…" : "Submit Won Contract"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WonContractModal;
