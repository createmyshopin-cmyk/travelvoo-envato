import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Filter, Mail, Phone, RefreshCw, UserPlus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type LeadStatus = "new" | "contacted" | "converted" | "lost";

interface LeadRow {
  id: string;
  tenant_id: string | null;
  source: string;
  full_name: string;
  phone: string;
  email: string;
  message: string;
  status: LeadStatus;
  created_at: string;
}

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-200",
  contacted: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  converted: "bg-green-500/10 text-green-700 border-green-300",
  lost: "bg-gray-500/10 text-gray-600 border-gray-300",
};

export default function AdminLeads() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");

  const fetchLeads = async () => {
    setLoading(true);
    const { data: myTenant } = await supabase.rpc("get_my_tenant_id");
    if (!myTenant) {
      setLeads([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("tenant_id", myTenant)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading leads", description: error.message, variant: "destructive" });
      setLeads([]);
    } else {
      setLeads((data || []) as LeadRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const statusOk = statusFilter === "all" ? true : lead.status === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      return (
        lead.full_name.toLowerCase().includes(q) ||
        (lead.email || "").toLowerCase().includes(q) ||
        (lead.phone || "").toLowerCase().includes(q) ||
        (lead.message || "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
    if (error) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    toast({ title: "Status updated" });
  };

  const copyValue = async (value: string, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Leads
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Leads captured from popup templates on your landing page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Total Leads</p>
            <p className="text-lg font-bold">{leads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">New</p>
            <p className="text-lg font-bold">{leads.filter((l) => l.status === "new").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Contacted</p>
            <p className="text-lg font-bold">
              {leads.filter((l) => l.status === "contacted").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Converted</p>
            <p className="text-lg font-bold">
              {leads.filter((l) => l.status === "converted").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or message..."
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v: "all" | LeadStatus) => setStatusFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading leads...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(lead.created_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{lead.full_name}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{lead.phone || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span>{lead.email || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs">
                      {lead.message ? (
                        <span className="line-clamp-2">{lead.message}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[11px]">
                        {lead.source || "popup"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] border ${statusStyles[lead.status]}`}
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Select
                        value={lead.status}
                        onValueChange={(v: LeadStatus) => updateStatus(lead.id, v)}
                      >
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => copyValue(lead.phone, "Phone")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => copyValue(lead.email, "Email")}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

