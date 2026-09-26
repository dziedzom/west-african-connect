import { Link } from "react-router-dom";
import { fmtDate, fmtValue, isOpen, tenderPath, type PublicTender } from "@/lib/tenderSeo";

const TenderRow = ({ t }: { t: PublicTender }) => {
  const value = fmtValue(t.value_amount, t.value_currency);
  return (
    <li className="border-b border-border py-3 last:border-0">
      <Link to={tenderPath(t)} className="text-sm font-medium text-foreground hover:text-accent">
        {t.title}
      </Link>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {t.organization && <span>{t.organization}</span>}
        {t.location && <span>{t.location}</span>}
        {t.category && <span>{t.category}</span>}
        <span className="font-data">
          {t.is_award_notice ? "Contract award" : isOpen(t) ? `Closes ${fmtDate(t.deadline)}` : `Closed ${fmtDate(t.deadline)}`}
        </span>
        {value && <span className="font-data">{value}</span>}
      </div>
    </li>
  );
};

export default TenderRow;
