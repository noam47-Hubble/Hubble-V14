# Hubble v14 — deploy / update guide (Render + GitHub)

v14 changes the database schema (new tables and columns), so the **first deploy of v14 needs a one-time database reset**.
All existing demo data (users, cards, hubs, messages) is erased — that is expected for the pilot demo.

## A. Update your existing GitHub repo with v14

1. Unzip `hubble-cloud-v14.zip`. You get a folder `hubble-v14` containing `app.py`, `models.py`, `Procfile`, `requirements.txt`, `static/`, `templates/`.
2. Open your existing local `hubble-cloud` folder (the one connected to GitHub).
3. Delete everything inside it **except** the hidden `.git` folder.
4. Copy the *contents* of `hubble-v14` into it (so `app.py` sits directly in the repo root, next to `Procfile`).
5. In a terminal inside that folder run:
   ```
   git add -A
   git commit -m "Hubble v14"
   git push
   ```
   (If you prefer the GitHub website: open the repo → "Add file" → "Upload files" → drag the files **and** the `static` / `templates` folders → "Commit changes". Upload real files, not the ZIP.)

## B. Reset the database once (Render)

1. Render dashboard → your Web Service → **Environment**.
2. Add a variable: `RESET_DB` = `1` → Save.
3. Go to **Manual Deploy** → **Deploy latest commit**. Wait until the log says the service is live.
4. Open the site once and check that it loads (login screen).
5. Back in **Environment**: **delete** the `RESET_DB` variable (very important — otherwise every future deploy wipes the data) → Save. Render redeploys automatically.

`requirements.txt` is unchanged from v13, no new packages.

## C. Quick test after deploy

1. Open the site on the PC, register, create a social card and a business card.
2. Press the round **+**, choose "מקצועי", fill a name, add one content field and press "צור האב".
3. Open the site on your phone (different browser/device = different user), register, create a card, enter the hub from the list.
4. For physical-presence verification: edit the hub → "אימות נוכחות פיזית" → choose "לפי קוד / QR" → save. Open the management screen to see the code and QR; open the link from the QR on the phone.
   Location-based verification needs HTTPS (Render provides it) and the browser's location permission.

## Local run (optional)

```
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 app.py                  # http://localhost:5050   (SQLite file hubble.db; delete it after schema changes)
```
