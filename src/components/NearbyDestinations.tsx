import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import type { NearbyDestination } from "@/types/stay";

interface Props {
  destinations: NearbyDestination[];
}

const NearbyDestinations = ({ destinations }: Props) => {
  if (!destinations?.length) return null;

  return (
    <div className="mt-6">
      <h2 className="text-base font-bold text-foreground mb-3 px-4">Nearby Attractions</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {destinations.map((dest, i) => (
          <motion.div
            key={dest.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="shrink-0 w-[140px]"
          >
            <div className="rounded-2xl overflow-hidden shadow-card bg-card">
              <img
                src={dest.image}
                alt={dest.name}
                loading="lazy"
                className="w-full h-[100px] object-cover"
              />
              <div className="p-2.5">
                <p className="text-xs font-bold text-foreground truncate">{dest.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{dest.distance} away</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default NearbyDestinations;