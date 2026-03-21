import jsPDF from "jspdf";
import { format } from "date-fns";

function addHeader(doc: jsPDF, title: string, docId: string) {
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("StayFinder", 20, 25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Premium Stays in Wayanad, Kerala", 20, 32);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 140, 25, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(docId, 140, 32, { align: "right" });

  doc.setDrawColor(200);
  doc.line(20, 38, 190, 38);
}

function addField(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(value || "—", x, y + 5);
}

function addPriceSummary(doc: jsPDF, data: any, startY: number) {
  let y = startY;
  doc.setDrawColor(200);
  doc.line(20, y, 190, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Price Summary", 20, y);
  y += 10;

  const rows = [
    ["Room Total", `₹${(data.room_total || 0).toLocaleString("en-IN")}`],
    ["Add-ons", `₹${(data.addons_total || 0).toLocaleString("en-IN")}`],
    ["Discount", `-₹${(data.discount || 0).toLocaleString("en-IN")}`],
  ];

  doc.setFontSize(10);
  rows.forEach(([label, val]) => {
    doc.setFont("helvetica", "normal");
    doc.text(label, 20, y);
    doc.text(val, 190, y, { align: "right" });
    y += 7;
  });

  doc.setDrawColor(100);
  doc.line(120, y - 2, 190, y - 2);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 20, y);
  doc.text(`₹${(data.total_price || 0).toLocaleString("en-IN")}`, 190, y, { align: "right" });

  return y + 15;
}

export function generateQuotationPdf(q: any, stayName: string) {
  const doc = new jsPDF();
  addHeader(doc, "QUOTATION", q.quote_id);

  let y = 50;
  addField(doc, "Guest Name", q.guest_name, 20, y);
  addField(doc, "Phone", q.phone, 110, y);
  y += 16;
  addField(doc, "Stay", stayName, 20, y);
  addField(doc, "Status", q.status?.toUpperCase(), 110, y);
  y += 16;
  addField(doc, "Check-in", q.checkin ? format(new Date(q.checkin), "dd MMM yyyy") : "—", 20, y);
  addField(doc, "Check-out", q.checkout ? format(new Date(q.checkout), "dd MMM yyyy") : "—", 110, y);
  y += 16;

  // Rooms
  const rooms = (q.rooms || []) as any[];
  if (rooms.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Rooms", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    rooms.forEach((r: any) => {
      doc.text(`• ${r.name || "Room"} × ${r.qty || 1} — ₹${(r.price || 0).toLocaleString("en-IN")}`, 24, y);
      y += 6;
    });
    y += 4;
  }

  // Add-ons
  const addons = (q.addons || []) as any[];
  if (addons.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Add-ons", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    addons.forEach((a: any) => {
      doc.text(`• ${a.name || "Add-on"} — ₹${(a.price || 0).toLocaleString("en-IN")}`, 24, y);
      y += 6;
    });
    y += 4;
  }

  y = addPriceSummary(doc, q, y);

  // Special requests
  if (q.special_requests) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(`Special Requests: ${q.special_requests}`, 20, y);
    y += 10;
  }

  // Terms
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Terms & Conditions: This quotation is valid for 7 days. Prices are subject to availability.", 20, y);
  doc.text("Cancellation policy applies as per resort terms.", 20, y + 5);

  doc.save(`${q.quote_id}.pdf`);
}

export function generateInvoicePdf(inv: any, stayName: string) {
  const doc = new jsPDF();
  addHeader(doc, "INVOICE", inv.invoice_id);

  let y = 50;
  addField(doc, "Guest Name", inv.guest_name, 20, y);
  addField(doc, "Phone", inv.phone, 110, y);
  y += 16;
  addField(doc, "Stay", stayName, 20, y);
  addField(doc, "Payment Status", inv.payment_status?.toUpperCase()?.replace("_", " "), 110, y);
  y += 16;
  addField(doc, "Check-in", inv.checkin ? format(new Date(inv.checkin), "dd MMM yyyy") : "—", 20, y);
  addField(doc, "Check-out", inv.checkout ? format(new Date(inv.checkout), "dd MMM yyyy") : "—", 110, y);
  y += 16;
  addField(doc, "Date", format(new Date(inv.created_at), "dd MMM yyyy"), 20, y);
  if (inv.coupon_code) addField(doc, "Coupon", inv.coupon_code, 110, y);
  y += 16;

  const rooms = (inv.rooms || []) as any[];
  if (rooms.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Rooms", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    rooms.forEach((r: any) => {
      doc.text(`• ${r.name || "Room"} × ${r.qty || 1} — ₹${(r.price || 0).toLocaleString("en-IN")}`, 24, y);
      y += 6;
    });
    y += 4;
  }

  const addons = (inv.addons || []) as any[];
  if (addons.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Add-ons", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    addons.forEach((a: any) => {
      doc.text(`• ${a.name || "Add-on"} — ₹${(a.price || 0).toLocaleString("en-IN")}`, 24, y);
      y += 6;
    });
    y += 4;
  }

  y = addPriceSummary(doc, inv, y);

  if (inv.payment_notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(0);
    doc.text(`Payment Notes: ${inv.payment_notes}`, 20, y);
    y += 10;
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Thank you for your booking! For any queries, contact us via WhatsApp.", 20, y);

  doc.save(`${inv.invoice_id}.pdf`);
}
