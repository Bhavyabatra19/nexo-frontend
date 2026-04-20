export interface AIResponse {
  relationshipScore: number;
  summary: string;
  reminders: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}
