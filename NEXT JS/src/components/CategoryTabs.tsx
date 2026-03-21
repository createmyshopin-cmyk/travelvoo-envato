import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ICON_MAP } from "@/components/admin/CategoriesBuilder";
import { Tag } from "lucide-react";

interface CategoryTabsProps {
  selected: string;
  onSelect: (label: string) => void;
}

const CategoryTabs = ({ selected, onSelect }: CategoryTabsProps) => {
  const [categories, setCategories] = useState<{ label: string; icon: string }[]>([]);

  const fetchCategories = async () => {
    const { data } = await (supabase.from("stay_categories") as any).select("label, icon, sort_order").eq("active", true).order("sort_order");
    if (data) setCategories((data as any[]).map((d) => ({ label: d.label, icon: d.icon })));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (categories.length === 0) return null;

  return (
    <div id="categories" className="py-4">
      <h3 className="px-4 md:px-6 text-base md:text-lg font-bold text-foreground mb-3">Browse Categories</h3>
      <div className="flex gap-3 px-4 md:px-6 overflow-x-auto md:flex-wrap md:overflow-x-visible scrollbar-hide pb-1">
        {categories.map(({ icon, label }) => {
          const Icon = ICON_MAP[icon] || Tag;
          const active = selected === label;
          return (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`flex flex-col items-center gap-2 shrink-0 min-w-[80px] md:min-w-[88px] py-4 px-3 rounded-2xl transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-8 h-8 md:w-7 md:h-7" />
              <span className="text-[11px] md:text-xs font-semibold text-center leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryTabs;
