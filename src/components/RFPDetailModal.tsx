import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, DollarSign, Building } from "lucide-react";

interface RFP {
  id: number;
  title: string;
  org: string;
  category: string;
  location: string;
  value: string;
  deadline: string;
  description: string;
}

interface RFPDetailModalProps {
  rfp: RFP | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RFPDetailModal = ({ rfp, open, onOpenChange }: RFPDetailModalProps) => {
  if (!rfp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{rfp.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4 text-accent" />
            <span>{rfp.org}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{rfp.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-accent" />
              <span>{rfp.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-accent" />
              <span>{rfp.value}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-accent" />
              <span>Due: {rfp.deadline}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{rfp.category}</Badge>
            <Badge variant="outline" className="border-accent/30 text-accent">{rfp.location}</Badge>
          </div>
          <Button className="w-full bg-accent text-accent-foreground hover:bg-gold-dark font-semibold mt-2">
            Express Interest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RFPDetailModal;
