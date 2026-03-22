# Instagram Bot Automations Analysis

I've explored the `/admin/instagram-bot/automations` feature to outline how it operates within the codebase.

## 1. Overall Structure
The main user interface is housed in **[src/spa-pages/admin/InstagramBotAutomations.tsx](file:///d:/travel%20voo%20NEXT%20JS%20FULL%20APP/NEXT%20JS/src/spa-pages/admin/InstagramBotAutomations.tsx)**. It manages automated interactions via four main tabs:
- **Keywords**: Flat "if-this-then-that" reply rules.
- **Posts & Reels**: Automation triggers configured per Instagram media item.
- **Schedule**: Controls for when the bot should be active vs quiet.
- **Flow Builder**: A visual builder for complex interaction flows.

All user permissions are secured at the DB level via row-level security where configurations map to the specific `tenant_id`. Additionally, there is a **Master Switch** that allows an admin to quickly pause or resume the entire Instagram automation pipeline.

## 2. Component Deep Dive

### Keywords Tab
Allows admins to set up flat keyword rules tailored either for Direct Messages (DM), Comments, or Stories.
- **Matching Types**: Supports "contains," "whole word," or "exact" string matching.
- **Actions Available**: The bot can execute various actions, such as `ai_reply`, applying a predefined `template_reply`, sending a link (`send_link`), suppressing the message, or simply passing it to an AI for lead qualification (`qualify_lead_only`).
- **Database Table**: `instagram_automation_keyword_rules`.

### Posts & Reels Tab (Media Targets)
This tab loads the latest media (limit: 50 items) from the connected Instagram/Meta account using the server API route `/api/integrations/instagram/media`. 
- **Graph API Handling**: The route gracefully manages differences in Meta tokens by intelligently choosing the base URL (`graph.instagram.com` vs `graph.facebook.com`) depending on the Instagram Business Account token configuration. This is encapsulated within the [fetchGraph()](file:///d:/travel%20voo%20NEXT%20JS%20FULL%20APP/NEXT%20JS/src/app/api/integrations/instagram/media/route.ts#71-102) utility.
- It displays thumbnails, captions, and the "type" (Reel vs Post vs Carousel).
- Allows toggling **on/off** for comment automations on a per-post basis, storing preferences in `instagram_automation_media_targets`.

### Flow Builder Tab
Uses the `@xyflow/react` library to provide a visual, node-based automation workflow editor (rendered in [src/components/admin/instagram-bot/FlowBuilder.tsx](file:///d:/travel%20voo%20NEXT%20JS%20FULL%20APP/NEXT%20JS/src/components/admin/instagram-bot/FlowBuilder.tsx)).
- **Node Types**: Includes `TriggerNode` (starts flow based on a channel), `ConditionNode` (branch logic like keywords), and `ActionNode` (executes replies / actions).
- **Execution Analytics**: Can load execution statistics and plot simple visual counts over nodes reflecting their usage from the last 7 days (`instagram_flow_executions` table).
- **Draft capabilities**: Flows are explicitly constructed as JSON objects and saved into the `flow_definition` JSONB column in `instagram_automation_flows`. There's an `is_draft` flag that ensures partial flows aren't triggered remotely in production workflows.

## 3. Database Summary
Here are the core Supabase tables anchoring this feature:
- `instagram_automation_config`: Master switches for the automation setup limit to the `tenant_id`.
- `instagram_automation_keyword_rules`: Single-condition flat triggers.
- `instagram_automation_media_targets`: Triggers mapped specifically against a `media_id` returned by the Instagram Graph.
- `instagram_automation_flows`: Complex automation trees with branching.
- `instagram_flow_executions`: Webhook logging array tracking which nodes successfully fired.
