# Zebra DataWedge Setup

1. Copy the provided profile database from `app/profiles/datawedge_profile.db` to the device storage.
2. On the Zebra handheld, open DataWedge and import the profile.
3. Ensure keystroke output is enabled with ENTER suffix.
4. Associate the profile with Chrome and pin the kiosk URL `https://your-host/kiosk` and receiving URL `/receiving`.
5. Test by scanning an item barcode in the kiosk search field. The field auto-focuses and ENTER submits.
