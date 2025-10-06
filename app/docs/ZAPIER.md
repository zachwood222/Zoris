# Zapier Integrations

The API emits outbound webhooks for ticket finalization, delivery completion, and PO receiving. Configure Zapier by setting the corresponding environment variables with Catch Hook URLs.

Example Zap (Ticket Finalized):
1. Trigger: Webhooks by Zapier (Catch Hook).
2. Filter: Proceed when `total` is greater than zero.
3. Actions:
   - Create Google Drive folder using `drive_folder_hint`.
   - Create QuickBooks Online Sales Receipt (uses the stub unless `QBO_ENABLED=true`).
   - Send SMS via Twilio to notify delivery scheduling.

Inbound Zaps can target `/integrations/zapier/catch` (add custom logic under `app/api/routes/integrations.py`).
