import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ImageIcon, Trash2, Plus, Search, RefreshCw } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  alt_text: string;
  category: string;
  stay_id: string | null;
  created_at: string;
}

const CATEGORIES = ["general", "stay", "room", "amenity", "banner"];

const AdminMediaGallery = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  useEffect(() => { fetchMedia(); }, []);

  const fetchMedia = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });
    setMedia((data as MediaItem[]) || []);
    setLoading(false);
  };

  const addMedia = async () => {
    if (!newUrl.trim()) return;
    const { error } = await supabase.from("media").insert({
      url: newUrl.trim(),
      alt_text: newAlt.trim(),
      category: newCategory,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewUrl("");
      setNewAlt("");
      setNewCategory("general");
      fetchMedia();
      toast({ title: "Media added" });
    }
  };

  const deleteMedia = async (id: string) => {
    await supabase.from("media").delete().eq("id", id);
    fetchMedia();
    toast({ title: "Media deleted" });
  };

  const filtered = media.filter((m) => {
    const matchCat = filter === "all" || m.category === filter;
    const matchSearch = !search || m.alt_text.toLowerCase().includes(search.toLowerCase()) || m.url.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-primary" /> Media Gallery
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage images and media assets</p>
      </div>

      {/* Add Media */}
      <Card>
        <CardHeader><CardTitle className="text-base">Add Media</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Image URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="flex-1" />
            <Input placeholder="Alt text" value={newAlt} onChange={(e) => setNewAlt(e.target.value)} className="flex-1" />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addMedia}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search media..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Gallery Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <div key={m.id} className="group relative rounded-lg overflow-hidden border border-border bg-muted aspect-square">
              <img src={m.url} alt={m.alt_text} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <Badge variant="secondary" className="text-[10px]">{m.category}</Badge>
                {m.alt_text && <p className="text-white text-xs text-center truncate w-full">{m.alt_text}</p>}
                <Button size="sm" variant="destructive" onClick={() => deleteMedia(m.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No media found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminMediaGallery;
