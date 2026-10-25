import React from "react";
import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

export interface TrustBenefit {
  id: string;
  icon: "truck" | "shield" | "return" | "support";
  title: string;
}

interface TrustStripProps {
  benefits?: TrustBenefit[];
}

const DEFAULT_BENEFITS: TrustBenefit[] = [
  {
    id: "delivery",
    icon: "truck",
    title: "Fast & Reliable\nDelivery",
  },
  {
    id: "genuine",
    icon: "shield",
    title: "100% Genuine\nProducts",
  },
  {
    id: "return",
    icon: "return",
    title: "Easy Return\n& Exchange",
  },
  {
    id: "support",
    icon: "support",
    title: "Dedicated\nCustomer Support",
  },
];

export function TrustStrip({ benefits = DEFAULT_BENEFITS }: TrustStripProps) {
  const getIcon = (type: TrustBenefit["icon"]) => {
    switch (type) {
      case "truck":
        return <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-[#153D32]" strokeWidth={1.75} />;
      case "shield":
        return <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#153D32]" strokeWidth={1.75} />;
      case "return":
        return <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-[#153D32]" strokeWidth={1.75} />;
      case "support":
        return <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-[#153D32]" strokeWidth={1.75} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="bg-[#FFFCF8] rounded-2xl border border-stone-200/60 shadow-xs px-6 py-6 sm:py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {benefits.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3.5 sm:gap-4 justify-start sm:justify-center"
            >
              <div className="shrink-0">{getIcon(item.icon)}</div>
              <span className="font-medium text-xs sm:text-sm text-[#172723] leading-snug whitespace-pre-line">
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
