# Hubble v14

Flask + Flask-SocketIO + SQLAlchemy. Hebrew RTL UI, PC (landscape) first with a phone (portrait) layout.

* `app.py` — REST API + Socket.IO (presence, hub boards, live notifications)
* `models.py` — database models
* `templates/index.html`, `static/js/*.js`, `static/style.css` — single-page client (one JS module per screen)
* `tests/test_backend.py` — backend checks (`python3 tests/test_backend.py`)

Screens: login · home · my cards · hub setup (social / business / professional) · hub · hub management · private messages · my contacts & groups.

See `DEPLOY.md` for the deploy/update steps.
