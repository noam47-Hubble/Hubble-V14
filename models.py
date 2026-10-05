"""
Hubble v14 — data models.

Identity: a persistent browser cookie (device_id) maps to a User; registering
attaches a name + phone/email so the same person can log in from another device.

Cards hold the personal details a user chooses to expose. Every field has an
independent "visible" flag. The name field is mandatory; if the owner hides both
name and nickname the card is shown as "צופה" (viewer) and is read-only.
"""

import random
import string
import time
import uuid

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

VIEWER_NAME = "צופה"


def gen_id():
    return str(uuid.uuid4())


def gen_sync_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def gen_hub_serial():
    return "".join(random.choices(string.digits, k=4))


def gen_presence_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=5))


class User(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    device_id = db.Column(db.String, unique=True, nullable=False, index=True)
    sync_code = db.Column(db.String, unique=True, nullable=False, default=gen_sync_code, index=True)
    created_at = db.Column(db.Float, default=time.time)
    reg_name = db.Column(db.String, default="")
    email = db.Column(db.String, unique=True, nullable=True, index=True)
    phone = db.Column(db.String, unique=True, nullable=True, index=True)

    cards = db.relationship("Card", backref="user", lazy=True, cascade="all, delete-orphan")

    def is_registered(self):
        return bool(self.email or self.phone)


# (field, visible-by-default) — the visibility flag column is f"{field}_visible"
CARD_FIELDS = [
    ("name", True), ("nickname", False), ("title", True), ("company", True),
    ("phone", False), ("email", False), ("website", False), ("card_image", False),
    ("linkedin", False), ("instagram", False), ("tiktok", False), ("other_social", False),
    ("bio", False),
]
CARD_FIELD_NAMES = [f for f, _ in CARD_FIELDS]


class Card(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    card_type = db.Column(db.String, nullable=False)  # 'business' | 'social'
    is_active = db.Column(db.Boolean, default=False)
    is_open_to_contact = db.Column(db.Boolean, default=True)
    card_name = db.Column(db.String, default="")  # private label shown only in "My cards"
    degree = db.Column(db.String, default="")     # honorific/degree shown before the name
    photo_url = db.Column(db.Text, default="")
    created_at = db.Column(db.Float, default=time.time)

    name = db.Column(db.String, default="")
    name_visible = db.Column(db.Boolean, default=True)
    nickname = db.Column(db.String, default="")
    nickname_visible = db.Column(db.Boolean, default=False)
    title = db.Column(db.String, default="")
    title_visible = db.Column(db.Boolean, default=True)
    company = db.Column(db.String, default="")
    company_visible = db.Column(db.Boolean, default=True)
    phone = db.Column(db.String, default="")
    phone_visible = db.Column(db.Boolean, default=False)
    email = db.Column(db.String, default="")
    email_visible = db.Column(db.Boolean, default=False)
    website = db.Column(db.String, default="")
    website_visible = db.Column(db.Boolean, default=False)
    card_image = db.Column(db.Text, default="")
    card_image_visible = db.Column(db.Boolean, default=False)
    linkedin = db.Column(db.String, default="")
    linkedin_visible = db.Column(db.Boolean, default=False)
    instagram = db.Column(db.String, default="")
    instagram_visible = db.Column(db.Boolean, default=False)
    tiktok = db.Column(db.String, default="")
    tiktok_visible = db.Column(db.Boolean, default=False)
    other_social = db.Column(db.String, default="")
    other_social_visible = db.Column(db.Boolean, default=False)
    bio = db.Column(db.String, default="")   # key sentence ("משפט מפתח")
    bio_visible = db.Column(db.Boolean, default=False)

    photos = db.relationship("CardPhoto", backref="card", lazy=True, cascade="all, delete-orphan")

    # ---- identity helpers -------------------------------------------------
    def shows_identity(self):
        """True if the card exposes a name or nickname to others."""
        return bool((self.name_visible and self.name) or (self.nickname_visible and self.nickname))

    def display_name(self):
        if self.name_visible and self.name:
            return (self.degree + " " if self.degree else "") + self.name
        if self.nickname_visible and self.nickname:
            return self.nickname
        return VIEWER_NAME

    def is_viewer(self):
        return not self.shows_identity()

    def effective_open(self):
        """Open to communication — a viewer card is always treated as closed."""
        return bool(self.is_open_to_contact) and not self.is_viewer()

    def profile_photo(self):
        p = next((p.url for p in self.photos if p.is_profile_photo and p.is_visible), None)
        return p or ""

    def public_dict(self):
        out = {
            "id": self.id, "type": self.card_type,
            "photo_url": self.profile_photo(),
            "photos": [p.url for p in sorted(self.photos, key=lambda p: p.order) if p.is_visible],
            "display_name": self.display_name(),
            "is_viewer": self.is_viewer(),
        }
        for f in CARD_FIELD_NAMES:
            if getattr(self, f + "_visible") and getattr(self, f):
                out[f] = getattr(self, f)
        if "name" in out and self.degree:
            out["degree"] = self.degree
        return out

    def full_dict(self):
        out = {
            "id": self.id, "type": self.card_type, "is_active": self.is_active,
            "card_name": self.card_name, "degree": self.degree,
            "is_open_to_contact": self.is_open_to_contact,
            "effective_open": self.effective_open(), "is_viewer": self.is_viewer(),
            "display_name": self.display_name(),
            "photo_url": self.profile_photo() or self.photo_url,
            "photos": [{"id": p.id, "url": p.url, "is_visible": p.is_visible, "is_profile_photo": p.is_profile_photo}
                       for p in sorted(self.photos, key=lambda p: p.order)],
        }
        for f in CARD_FIELD_NAMES:
            out[f] = getattr(self, f)
            out[f + "_visible"] = getattr(self, f + "_visible")
        return out


class CardPhoto(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    card_id = db.Column(db.String, db.ForeignKey("card.id"), nullable=False)
    url = db.Column(db.Text, nullable=False)
    is_visible = db.Column(db.Boolean, default=True)
    is_profile_photo = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.Float, default=time.time)


class Hub(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    owner_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    owner_card_id = db.Column(db.String, db.ForeignKey("card.id"), nullable=True)

    name = db.Column(db.String, nullable=False)
    serial = db.Column(db.String, unique=True, nullable=True, index=True)
    hub_type = db.Column(db.String, default="social")  # 'social' | 'business' | 'professional'
    description = db.Column(db.String, default="")

    tagline = db.Column(db.String, default="")
    location = db.Column(db.String, default="")
    event_dates = db.Column(db.String, default="")
    logo_url = db.Column(db.Text, default="")
    tagline_visible = db.Column(db.Boolean, default=True)
    location_visible = db.Column(db.Boolean, default=True)
    event_dates_visible = db.Column(db.Boolean, default=True)
    logo_visible = db.Column(db.Boolean, default=True)
    organizer_names = db.Column(db.String, default="")
    organizer_names_visible = db.Column(db.Boolean, default=True)

    auto_approve = db.Column(db.Boolean, default=True)
    send_approval_msg = db.Column(db.Boolean, default=True)
    template_id = db.Column(db.String, default="corporate_classic")
    is_published = db.Column(db.Boolean, default=True)

    # physical-presence verification (owner chooses): none | location | code | both
    presence_mode = db.Column(db.String, default="none")
    loc_lat = db.Column(db.Float, nullable=True)
    loc_lng = db.Column(db.Float, nullable=True)
    loc_radius = db.Column(db.Integer, default=150)  # meters
    presence_code = db.Column(db.String, default=gen_presence_code)
    owner_public_ip = db.Column(db.String, default="")

    background_image_url = db.Column(db.Text, default="")
    is_open = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.Float, default=time.time)

    def public_dict(self, owner_card=None):
        return {
            "hub_id": self.id, "name": self.name, "serial": self.serial, "hub_type": self.hub_type,
            "description": self.description,
            "tagline": self.tagline, "location": self.location, "event_dates": self.event_dates,
            "logo_url": self.logo_url, "organizer_names": self.organizer_names,
            "tagline_visible": self.tagline_visible, "location_visible": self.location_visible,
            "event_dates_visible": self.event_dates_visible, "logo_visible": self.logo_visible,
            "organizer_names_visible": self.organizer_names_visible,
            "auto_approve": self.auto_approve, "send_approval_msg": self.send_approval_msg,
            "template_id": self.template_id, "is_published": self.is_published,
            "owner_user_id": self.owner_user_id,
            "owner_name": owner_card.display_name() if owner_card else "",
            "is_open": self.is_open, "background_image_url": self.background_image_url,
            "presence_mode": self.presence_mode, "loc_lat": self.loc_lat, "loc_lng": self.loc_lng,
            "loc_radius": self.loc_radius,
        }


class HubBlock(db.Model):
    """Optional content field on a hub ('שדה רשות'): text / image / video link / link."""
    id = db.Column(db.String, primary_key=True, default=gen_id)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=False)
    category = db.Column(db.String, default="other")  # incl. 'open' = open window for users
    title = db.Column(db.String, default="")
    content = db.Column(db.Text, default="")
    image_url = db.Column(db.Text, default="")
    video_url = db.Column(db.String, default="")
    link_url = db.Column(db.String, default="")
    is_default = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)
    is_visible = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.Float, default=time.time)

    def public_dict(self):
        return {
            "id": self.id, "category": self.category, "title": self.title, "content": self.content,
            "image_url": self.image_url, "video_url": self.video_url, "link_url": self.link_url,
            "is_default": self.is_default, "order": self.order, "is_visible": self.is_visible,
        }


class HubOpenPost(db.Model):
    """Post in an 'open window for users' block."""
    id = db.Column(db.String, primary_key=True, default=gen_id)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=False)
    block_id = db.Column(db.String, db.ForeignKey("hub_block.id"), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    card_id = db.Column(db.String, db.ForeignKey("card.id"), nullable=False)
    text = db.Column(db.Text, default="")
    image_url = db.Column(db.Text, default="")
    video_url = db.Column(db.String, default="")
    ts = db.Column(db.Float, default=time.time)


class Favorite(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=False)


class HubPresence(db.Model):
    """A person's membership + live state in a hub (roster entry)."""
    id = db.Column(db.String, primary_key=True, default=gen_id)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    card_id = db.Column(db.String, db.ForeignKey("card.id"), nullable=False)
    status = db.Column(db.String, default="green")  # 'green' open | 'red' closed
    is_physical = db.Column(db.Boolean, default=False)
    physical_ts = db.Column(db.Float, default=0.0)   # last successful location/code verification
    is_live = db.Column(db.Boolean, default=True)
    approval_status = db.Column(db.String, default="approved")  # 'pending' | 'approved'
    joined_at = db.Column(db.Float, default=time.time)
    last_seen = db.Column(db.Float, default=time.time)


class HubBan(db.Model):
    """Owner blocked this user from the hub (even if never registered)."""
    id = db.Column(db.String, primary_key=True, default=gen_id)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    reason = db.Column(db.String, default="")
    ts = db.Column(db.Float, default=time.time)


class BoardMessage(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=False)
    sender_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    sender_card_id = db.Column(db.String, db.ForeignKey("card.id"), nullable=False)
    text = db.Column(db.Text, default="")
    image_url = db.Column(db.Text, default="")
    pinned_until = db.Column(db.Float, default=0.0)
    ts = db.Column(db.Float, default=time.time)


class PrivateMessage(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=True)
    from_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    to_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    text = db.Column(db.Text, default="")
    image_url = db.Column(db.Text, default="")
    kind = db.Column(db.String, default="normal")  # normal | group | system
    group_name = db.Column(db.String, default="")  # kind == group: shown instead of sender name
    sender_name = db.Column(db.String, default="")  # snapshot of sender display name
    card_snapshot = db.Column(db.JSON, default=dict)  # sender's visible card at send time
    hub_name = db.Column(db.String, default="")
    hub_link_id = db.Column(db.String, nullable=True)  # invitation: clicking opens this hub
    is_read = db.Column(db.Boolean, default=False)
    ts = db.Column(db.Float, default=time.time, index=True)


class ContactGroup(db.Model):
    id = db.Column(db.String, primary_key=True, default=gen_id)
    owner_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String, nullable=False)
    created_at = db.Column(db.Float, default=time.time)


class ContactShare(db.Model):
    """A saved contact: the other person's card as it was visible at save time."""
    id = db.Column(db.String, primary_key=True, default=gen_id)
    owner_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    from_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    hub_id = db.Column(db.String, db.ForeignKey("hub.id"), nullable=True)
    hub_name_snapshot = db.Column(db.String, default="")
    card_snapshot = db.Column(db.JSON, default=dict)
    note = db.Column(db.Text, default="")
    ts = db.Column(db.Float, default=time.time)


class ContactGroupMember(db.Model):
    """A contact may belong to several groups."""
    id = db.Column(db.String, primary_key=True, default=gen_id)
    group_id = db.Column(db.String, db.ForeignKey("contact_group.id"), nullable=False)
    contact_id = db.Column(db.String, db.ForeignKey("contact_share.id"), nullable=False)
