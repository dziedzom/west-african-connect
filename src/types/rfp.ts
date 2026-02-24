export interface RFP {
  id: string;
  title: string;
  description: string;
  category: string;
  org: string | null;
  location: string | null;
  value: string | null;
  budget: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
