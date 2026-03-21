import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Play, MapPin, Image, Star, Film, Navigation, Wifi, Waves, UtensilsCrossed, Car, TreePine, Flame, Coffee, Dumbbell, Wind, Tv, ShowerHead, Mountain, Tent, Dog, Baby, Sparkles, Music, Gamepad2, BookOpen, Shirt, Phone, ShieldCheck, Clock, Zap, Check, Search, Upload, Loader2, BedDouble, Users, Pencil, ImagePlus, ChevronLeft, ChevronRight, Save, Package } from "lucide-react";
import { SortablePhotoGrid } from "./SortablePhotoGrid";

const ALL_AMENITIES = [
  { name: "Free Wi-Fi", icon: Wifi },
  { name: "Swimming Pool", icon: Waves },
  { name: "Restaurant", icon: UtensilsCrossed },
  { name: "Free Parking", icon: Car },
  { name: "Garden", icon: TreePine },
  { name: "Bonfire", icon: Flame },
  { name: "Free Breakfast", icon: Coffee },
  { name: "Gym", icon: Dumbbell },
  { name: "Air Conditioning", icon: Wind },
  { name: "TV", icon: Tv },
  { name: "Hot Water", icon: ShowerHead },
  { name: "Mountain View", icon: Mountain },
  { name: "Camping", icon: Tent },
  { name: "Pet Friendly", icon: Dog },
  { name: "Kid Friendly", icon: Baby },
  { name: "Spa", icon: Sparkles },
  { name: "Live Music", icon: Music },
  { name: "Indoor Games", icon: Gamepad2 },
  { name: "Library", icon: BookOpen },
  { name: "Laundry", icon: Shirt },
  { name: "Room Service", icon: Phone },
  { name: "Security", icon: ShieldCheck },
  { name: "24/7 Check-in", icon: Clock },
  { name: "Power Backup", icon: Zap },
  { name: "Nature Trail", icon: TreePine },
  { name: "Infinity Pool", icon: Waves },
  { name: "Fine Dining", icon: UtensilsCrossed },
  { name: "Shared Pool", icon: Waves },
];

function useLiveCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const fetch = async () => {
    const { data } = await supabase.from("stay_categories").select("label").eq("active", true).order("sort_order");
    if (data) setCategories(data.map((d) => d.label));
  };
  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('stayform_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stay_categories' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  return categories;
}

interface ReelItem { id?: string; title: string; thumbnail: string; url: string; platform: string; }
interface NearbyItem { id?: string; name: string; image: string; distance: string; maps_link: string; description: string; tenant_id?: string | null; }
interface ReviewItem { id?: string; guest_name: string; rating: number; comment: string; photos: string[]; }

interface AddonItem { id?: string; name: string; price: number; optional: boolean; }

interface RoomCategoryItem {
  id?: string;
  name: string;
  max_guests: number;
  available: number;
  amenities: string[];
  price: number;
  original_price: number;
  images: string[];
}

const ROOM_AMENITIES = [
  "AC", "Wi-Fi", "TV", "Geyser", "Balcony", "Sea View", "Mountain View",
  "Attached Bathroom", "Room Service", "Mini Fridge", "Wardrobe", "Desk",
  "King Bed", "Twin Beds", "Sofa", "Kettle", "Hair Dryer", "Iron",
];

const emptyRoom: RoomCategoryItem = {
  name: "", max_guests: 2, available: 1, amenities: [], price: 0, original_price: 0, images: [],
};

interface StayFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay?: any;
  onSaved: () => void;
}

export function StayForm({ open, onOpenChange, stay, onSaved }: StayFormProps) {
  const { toast } = useToast();
  const categories = useLiveCategories();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const TAB_ORDER = ["basic", "photos", "rooms", "addons", "reels", "nearby", "reviews", "seo"] as const;
  const tabIdx = TAB_ORDER.indexOf(activeTab as typeof TAB_ORDER[number]);
  const isFirstTab = tabIdx === 0;
  const isLastTab = tabIdx === TAB_ORDER.length - 1;
  const goNext = () => { if (!isLastTab) setActiveTab(TAB_ORDER[tabIdx + 1]); };
  const goBack = () => { if (!isFirstTab) setActiveTab(TAB_ORDER[tabIdx - 1]); };

  // Basic info
  const [form, setForm] = useState({
    name: "", location: "", description: "", category: "",
    price: 0, original_price: 0, status: "active",
    max_adults: 20, max_children: 5, max_pets: 5,
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Reels
  const [reels, setReels] = useState<ReelItem[]>([]);

  // Nearby destinations
  const [nearby, setNearby] = useState<NearbyItem[]>([]);

  // Reviews
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [newReview, setNewReview] = useState<ReviewItem>({ guest_name: "", rating: 5, comment: "", photos: [] });

  // Room Categories
  const [roomCategories, setRoomCategories] = useState<RoomCategoryItem[]>([]);
  const [roomForm, setRoomForm] = useState<RoomCategoryItem>({ ...emptyRoom });
  const [editingRoomIdx, setEditingRoomIdx] = useState<number | null>(null);
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [deletedRoomIds, setDeletedRoomIds] = useState<string[]>([]);
  const [roomPhotoUploading, setRoomPhotoUploading] = useState(false);
  const roomPhotoRef = useRef<HTMLInputElement>(null);

  // Add-ons
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [deletedAddonIds, setDeletedAddonIds] = useState<string[]>([]);

  // SEO
  const [seo, setSeo] = useState({
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    og_image_url: "",
  });
  const [uploadingOg, setUploadingOg] = useState(false);
  const [ogImageSize, setOgImageSize] = useState<string | null>(null);
  const [ogImageError, setOgImageError] = useState(false);
  const ogInputRef = useRef<HTMLInputElement>(null);

  // Load existing data when editing
  useEffect(() => {
    if (!open) return;
    if (stay) {
      setForm({
        name: stay.name || "", location: stay.location || "", description: stay.description || "",
        category: stay.category || "", price: stay.price || 0, original_price: stay.original_price || 0,
        status: stay.status || "active",
        max_adults: stay.max_adults ?? 20, max_children: stay.max_children ?? 5, max_pets: stay.max_pets ?? 5,
      });
      setSelectedAmenities(stay.amenities || []);
      setPhotos(stay.images || []);
      setSeo({
        seo_title: stay.seo_title || "",
        seo_description: stay.seo_description || "",
        seo_keywords: stay.seo_keywords || "",
        og_image_url: stay.og_image_url || "",
      });
      setOgImageSize(null);
      setOgImageError(false);
      setRoomCategories([]);
      setRoomForm({ ...emptyRoom });
      setEditingRoomIdx(null);
      setRoomFormOpen(false);
      setDeletedRoomIds([]);
      setAddons([]);
      setDeletedAddonIds([]);
      fetchRelatedData(stay.id);
    } else {
      setForm({ name: "", location: "", description: "", category: "", price: 0, original_price: 0, status: "active" });
      setSelectedAmenities([]);
      setPhotos([]);
      setReels([]);
      setNearby([]);
      setReviews([]);
      setSeo({ seo_title: "", seo_description: "", seo_keywords: "", og_image_url: "" });
      setOgImageSize(null);
      setOgImageError(false);
      setRoomCategories([]);
      setRoomForm({ ...emptyRoom });
      setEditingRoomIdx(null);
      setRoomFormOpen(false);
      setDeletedRoomIds([]);
      setAddons([]);
      setDeletedAddonIds([]);
    }
    setActiveTab("basic");
  }, [stay, open]);

  const fetchRelatedData = async (stayId: string) => {
    const [reelsRes, nearbyRes, reviewsRes, roomsRes, addonsRes] = await Promise.all([
      supabase.from("stay_reels").select("*").eq("stay_id", stayId).order("sort_order"),
      supabase.from("nearby_destinations").select("*").eq("stay_id", stayId).order("sort_order"),
      supabase.from("reviews").select("*").eq("stay_id", stayId).order("created_at", { ascending: false }),
      supabase.from("room_categories").select("*").eq("stay_id", stayId).order("name"),
      (supabase.from("stay_addons") as any).select("*").eq("stay_id", stayId).order("sort_order"),
    ]);
    if (reelsRes.data) setReels(reelsRes.data.map(r => ({ id: r.id, title: r.title, thumbnail: r.thumbnail, url: r.url, platform: r.platform })));
    if (nearbyRes.data) setNearby(nearbyRes.data.map(n => ({ id: n.id, name: n.name, image: n.image, distance: n.distance, maps_link: n.maps_link || "", description: n.description || "", tenant_id: n.tenant_id })));
    if (reviewsRes.data) setReviews(reviewsRes.data.map(r => ({ id: r.id, guest_name: r.guest_name, rating: r.rating, comment: r.comment, photos: r.photos || [] })));
    if (roomsRes.data) setRoomCategories(roomsRes.data.map(r => ({
      id: r.id, name: r.name, max_guests: r.max_guests, available: r.available,
      amenities: r.amenities || [], price: r.price, original_price: r.original_price, images: r.images || [],
    })));
    if (addonsRes.data) setAddons(addonsRes.data.map((a: any) => ({ id: a.id, name: a.name, price: a.price, optional: a.optional })));
  };

  const validateBasic = () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return false; }
    if (!form.location.trim()) { toast({ title: "Location is required", variant: "destructive" }); return false; }
    return true;
  };

  const handleNext = () => {
    if (activeTab === "basic" && !validateBasic()) return;
    goNext();
  };

  const saveStay = async (status: string) => {
    const isDraft = status === "draft";
    if (isDraft) setSavingDraft(true); else setLoading(true);

    if (!isDraft && !validateBasic()) {
      setLoading(false);
      setActiveTab("basic");
      return;
    }

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");

    const amenitiesArray = selectedAmenities;
    const stayId = stay ? stay.stay_id : `Stay-${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = {
      name: form.name || "Untitled Stay",
      location: form.location,
      description: form.description,
      category: form.category,
      price: form.price,
      original_price: form.original_price,
      amenities: amenitiesArray,
      status,
      images: photos,
      max_adults: form.max_adults,
      max_children: form.max_children,
      max_pets: form.max_pets,
      seo_title: seo.seo_title || null,
      seo_description: seo.seo_description || null,
      seo_keywords: seo.seo_keywords || null,
      og_image_url: seo.og_image_url || null,
    };

    let savedStayId = stay?.id;
    let error;

    if (stay) {
      ({ error } = await supabase.from("stays").update(payload).eq("id", stay.id));
    } else {
      const { data, error: insertError } = await supabase.from("stays").insert([{
        stay_id: stayId, ...payload, tenant_id: tenantId,
      }]).select("id").single();
      error = insertError;
      if (data) savedStayId = data.id;
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSavingDraft(false);
      setLoading(false);
      return;
    }

    if (savedStayId) {
      await saveReels(savedStayId, tenantId);
      await saveNearby(savedStayId, tenantId);
      await saveNewReviews(savedStayId);
      await saveRoomCategories(savedStayId, tenantId);
      await saveAddons(savedStayId, tenantId);
    }

    toast({
      title: isDraft ? "Draft saved" : (stay ? "Stay updated" : "Stay created"),
      description: `${form.name || "Untitled Stay"} ${isDraft ? "saved as draft." : "saved successfully."}`,
    });
    onSaved();
    onOpenChange(false);
    setSavingDraft(false);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLastTab) { handleNext(); return; }
    await saveStay(form.status === "draft" && stay ? form.status : "active");
  };

  const saveReels = async (stayId: string, tid: string | null) => {
    await supabase.from("stay_reels").delete().eq("stay_id", stayId);
    if (reels.length > 0) {
      await supabase.from("stay_reels").insert(
        reels.map((r, i) => ({ stay_id: stayId, title: r.title, thumbnail: r.thumbnail, url: r.url, platform: r.platform, sort_order: i, tenant_id: tid }))
      );

    }
  };

  const saveNearby = async (stayId: string, tid: string | null) => {
    await supabase.from("nearby_destinations").delete().eq("stay_id", stayId);
    if (nearby.length > 0) {
      await supabase.from("nearby_destinations").insert(
        nearby.map((n, i) => ({
          stay_id: stayId, name: n.name, image: n.image, distance: n.distance,
          maps_link: n.maps_link, description: n.description,
          sort_order: i, tenant_id: tid,
        }))
      );
    }
  };

  const saveNewReviews = async (stayId: string) => {
    const newOnes = reviews.filter(r => !r.id);
    if (newOnes.length > 0) {
      await supabase.from("reviews").insert(
        newOnes.map(r => ({ stay_id: stayId, guest_name: r.guest_name, rating: r.rating, comment: r.comment, photos: r.photos, status: "approved" }))
      );
    }
  };

  const saveRoomCategories = async (stayId: string, tid: string | null) => {
    for (const id of deletedRoomIds) {
      await supabase.from("room_categories").delete().eq("id", id);
    }
    for (const room of roomCategories) {
      const payload: Record<string, unknown> = {
        stay_id: stayId,
        name: room.name.trim(),
        max_guests: room.max_guests,
        available: room.available,
        amenities: room.amenities,
        price: room.price,
        original_price: room.original_price || room.price,
        images: room.images,
      };
      if (room.id) {
        await supabase.from("room_categories").update(payload).eq("id", room.id);
      } else {
        payload.tenant_id = tid;
        await supabase.from("room_categories").insert([payload]);
      }
    }
  };

  const saveAddons = async (stayId: string, tid: string | null) => {
    for (const id of deletedAddonIds) {
      await (supabase.from("stay_addons") as any).delete().eq("id", id);
    }
    for (let i = 0; i < addons.length; i++) {
      const addon = addons[i];
      const payload: Record<string, unknown> = { stay_id: stayId, name: addon.name.trim(), price: addon.price, optional: addon.optional, sort_order: i };
      if (addon.id) {
        await (supabase.from("stay_addons") as any).update(payload).eq("id", addon.id);
      } else {
        payload.tenant_id = tid;
        await (supabase.from("stay_addons") as any).insert([payload]);
      }
    }
  };

  // Room category helpers
  const openRoomForm = (idx?: number) => {
    if (idx !== undefined) {
      setRoomForm({ ...roomCategories[idx] });
      setEditingRoomIdx(idx);
    } else {
      setRoomForm({ ...emptyRoom });
      setEditingRoomIdx(null);
    }
    setRoomFormOpen(true);
  };

  const saveRoomForm = () => {
    if (!roomForm.name.trim()) {
      toast({ title: "Room name required", variant: "destructive" });
      return;
    }
    if (roomForm.price <= 0) {
      toast({ title: "Price must be greater than 0", variant: "destructive" });
      return;
    }
    if (editingRoomIdx !== null) {
      setRoomCategories(prev => prev.map((r, i) => i === editingRoomIdx ? { ...roomForm } : r));
    } else {
      setRoomCategories(prev => [...prev, { ...roomForm }]);
    }
    setRoomFormOpen(false);
    setRoomForm({ ...emptyRoom });
    setEditingRoomIdx(null);
  };

  const removeRoom = (idx: number) => {
    const room = roomCategories[idx];
    if (room.id) setDeletedRoomIds(prev => [...prev, room.id!]);
    setRoomCategories(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleRoomAmenity = (amenity: string) => {
    setRoomForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  // Reel helpers
  const addReel = () => {
    setReels(prev => [...prev, { title: "", thumbnail: "", url: "", platform: "youtube" }]);
  };
  const updateReel = (i: number, field: keyof ReelItem, val: string) => {
    setReels(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const removeReel = (i: number) => setReels(prev => prev.filter((_, idx) => idx !== i));

  // Nearby helpers
  const addNearby = () => {
    setNearby(prev => [...prev, { name: "", image: "", distance: "", maps_link: "", description: "" }]);
  };
  const updateNearby = (i: number, field: keyof NearbyItem, val: string) => {
    setNearby(prev => prev.map((n, idx) => idx === i ? { ...n, [field]: val } : n));
  };
  const removeNearby = (i: number) => setNearby(prev => prev.filter((_, idx) => idx !== i));

  // Review helpers
  const addReview = () => {
    if (newReview.guest_name && newReview.comment) {
      setReviews(prev => [...prev, { ...newReview }]);
      setNewReview({ guest_name: "", rating: 5, comment: "", photos: [] });
    }
  };
  const removeReview = (i: number) => setReviews(prev => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{stay ? "Edit Stay" : "Add New Stay"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-2">
              <TabsList className="w-full grid grid-cols-8 h-9">
                <TabsTrigger value="basic" className="text-xs gap-1"><GripVertical className="h-3 w-3 hidden sm:block" />Basic</TabsTrigger>
                <TabsTrigger value="photos" className="text-xs gap-1"><Image className="h-3 w-3 hidden sm:block" />Photos</TabsTrigger>
                <TabsTrigger value="rooms" className="text-xs gap-1"><BedDouble className="h-3 w-3 hidden sm:block" />Rooms</TabsTrigger>
                <TabsTrigger value="addons" className="text-xs gap-1"><Package className="h-3 w-3 hidden sm:block" />Add-ons</TabsTrigger>
                <TabsTrigger value="reels" className="text-xs gap-1"><Film className="h-3 w-3 hidden sm:block" />Reels</TabsTrigger>
                <TabsTrigger value="nearby" className="text-xs gap-1"><Navigation className="h-3 w-3 hidden sm:block" />Nearby</TabsTrigger>
                <TabsTrigger value="reviews" className="text-xs gap-1"><Star className="h-3 w-3 hidden sm:block" />Reviews</TabsTrigger>
                <TabsTrigger value="seo" className="text-xs gap-1"><Search className="h-3 w-3 hidden sm:block" />SEO</TabsTrigger>
              </TabsList>
            </div>

            {/* BASIC TAB */}
            <TabsContent value="basic" className="px-6 pb-2 space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">About / Description</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Write an attractive intro about the stay..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (₹)</label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Original Price (₹)</label>
                  <Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Guest Limits</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Adults</label>
                    <Input type="number" min={1} max={100} value={form.max_adults} onChange={(e) => setForm({ ...form, max_adults: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Children</label>
                    <Input type="number" min={0} max={50} value={form.max_children} onChange={(e) => setForm({ ...form, max_children: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Pets</label>
                    <Input type="number" min={0} max={20} value={form.max_pets} onChange={(e) => setForm({ ...form, max_pets: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Amenities</label>
                  <span className="text-xs text-muted-foreground">{selectedAmenities.length} selected</span>
                </div>

                {selectedAmenities.length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Selected Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAmenities.map((name) => {
                        const preset = ALL_AMENITIES.find(a => a.name === name);
                        const Icon = preset?.icon;
                        return (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 bg-primary text-primary-foreground pl-2 pr-1 py-1 rounded-full text-[11px] font-medium"
                          >
                            {Icon && <Icon className="h-3 w-3" />}
                            {name}
                            <button
                              type="button"
                              onClick={() => setSelectedAmenities(prev => prev.filter(a => a !== name))}
                              className="ml-0.5 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {ALL_AMENITIES.map(({ name, icon: Icon }) => {
                    const isSelected = selectedAmenities.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedAmenities(prev => isSelected ? prev.filter(a => a !== name) : [...prev, name])}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-primary/10 text-primary border-primary/40 ring-1 ring-primary/20"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                        {name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    placeholder="Add custom amenity..."
                    className="flex-1 h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customAmenity.trim()) {
                        e.preventDefault();
                        if (!selectedAmenities.includes(customAmenity.trim())) {
                          setSelectedAmenities(prev => [...prev, customAmenity.trim()]);
                        }
                        setCustomAmenity("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={!customAmenity.trim()}
                    onClick={() => {
                      if (customAmenity.trim() && !selectedAmenities.includes(customAmenity.trim())) {
                        setSelectedAmenities(prev => [...prev, customAmenity.trim()]);
                      }
                      setCustomAmenity("");
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* PHOTOS TAB */}
            <TabsContent value="photos" className="px-6 pb-2 space-y-4 mt-4">
              <div className="flex flex-col gap-3">
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-xl p-6 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                >
                  {uploading ? (
                    <>
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-medium text-primary">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">Upload Photos</p>
                        <p className="text-xs text-muted-foreground">Click to browse or drag & drop</p>
                      </div>
                    </>
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setUploading(true);
                      const newUrls: string[] = [];
                      for (const rawFile of Array.from(files)) {
                        const file = await compressImage(rawFile, "stay");
                        const ext = file.name.split('.').pop();
                        const path = `stays/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                        const { error } = await supabase.storage.from('stay-images').upload(path, file);
                        if (!error) {
                          const { data: urlData } = supabase.storage.from('stay-images').getPublicUrl(path);
                          newUrls.push(urlData.publicUrl);
                        }
                      }
                      setPhotos(prev => [...prev, ...newUrls]);
                      setUploading(false);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-xs">No photos added yet</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <GripVertical className="h-3 w-3" /> Drag to reorder &middot; First image = Cover
                  </p>
                  <SortablePhotoGrid photos={photos} onChange={setPhotos} showCoverBadge />
                </>
              )}
            </TabsContent>

            {/* ROOMS TAB */}
            <TabsContent value="rooms" className="px-6 pb-2 space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {roomCategories.length} room {roomCategories.length === 1 ? "category" : "categories"}
                </p>
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => openRoomForm()}>
                  <Plus className="h-3 w-3 mr-1" /> Add Room
                </Button>
              </div>

              {roomCategories.length === 0 && !roomFormOpen && (
                <div className="text-center py-8 text-muted-foreground">
                  <BedDouble className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No room categories yet</p>
                  <p className="text-xs mt-1">Add rooms like Deluxe, Suite, Standard etc.</p>
                </div>
              )}

              {roomCategories.map((room, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-card space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm truncate">{room.name}</span>
                        {room.id && <Badge variant="outline" className="text-[9px] shrink-0">Saved</Badge>}
                        {!room.id && <Badge variant="secondary" className="text-[9px] shrink-0">New</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{room.max_guests} guests</span>
                        <span>{room.available} available</span>
                        <span className="font-medium text-foreground">
                          ₹{room.price.toLocaleString("en-IN")}
                          {room.original_price > room.price && (
                            <span className="line-through text-muted-foreground ml-1">₹{room.original_price.toLocaleString("en-IN")}</span>
                          )}
                        </span>
                      </div>
                      {room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {room.amenities.slice(0, 5).map(a => (
                            <Badge key={a} variant="secondary" className="text-[9px] font-normal">{a}</Badge>
                          ))}
                          {room.amenities.length > 5 && (
                            <Badge variant="secondary" className="text-[9px] font-normal">+{room.amenities.length - 5}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openRoomForm(idx)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeRoom(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {room.images.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      {room.images.slice(0, 5).map((img, imgIdx) => (
                        <div key={imgIdx} className="w-12 h-9 rounded border overflow-hidden shrink-0 bg-muted">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {room.images.length > 5 && (
                        <div className="w-12 h-9 rounded border bg-muted flex items-center justify-center shrink-0">
                          <span className="text-[9px] text-muted-foreground font-medium">+{room.images.length - 5}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {roomFormOpen && (
                <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
                  <p className="text-sm font-semibold">{editingRoomIdx !== null ? "Edit Room Category" : "New Room Category"}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium">Room Name *</label>
                      <Input
                        value={roomForm.name}
                        onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                        placeholder="e.g. Deluxe Double, Suite, Standard"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Price (₹) *</label>
                      <Input
                        type="number"
                        value={roomForm.price || ""}
                        onChange={e => setRoomForm({ ...roomForm, price: Number(e.target.value) })}
                        placeholder="0"
                        className="mt-1 h-8 text-sm"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Original Price (₹)</label>
                      <Input
                        type="number"
                        value={roomForm.original_price || ""}
                        onChange={e => setRoomForm({ ...roomForm, original_price: Number(e.target.value) })}
                        placeholder="0"
                        className="mt-1 h-8 text-sm"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Max Guests</label>
                      <Input
                        type="number"
                        value={roomForm.max_guests}
                        onChange={e => setRoomForm({ ...roomForm, max_guests: Number(e.target.value) })}
                        className="mt-1 h-8 text-sm"
                        min={1}
                        max={20}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Available Rooms</label>
                      <Input
                        type="number"
                        value={roomForm.available}
                        onChange={e => setRoomForm({ ...roomForm, available: Number(e.target.value) })}
                        className="mt-1 h-8 text-sm"
                        min={0}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium">Amenities</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {ROOM_AMENITIES.map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleRoomAmenity(a)}
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                            roomForm.amenities.includes(a)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {roomForm.amenities.includes(a) && <Check className="h-2.5 w-2.5 mr-1" />}
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium">Room Photos</label>
                    <div className="mt-1.5 space-y-2">
                      <label
                        className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        {roomPhotoUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <ImagePlus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {roomPhotoUploading ? "Uploading..." : "Upload room photos"}
                        </span>
                        <input
                          ref={roomPhotoRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={roomPhotoUploading}
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            setRoomPhotoUploading(true);
                            const newUrls: string[] = [];
                            for (const rawFile of Array.from(files)) {
                              const file = await compressImage(rawFile, "room");
                              const ext = file.name.split(".").pop();
                              const path = `rooms/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                              const { error } = await supabase.storage.from("stay-images").upload(path, file);
                              if (!error) {
                                const { data: urlData } = supabase.storage.from("stay-images").getPublicUrl(path);
                                newUrls.push(urlData.publicUrl);
                              }
                            }
                            setRoomForm(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
                            setRoomPhotoUploading(false);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {roomForm.images.length > 0 && (
                        <>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <GripVertical className="h-2.5 w-2.5" /> Drag to reorder
                          </p>
                          <SortablePhotoGrid
                            photos={roomForm.images}
                            onChange={(imgs) => setRoomForm(prev => ({ ...prev, images: imgs }))}
                            showCoverBadge={false}
                            columns={4}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button type="button" size="sm" className="h-8 text-xs" onClick={saveRoomForm}>
                      {editingRoomIdx !== null ? "Update Room" : "Add Room"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => { setRoomFormOpen(false); setEditingRoomIdx(null); setRoomForm({ ...emptyRoom }); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ADD-ONS TAB */}
            <TabsContent value="addons" className="px-6 pb-2 space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Add bookable extras shown in the booking form</p>
                <button
                  type="button"
                  onClick={() => setAddons(prev => [...prev, { name: "", price: 0, optional: true }])}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" />Add
                </button>
              </div>
              {addons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No add-ons yet</p>
                  <p className="text-xs mt-1">e.g. Dinner, Airport Pickup, Local Guide</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {addons.map((addon, i) => (
                    <div key={i} className="border rounded-xl p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={addon.name}
                          onChange={(e) => setAddons(prev => prev.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a))}
                          placeholder="Add-on name (e.g. Dinner)"
                          className="flex-1 text-sm bg-background border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          type="number"
                          value={addon.price}
                          min={0}
                          onChange={(e) => setAddons(prev => prev.map((a, idx) => idx === i ? { ...a, price: Number(e.target.value) } : a))}
                          placeholder="₹ Price"
                          className="w-24 text-sm bg-background border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const id = addons[i].id;
                            if (id) setDeletedAddonIds(prev => [...prev, id]);
                            setAddons(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={addon.optional}
                          onCheckedChange={(v) => setAddons(prev => prev.map((a, idx) => idx === i ? { ...a, optional: v } : a))}
                          id={`addon-optional-${i}`}
                        />
                        <label htmlFor={`addon-optional-${i}`} className="text-xs text-muted-foreground cursor-pointer">
                          {addon.optional ? "Optional (guest can choose)" : "Mandatory (always included)"}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* REELS TAB */}
            <TabsContent value="reels" className="px-6 pb-2 space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Add video reels from YouTube, Instagram, etc.</p>
                <Button type="button" size="sm" variant="outline" onClick={addReel}><Plus className="h-4 w-4 mr-1" />Add Reel</Button>
              </div>
              {reels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Film className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No reels added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reels.map((reel, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                      <button type="button" onClick={() => removeReel(i)} className="absolute top-2 right-2 text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={reel.title} onChange={(e) => updateReel(i, "title", e.target.value)} placeholder="Reel title" />
                        <Select value={reel.platform} onValueChange={(v) => updateReel(i, "platform", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input value={reel.url} onChange={(e) => updateReel(i, "url", e.target.value)} placeholder="Video URL" />
                      <Input value={reel.thumbnail} onChange={(e) => updateReel(i, "thumbnail", e.target.value)} placeholder="Thumbnail image URL" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* NEARBY TAB */}
            <TabsContent value="nearby" className="px-6 pb-2 space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Add nearby attractions & destinations</p>
                <Button type="button" size="sm" variant="outline" onClick={addNearby}><Plus className="h-4 w-4 mr-1" />Add Place</Button>
              </div>
              {nearby.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No nearby places added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nearby.map((place, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                      <button type="button" onClick={() => removeNearby(i)} className="absolute top-2 right-2 text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={place.name} onChange={(e) => updateNearby(i, "name", e.target.value)} placeholder="Place name" />
                        <Input value={place.distance} onChange={(e) => updateNearby(i, "distance", e.target.value)} placeholder="e.g. 5 km" />
                      </div>
                      <Input value={place.image} onChange={(e) => updateNearby(i, "image", e.target.value)} placeholder="Image URL" />
                      <Input value={place.maps_link} onChange={(e) => updateNearby(i, "maps_link", e.target.value)} placeholder="Google Maps link" />
                      <Textarea value={place.description} onChange={(e) => updateNearby(i, "description", e.target.value)} placeholder="About this place..." rows={3} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* REVIEWS TAB */}
            <TabsContent value="reviews" className="px-6 pb-2 space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">Add guest reviews for this stay</p>
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={newReview.guest_name} onChange={(e) => setNewReview({ ...newReview, guest_name: e.target.value })} placeholder="Guest name" />
                  <Select value={String(newReview.rating)} onValueChange={(v) => setNewReview({ ...newReview, rating: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={String(r)}>{r} ★</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea value={newReview.comment} onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })} placeholder="Review text..." rows={2} />
                <Button type="button" size="sm" onClick={addReview} disabled={!newReview.guest_name || !newReview.comment}>
                  <Plus className="h-4 w-4 mr-1" />Add Review
                </Button>
              </div>
              {reviews.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reviews.map((review, i) => (
                    <div key={i} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{review.guest_name}</span>
                          <Badge variant="secondary" className="text-[10px]">{review.rating} ★</Badge>
                          {review.id && <Badge variant="outline" className="text-[10px]">Saved</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{review.comment}</p>
                      </div>
                      {!review.id && (
                        <button type="button" onClick={() => removeReview(i)} className="text-destructive hover:text-destructive/80 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* SEO TAB */}
            <TabsContent value="seo" className="px-6 pb-2 space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">Meta tags and Open Graph for search and social sharing</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">SEO Title</label>
                  <Input
                    value={seo.seo_title}
                    onChange={(e) => setSeo({ ...seo, seo_title: e.target.value })}
                    placeholder={form.name ? `Defaults to "${form.name}"` : "Defaults to stay name"}
                    maxLength={70}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">{seo.seo_title.length}/70 (recommended 50-60)</p>
                </div>
                <div>
                  <label className="text-sm font-medium">SEO Description</label>
                  <Textarea
                    value={seo.seo_description}
                    onChange={(e) => setSeo({ ...seo, seo_description: e.target.value })}
                    placeholder={form.description ? "Defaults to stay description" : "Brief description for search results"}
                    maxLength={160}
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">{seo.seo_description.length}/160</p>
                </div>
                <div>
                  <label className="text-sm font-medium">SEO Keywords</label>
                  <Input
                    value={seo.seo_keywords}
                    onChange={(e) => setSeo({ ...seo, seo_keywords: e.target.value })}
                    placeholder="resort, wayanad, pool, luxury..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">OG Image</label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">Recommended: 1200x630 px (1.91:1)</p>
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    {seo.og_image_url ? (
                      <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden border bg-muted min-h-[120px] w-full max-w-[280px] aspect-[1.91/1] flex items-center justify-center">
                          {ogImageError ? (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs p-3 text-center">
                              <Image className="h-8 w-8 opacity-50" />
                              <span>Image failed to load</span>
                            </div>
                          ) : (
                            <img
                              src={seo.og_image_url}
                              alt="OG preview"
                              className="w-full h-full object-cover"
                              onLoad={(e) => setOgImageSize(`${e.currentTarget.naturalWidth}x${e.currentTarget.naturalHeight} px`)}
                              onError={() => setOgImageError(true)}
                            />
                          )}
                          {ogImageSize && !ogImageError && (
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                              {ogImageSize}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => ogInputRef.current?.click()}
                            disabled={uploadingOg}
                          >
                            {uploadingOg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploadingOg ? " Uploading..." : " Change"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setSeo({ ...seo, og_image_url: "" })}>Remove</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => ogInputRef.current?.click()}
                        disabled={uploadingOg}
                        className="w-full"
                      >
                        {uploadingOg ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                        {uploadingOg ? "Uploading..." : "Upload image"}
                      </Button>
                    )}
                    <input
                      ref={ogInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const rawFile = e.target.files?.[0];
                        if (!rawFile) return;
                        setUploadingOg(true);
                        try {
                          const file = await compressImage(rawFile, "og");
                          const ext = file.name.split(".").pop() || "jpg";
                          const path = `stays/og-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                          const { error } = await supabase.storage.from("stay-images").upload(path, file, { upsert: true });
                          if (error) throw error;
                          const { data } = supabase.storage.from("stay-images").getPublicUrl(path);
                          setSeo({ ...seo, og_image_url: data.publicUrl });
                          setOgImageError(false);
                          toast({ title: "OG image uploaded" });
                        } catch (err: any) {
                          toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                        }
                        setUploadingOg(false);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Google Preview</p>
                  <div className="text-sm">
                    <p className="text-blue-600 truncate hover:underline cursor-pointer">
                      {seo.seo_title || form.name || "Stay Name"} | Site
                    </p>
                    <p className="text-green-700 text-xs mt-0.5">https://yoursite.com/stay/...</p>
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      {seo.seo_description || form.description?.slice(0, 155) || "Stay description..."}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer buttons */}
          <div className="px-6 py-4 border-t bg-muted/30 space-y-2">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1 mb-1">
              {TAB_ORDER.map((tab, i) => (
                <div
                  key={tab}
                  className={`h-1.5 rounded-full transition-all ${
                    i === tabIdx ? "w-6 bg-primary" : i < tabIdx ? "w-3 bg-primary/40" : "w-3 bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {isFirstTab ? (
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {(!stay || stay?.status === "draft") && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => saveStay("draft")}
                  disabled={savingDraft || loading}
                  className="px-3"
                  title="Save as draft"
                >
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              )}
              {isLastTab ? (
                <Button type="submit" disabled={loading || savingDraft} className="flex-1">
                  {loading ? "Saving..." : stay ? "Update Stay" : "Create Stay"}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext} disabled={loading} className="flex-1">
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
