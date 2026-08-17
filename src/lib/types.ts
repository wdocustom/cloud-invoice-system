export interface MultiTierItem {
  title: string;
  mid_description: string;
  mid_cost: number;
  high_title: string;
  high_description: string;
  high_cost: number;
}

export interface PaymentPhase {
  name: string;
  percentage?: number;
  amount?: number;
}

export interface Invoice {
  id: string;
  /** PRO-2026-0007, or PRO-2026-0007-CO1 on a change order. */
  proposal_number?: string;
  /** The lead this proposal came from, when there was one. */
  estimate_number?: string;
  sequence_year?: number;
  sequence_no?: number;
  homeowner_name: string;
  homeowner_email: string;
  job_address: string;
  amount: number;
  items: MultiTierItem[];
  deposit_percentage: number;
  deposit_amount?: number;
  payment_phases: PaymentPhase[];
  estimated_start_date?: string;
  project_length?: string;
  status: string;
  signature_name?: string;
  signed_at?: string;
  current_phase_index?: number;
  deposit_cleared?: boolean;
  homeowner_options?: any[];
  homeowner_selections?: any;
  selections_visible?: boolean;
  show_luxury_tier?: boolean;
  project_title?: string;
  description?: string;
  payment_history?: any[];
}
