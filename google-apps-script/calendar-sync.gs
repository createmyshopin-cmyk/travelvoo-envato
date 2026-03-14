/**
 * STAY — Google Calendar Sync
 * ───────────────────────────
 * Deploy this script as a Google Apps Script Web App:
 *   Deploy → New Deployment → Web App
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Required Script Properties (Project Settings → Script Properties):
 *   CALENDAR_ID      — Your Google Calendar ID (e.g. abc123@group.calendar.google.com)
 *   SUPABASE_URL     — Your Supabase project URL (e.g. https://xxxx.supabase.co)
 *   SUPABASE_ANON_KEY — Your Supabase anon/public key
 *
 * The admin dashboard calls this webhook via the "Google Cal" button on /admin/calendar.
 * Payload: { stay_id, stay_name, entries: [{ date, price, original_price, is_blocked, available, min_nights }] }
 */

// ── Entry Point ───────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var stayId = payload.stay_id;
    var stayName = payload.stay_name || "Stay";
    var entries = payload.entries || [];

    syncEntriesToCalendar(stayId, stayName, entries);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, synced: entries.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow simple GET to verify deployment is alive
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "STAY Calendar Sync" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Core Sync Logic ───────────────────────────────────────────────────────────

function syncEntriesToCalendar(stayId, stayName, entries) {
  var calendarId = PropertiesService.getScriptProperties().getProperty("CALENDAR_ID");
  var cal = CalendarApp.getCalendarById(calendarId);
  if (!cal) throw new Error("Calendar not found. Check CALENDAR_ID script property.");

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var dateStr = entry.date; // "yyyy-MM-dd"
    var dateParts = dateStr.split("-");
    var year = parseInt(dateParts[0]);
    var month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
    var day = parseInt(dateParts[2]);
    var eventDate = new Date(year, month, day);

    // Build event title and description
    var title, description, color;
    if (entry.is_blocked) {
      title = "\u26D4 BLOCKED: " + stayName;
      description = "Date blocked by admin.";
      color = CalendarApp.EventColor.RED;
    } else {
      var price = entry.price || 0;
      var originalPrice = entry.original_price || 0;
      title = "\uD83C\uDFE1 " + stayName + " \u2014 \u20B9" + price.toLocaleString("en-IN");
      description = "Price: \u20B9" + price;
      if (originalPrice > 0 && originalPrice !== price) {
        description += " (was \u20B9" + originalPrice + ")";
      }
      if (entry.min_nights > 1) {
        description += "\nMin nights: " + entry.min_nights;
      }
      description += "\nAvailable: " + entry.available;
      color = CalendarApp.EventColor.GREEN;
    }

    // Check for existing event with matching private property
    var existing = findExistingEvent(cal, eventDate, stayId, dateStr);

    if (entry.is_blocked || (entry.available !== undefined && entry.available <= 0)) {
      // If date is blocked/unavailable and event exists, delete it and create blocked event
      if (existing) existing.deleteEvent();
      var blocked = cal.createAllDayEvent(title, eventDate);
      blocked.setDescription(description);
      blocked.setColor(color);
      setEventProps(blocked, stayId, dateStr);
    } else if (existing) {
      // Update existing event
      existing.setTitle(title);
      existing.setDescription(description);
      existing.setColor(color);
    } else {
      // Create new event
      var created = cal.createAllDayEvent(title, eventDate);
      created.setDescription(description);
      created.setColor(color);
      setEventProps(created, stayId, dateStr);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findExistingEvent(cal, date, stayId, dateStr) {
  var endDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  var events = cal.getEvents(date, endDate);
  var key = stayId + "_" + dateStr;
  for (var i = 0; i < events.length; i++) {
    try {
      var props = events[i].getAllTagKeys();
      if (props.indexOf("stay_date_key") !== -1 && events[i].getTag("stay_date_key") === key) {
        return events[i];
      }
    } catch (e) { /* ignore */ }
  }
  return null;
}

function setEventProps(event, stayId, dateStr) {
  event.setTag("stay_date_key", stayId + "_" + dateStr);
  event.setTag("stay_id", stayId);
  event.setTag("date", dateStr);
}

// ── Reverse Sync: Google Calendar → Supabase ─────────────────────────────────
// Fires automatically when any event in the calendar is created/edited/deleted.
// Setup:
//   Triggers → Add Trigger → Function: onCalendarChange
//   Event source: From calendar → Calendar updated → select your calendar

function onCalendarChange() {
  var props = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty("SUPABASE_URL");
  var supabaseKey = props.getProperty("SUPABASE_ANON_KEY");
  // Service role key bypasses RLS — required for writes (GAS has no user session)
  var serviceKey = props.getProperty("SUPABASE_SERVICE_KEY");
  var calendarId = props.getProperty("CALENDAR_ID");
  if (!supabaseUrl || !supabaseKey || !serviceKey || !calendarId) {
    Logger.log("Missing script property. Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, CALENDAR_ID");
    return;
  }

  var cal = CalendarApp.getCalendarById(calendarId);
  if (!cal) { Logger.log("ERROR: Calendar not found for ID: " + calendarId); return; }

  // Scan from 7 days ago up to 2 years ahead (catches recently edited past/today events)
  var now = new Date();
  var past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  var future = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  var events = cal.getEvents(past, future);
  Logger.log("onCalendarChange: scanning " + events.length + " events");

  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var stayId = null;
    var dateStr = null;

    try {
      stayId = event.getTag("stay_id");
      dateStr = event.getTag("date");
    } catch (e) { continue; }

    if (!stayId || !dateStr) {
      Logger.log("SKIP (no tags): " + event.getTitle());
      continue;
    }

    var title = event.getTitle();
    var isBlocked = title.indexOf("BLOCKED") !== -1;
    Logger.log("Processing: " + title + " | date=" + dateStr + " | stay=" + stayId);

    // Parse price from title: "🏡 Stay Name — ₹2,500"
    var price = 0;
    var priceMatch = title.match(/₹([\d,]+)/);
    if (priceMatch) {
      price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    }

    // Read with anon key (public SELECT policy allows it)
    var checkResp = UrlFetchApp.fetch(
      supabaseUrl + "/rest/v1/calendar_pricing?stay_id=eq." + stayId + "&date=eq." + dateStr + "&select=id,price,is_blocked",
      { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
    );
    var existing = JSON.parse(checkResp.getContentText());

    var body = JSON.stringify({ price: price, is_blocked: isBlocked });

    if (existing && existing.length > 0) {
      // Skip if nothing changed
      if (existing[0].price === price && existing[0].is_blocked === isBlocked) continue;
      // PATCH with service key — bypasses RLS
      UrlFetchApp.fetch(
        supabaseUrl + "/rest/v1/calendar_pricing?stay_id=eq." + stayId + "&date=eq." + dateStr,
        {
          method: "PATCH",
          headers: {
            "apikey": serviceKey,
            "Authorization": "Bearer " + serviceKey,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          payload: body,
        }
      );
      Logger.log("Updated " + dateStr + " price=" + price + " blocked=" + isBlocked);
    } else if (!isBlocked && price > 0) {
      // POST with service key — bypasses RLS
      UrlFetchApp.fetch(
        supabaseUrl + "/rest/v1/calendar_pricing",
        {
          method: "POST",
          headers: {
            "apikey": serviceKey,
            "Authorization": "Bearer " + serviceKey,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          payload: JSON.stringify({ stay_id: stayId, date: dateStr, price: price, original_price: price, is_blocked: false, available: 1, min_nights: 1 }),
        }
      );
      Logger.log("Inserted " + dateStr + " price=" + price);
    }
  }
}

// ── Optional: Time-Driven Auto-Sync (Admin → Google Calendar) ────────────────
// If you want automatic push every hour without pressing the button:
//   Triggers → Add Trigger → Function: autoSync → Time-driven → Hour timer → Every hour

function autoSync() {
  var props = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty("SUPABASE_URL");
  var supabaseKey = props.getProperty("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseKey) return;

  // Fetch all stays
  var staysResp = UrlFetchApp.fetch(supabaseUrl + "/rest/v1/stays?select=id,name", {
    headers: {
      "apikey": supabaseKey,
      "Authorization": "Bearer " + supabaseKey,
    },
  });
  var stays = JSON.parse(staysResp.getContentText());

  for (var i = 0; i < stays.length; i++) {
    var stay = stays[i];
    // Fetch pricing for this stay
    var pricingResp = UrlFetchApp.fetch(
      supabaseUrl + "/rest/v1/calendar_pricing?stay_id=eq." + stay.id + "&select=date,price,original_price,is_blocked,available,min_nights",
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
        },
      }
    );
    var entries = JSON.parse(pricingResp.getContentText());
    syncEntriesToCalendar(stay.id, stay.name, entries);
  }
}
