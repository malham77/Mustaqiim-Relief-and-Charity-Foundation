// -----------------------------------------------------------------
// FIREBASE FIRESTORE & AUTH INTEGRATION (Standalone + Vite Compatible)
// Works cleanly on GitHub Pages, static hosting, Vite, and file://.
// Dynamically loads Firebase v13.4.0 ESM from Google's official CDN
// when served over HTTP/HTTPS, with instant local fallback on file://.
// -----------------------------------------------------------------

(function () {
  var FIREBASE_CONFIG = {
    projectId: "amplified-droplet-3c70r",
    appId: "1:470190755765:web:84d4d83124bc17dedc93fc",
    apiKey: "AIzaSyAYBoOb0Z7i9EquXfchficOTx4k0x2b-w8",
    authDomain: "amplified-droplet-3c70r.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-aee37b44-c2a1-4c5e-b072-bdb7c25eacde",
    storageBucket: "amplified-droplet-3c70r.firebasestorage.app",
    messagingSenderId: "470190755765"
  };

  var SDK_VERSION = "13.4.0";
  var OperationType = {
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
    LIST: "list",
    GET: "get",
    WRITE: "write"
  };

  var sdkPromise = null;
  var sdkCtx = null;
  var probeDone = false;

  function isFileProtocol() {
    return window.location.protocol === "file:";
  }

  function safeStr(val, maxLen) {
    return String(val == null ? "" : val).trim().slice(0, maxLen);
  }

  function slugifyId(val) {
    return String(val || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
  }

  function normalizeAssetUrl(url) {
    var u = String(url || "");
    if (u.indexOf("/src/assets/") === 0) {
      return u.slice(1);
    }
    return u;
  }

  function normalizeLoadedImages(obj) {
    if (!obj || typeof obj !== "object") return obj;
    var out = Object.assign({}, obj);
    Object.keys(out).forEach(function (k) {
      if (k.slice(-4) === "_url" && typeof out[k] === "string") {
        out[k] = normalizeAssetUrl(out[k]);
      }
    });
    return out;
  }

  async function ensureFirebase() {
    if (sdkCtx) return sdkCtx;
    if (isFileProtocol()) return null;
    if (!sdkPromise) {
      sdkPromise = (async function () {
        var base = "https://www.gstatic.com/firebasejs/" + SDK_VERSION + "/";
        var mods = await Promise.all([
          import(base + "firebase-app.js"),
          import(base + "firebase-auth.js"),
          import(base + "firebase-firestore.js")
        ]);
        var appMod = mods[0];
        var authMod = mods[1];
        var fsMod = mods[2];

        var existingApps = appMod.getApps();
        var app = existingApps.length ? existingApps[0] : appMod.initializeApp(FIREBASE_CONFIG);
        var db = fsMod.getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
        var auth = authMod.getAuth(app);

        sdkCtx = { app: app, db: db, auth: auth, authMod: authMod, fsMod: fsMod };

        if (!probeDone) {
          probeDone = true;
          try {
            await fsMod.getDocFromServer(fsMod.doc(db, "test", "connection"));
          } catch (error) {
            if (error && error.message && error.message.indexOf("the client is offline") !== -1) {
              console.error("Firebase Firestore is offline. Please verify network or Firebase configuration.");
            }
          }
        }
        return sdkCtx;
      })().catch(function (err) {
        console.warn("Firebase remote SDK unavailable; running with standalone defaults:", err && err.message ? err.message : err);
        sdkPromise = null;
        return null;
      });
    }
    return sdkPromise;
  }

  function handleFirestoreError(error, operationType, path) {
    var user = sdkCtx && sdkCtx.auth ? sdkCtx.auth.currentUser : null;
    var errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user ? user.uid : null,
        email: user ? user.email : null,
        emailVerified: user ? user.emailVerified : null,
        isAnonymous: user ? user.isAnonymous : null,
        tenantId: user ? user.tenantId : null,
        providerInfo: user && user.providerData
          ? user.providerData.map(function (p) {
              return { providerId: p.providerId, email: p.email };
            })
          : []
      },
      operationType: operationType,
      path: path
    };
    console.error("Firestore Error:", JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  async function loadLiveSiteData() {
    var DEFAULT_DATA = window.MQ_DEFAULT_DATA;
    var result = structuredClone(DEFAULT_DATA);

    if (isFileProtocol()) {
      window.MQ_DATA = result;
      return result;
    }

    try {
      var ctx = await ensureFirebase();
      if (!ctx) {
        window.MQ_DATA = result;
        return result;
      }
      var fs = ctx.fsMod;
      var db = ctx.db;

      var snaps = await Promise.all([
        fs.getDoc(fs.doc(db, "site_content", "settings")),
        fs.getDoc(fs.doc(db, "site_content", "images")),
        fs.getDoc(fs.doc(db, "site_content", "legal")),
        fs.getDoc(fs.doc(db, "site_content", "stats")),
        fs.getDocs(fs.collection(db, "hero_slides")),
        fs.getDocs(fs.collection(db, "campaigns")),
        fs.getDocs(fs.collection(db, "stories")),
        fs.getDocs(fs.collection(db, "media")),
        fs.getDocs(fs.collection(db, "qurbani_options")),
        fs.getDocs(fs.collection(db, "faqs")),
        fs.getDocs(fs.collection(db, "programmes")),
        fs.getDocs(fs.collection(db, "donation_tiers"))
      ]);

      var settingsSnap = snaps[0];
      var imagesSnap = snaps[1];
      var legalSnap = snaps[2];
      var statsSnap = snaps[3];
      var heroSnap = snaps[4];
      var campaignsSnap = snaps[5];
      var storiesSnap = snaps[6];
      var mediaSnap = snaps[7];
      var qurbaniSnap = snaps[8];
      var faqsSnap = snaps[9];
      var programmesSnap = snaps[10];
      var tiersSnap = snaps[11];

      if (settingsSnap.exists()) {
        result.settings = Object.assign({}, result.settings, settingsSnap.data());
      }
      if (imagesSnap.exists()) {
        result.images = normalizeLoadedImages(Object.assign({}, result.images, imagesSnap.data()));
      }
      if (legalSnap.exists()) {
        result.legal = Object.assign({}, result.legal, legalSnap.data());
      }
      if (statsSnap.exists()) {
        var st = statsSnap.data();
        result.stats = {
          section_note: st.section_note || result.stats.section_note,
          items: Array.isArray(st.items) && st.items.length ? st.items : result.stats.items
        };
      }

      if (!heroSnap.empty) {
        result.heroSlides = heroSnap.docs
          .map(function (d) {
            var item = Object.assign({ id: d.id }, d.data());
            item.image_url = normalizeAssetUrl(item.image_url);
            return item;
          })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      }
      if (!campaignsSnap.empty) {
        result.campaigns = campaignsSnap.docs
          .map(function (d) {
            var item = Object.assign({ id: d.id }, d.data());
            item.image_url = normalizeAssetUrl(item.image_url);
            return item;
          })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      }
      if (!storiesSnap.empty) {
        result.stories = storiesSnap.docs
          .map(function (d) {
            var item = Object.assign({ id: d.id }, d.data());
            item.image_url = normalizeAssetUrl(item.image_url);
            return item;
          })
          .sort(function (a, b) { return new Date(b.published_at || 0) - new Date(a.published_at || 0); });
      }
      if (!mediaSnap.empty) {
        result.media = mediaSnap.docs
          .map(function (d) {
            var item = Object.assign({ id: d.id }, d.data());
            item.image_url = normalizeAssetUrl(item.image_url);
            return item;
          })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      }
      if (!qurbaniSnap.empty) {
        result.qurbaniOptions = qurbaniSnap.docs
          .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      }
      if (!faqsSnap.empty) {
        result.faqs = faqsSnap.docs
          .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      }
      if (!programmesSnap.empty) {
        result.programmes = programmesSnap.docs
          .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      }
      if (!tiersSnap.empty) {
        result.donationTiers = tiersSnap.docs
          .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      }
    } catch (error) {
      console.warn("Using bundled site defaults; Firestore sync skipped or partial:", error && error.message ? error.message : error);
    }

    window.MQ_DATA = result;
    return result;
  }

  async function submitContactInquiry(input) {
    var path = "contact_inquiries";
    if (!input.age_consent) {
      throw new Error("Age or parental consent confirmation is required.");
    }
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Online database connection unavailable in local file mode.");

    var fs = ctx.fsMod;
    var payload = {
      name: safeStr(input.name, 120),
      contact_value: safeStr(input.contact_value, 160),
      subject: safeStr(input.subject || "General Inquiry", 160),
      message: safeStr(input.message, 2000),
      age_consent: true,
      status: "new",
      createdAt: fs.serverTimestamp(),
      updatedAt: fs.serverTimestamp()
    };

    try {
      var docRef = await fs.addDoc(fs.collection(ctx.db, path), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async function submitDataDeletionRequest(input) {
    var path = "data_deletion_requests";
    if (!input.age_consent) {
      throw new Error("Age or parental consent confirmation is required.");
    }
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Online database connection unavailable in local file mode.");

    var fs = ctx.fsMod;
    var allowedTypes = ["delete_all", "delete_inquiry", "access_copy"];
    var cleanType = allowedTypes.indexOf(input.request_type) !== -1 ? input.request_type : "delete_all";
    var payload = {
      requester_name: safeStr(input.requester_name, 120),
      contact_info: safeStr(input.contact_info, 160),
      request_type: cleanType,
      details: safeStr(input.details || "", 1000),
      age_consent: true,
      status: "pending",
      createdAt: fs.serverTimestamp(),
      updatedAt: fs.serverTimestamp()
    };

    try {
      var docRef = await fs.addDoc(fs.collection(ctx.db, path), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async function signInAdminWithGoogle() {
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Admin authentication requires HTTP/HTTPS hosting.");
    var provider = new ctx.authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    var cred = await ctx.authMod.signInWithPopup(ctx.auth, provider);
    return cred.user;
  }

  async function signOutAdmin() {
    var ctx = await ensureFirebase();
    if (ctx) await ctx.authMod.signOut(ctx.auth);
  }

  function watchAdminAuth(callback) {
    if (isFileProtocol()) {
      callback(null);
      return function () {};
    }
    ensureFirebase().then(function (ctx) {
      if (!ctx) {
        callback(null);
        return;
      }
      ctx.authMod.onAuthStateChanged(ctx.auth, callback);
    });
    return function () {};
  }

  async function checkIsAdmin(user) {
    if (!user || !user.emailVerified) return false;
    if (user.email === "maleham06@gmail.com") return true;
    try {
      var ctx = await ensureFirebase();
      if (!ctx) return false;
      var snap = await ctx.fsMod.getDoc(ctx.fsMod.doc(ctx.db, "admins", user.uid));
      return snap.exists();
    } catch (error) {
      return false;
    }
  }

  async function saveSettingsDoc(data) {
    var path = "site_content/settings";
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var payload = {
      organisation_name: safeStr(data.organisation_name, 160) || "Mustaqiim Relief and Charity Foundation",
      tagline: safeStr(data.tagline, 240),
      registration_number: safeStr(data.registration_number, 120),
      legal_status: safeStr(data.legal_status, 160),
      operational_hours: safeStr(data.operational_hours, 160),
      address_line: safeStr(data.address_line, 240),
      phone_display: safeStr(data.phone_display, 40) || "+256 708 684 223",
      phone_international: safeStr(data.phone_international, 30).replace(/[^0-9]/g, "") || "256708684223",
      whatsapp_message: safeStr(data.whatsapp_message, 300),
      public_email: safeStr(data.public_email, 160),
      facebook_url: safeStr(data.facebook_url, 300),
      instagram_url: safeStr(data.instagram_url, 300),
      map_lat: Number.isFinite(Number(data.map_lat)) ? Number(data.map_lat) : 0.3025,
      map_lng: Number.isFinite(Number(data.map_lng)) ? Number(data.map_lng) : 32.5945,
      map_label: safeStr(data.map_label, 160) || "Nsambya, Kampala, Uganda",
      map_description: safeStr(data.map_description, 300),
      announcement_text: safeStr(data.announcement_text, 240),
      footer_mission: safeStr(data.footer_mission, 400),
      commitment_quote: safeStr(data.commitment_quote, 500),
      commitment_author: safeStr(data.commitment_author, 160),
      commitment_role: safeStr(data.commitment_role, 160),
      updatedAt: fs.serverTimestamp()
    };
    try {
      await fs.setDoc(fs.doc(ctx.db, "site_content", "settings"), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async function saveLegalDoc(data) {
    var path = "site_content/legal";
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var payload = {
      privacy_updated: safeStr(data.privacy_updated, 80) || "November 2026",
      terms_updated: safeStr(data.terms_updated, 80) || "November 2026",
      refund_updated: safeStr(data.refund_updated, 80) || "November 2026",
      cookie_updated: safeStr(data.cookie_updated, 80) || "November 2026",
      donation_policy_updated: safeStr(data.donation_policy_updated, 80) || "November 2026",
      data_deletion_updated: safeStr(data.data_deletion_updated, 80) || "November 2026",
      privacy_contact_note: safeStr(data.privacy_contact_note, 400),
      updatedAt: fs.serverTimestamp()
    };
    try {
      await fs.setDoc(fs.doc(ctx.db, "site_content", "legal"), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async function saveStatsDoc(data) {
    var path = "site_content/stats";
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var items = Array.isArray(data.items)
      ? data.items.slice(0, 6).map(function (item) {
          return {
            label: safeStr(item.label, 80),
            value: safeStr(item.value, 60),
            note: safeStr(item.note, 120)
          };
        })
      : [];
    var payload = {
      section_note: safeStr(data.section_note, 300),
      items: items,
      updatedAt: fs.serverTimestamp()
    };
    try {
      await fs.setDoc(fs.doc(ctx.db, "site_content", "stats"), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async function saveSiteImagesDoc(data) {
    var path = "site_content/images";
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var def = window.MQ_DEFAULT_DATA.images;
    var payload = {
      about_side_image_url: safeStr(data.about_side_image_url, 500) || def.about_side_image_url,
      about_side_image_alt: safeStr(data.about_side_image_alt, 240) || def.about_side_image_alt,
      child_support_bg_url: safeStr(data.child_support_bg_url, 500) || def.child_support_bg_url,
      child_support_bg_alt: safeStr(data.child_support_bg_alt, 240) || def.child_support_bg_alt,
      child_support_card1_url: safeStr(data.child_support_card1_url, 500) || def.child_support_card1_url,
      child_support_card1_alt: safeStr(data.child_support_card1_alt, 240) || def.child_support_card1_alt,
      child_support_card2_url: safeStr(data.child_support_card2_url, 500) || def.child_support_card2_url,
      child_support_card2_alt: safeStr(data.child_support_card2_alt, 240) || def.child_support_card2_alt,
      qurbani_promo_bg_url: safeStr(data.qurbani_promo_bg_url, 500) || def.qurbani_promo_bg_url,
      qurbani_promo_bg_alt: safeStr(data.qurbani_promo_bg_alt, 240) || def.qurbani_promo_bg_alt,
      qurbani_promo_feature_url: safeStr(data.qurbani_promo_feature_url, 500) || def.qurbani_promo_feature_url,
      qurbani_promo_feature_alt: safeStr(data.qurbani_promo_feature_alt, 240) || def.qurbani_promo_feature_alt,
      quote_bg_url: safeStr(data.quote_bg_url, 500) || def.quote_bg_url,
      quote_bg_alt: safeStr(data.quote_bg_alt, 240) || def.quote_bg_alt,
      cta_bg_url: safeStr(data.cta_bg_url, 500) || def.cta_bg_url,
      cta_bg_alt: safeStr(data.cta_bg_alt, 240) || def.cta_bg_alt,
      inner_hero_about_url: safeStr(data.inner_hero_about_url, 500) || def.inner_hero_about_url,
      inner_hero_about_alt: safeStr(data.inner_hero_about_alt, 240) || def.inner_hero_about_alt,
      inner_hero_qurbani_url: safeStr(data.inner_hero_qurbani_url, 500) || def.inner_hero_qurbani_url,
      inner_hero_qurbani_alt: safeStr(data.inner_hero_qurbani_alt, 240) || def.inner_hero_qurbani_alt,
      inner_hero_donate_url: safeStr(data.inner_hero_donate_url, 500) || def.inner_hero_donate_url,
      inner_hero_donate_alt: safeStr(data.inner_hero_donate_alt, 240) || def.inner_hero_donate_alt,
      updatedAt: fs.serverTimestamp()
    };
    try {
      await fs.setDoc(fs.doc(ctx.db, "site_content", "images"), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  function sanitizeEntityPayload(collectionName, raw, serverTimestampFn) {
    switch (collectionName) {
      case "hero_slides":
        return {
          eyebrow: safeStr(raw.eyebrow, 100),
          title: safeStr(raw.title, 160),
          subtitle: safeStr(raw.subtitle, 400),
          primary_cta_label: safeStr(raw.primary_cta_label, 60),
          primary_cta_href: safeStr(raw.primary_cta_href, 200),
          secondary_cta_label: safeStr(raw.secondary_cta_label, 60),
          secondary_cta_href: safeStr(raw.secondary_cta_href, 200),
          image_url: safeStr(raw.image_url, 500),
          image_alt: safeStr(raw.image_alt, 240),
          order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
          active: Boolean(raw.active),
          updatedAt: serverTimestampFn()
        };
      case "campaigns":
        return {
          slug: slugifyId(raw.slug || raw.title) || "campaign-item",
          title: safeStr(raw.title, 160),
          summary: safeStr(raw.summary, 400),
          description: safeStr(raw.description, 4000),
          image_url: safeStr(raw.image_url, 500),
          image_alt: safeStr(raw.image_alt, 240),
          target_amount: Math.max(0, Number(raw.target_amount) || 0),
          raised_amount: Math.max(0, Number(raw.raised_amount) || 0),
          currency: safeStr(raw.currency, 10) || "USD",
          location: safeStr(raw.location, 120) || "Uganda",
          active: Boolean(raw.active),
          order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
          updatedAt: serverTimestampFn()
        };
      case "stories":
        return {
          slug: slugifyId(raw.slug || raw.title) || "story-item",
          title: safeStr(raw.title, 180),
          excerpt: safeStr(raw.excerpt, 400),
          body: safeStr(raw.body, 8000),
          image_url: safeStr(raw.image_url, 500),
          image_alt: safeStr(raw.image_alt, 240),
          published_at: safeStr(raw.published_at, 60) || new Date().toISOString(),
          active: Boolean(raw.active),
          updatedAt: serverTimestampFn()
        };
      case "media":
        return {
          slug: slugifyId(raw.slug || raw.title) || "media-item",
          title: safeStr(raw.title, 160),
          caption: safeStr(raw.caption, 400),
          media_type: raw.media_type === "video" ? "video" : "photo",
          image_url: safeStr(raw.image_url, 500),
          video_url: safeStr(raw.video_url, 500),
          image_alt: safeStr(raw.image_alt, 240) || safeStr(raw.title, 160),
          license_note: safeStr(raw.license_note, 240),
          featured: Boolean(raw.featured),
          order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
          active: Boolean(raw.active),
          updatedAt: serverTimestampFn()
        };
      case "qurbani_options":
        return {
          label: safeStr(raw.label, 100),
          note: safeStr(raw.note, 120),
          price: Math.max(0, Number(raw.price) || 0),
          currency: safeStr(raw.currency, 10) || "USD",
          available: Boolean(raw.available),
          order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
          updatedAt: serverTimestampFn()
        };
      case "faqs":
        return {
          question: safeStr(raw.question, 240),
          answer: safeStr(raw.answer, 2000),
          order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
          active: Boolean(raw.active),
          updatedAt: serverTimestampFn()
        };
      case "programmes":
        return {
          title: safeStr(raw.title, 120),
          description: safeStr(raw.description, 400),
          link_label: safeStr(raw.link_label, 60) || "Learn more",
          link_href: safeStr(raw.link_href, 200) || "about.html",
          icon_key: ["qurbani", "food", "water", "community", "children"].indexOf(raw.icon_key) !== -1 ? raw.icon_key : "community",
          order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
          active: Boolean(raw.active),
          updatedAt: serverTimestampFn()
        };
      case "donation_tiers":
        return {
          amount: Math.max(3, Number(raw.amount) || 3),
          currency: safeStr(raw.currency, 10) || "USD",
          title: safeStr(raw.title, 100),
          description: safeStr(raw.description, 300),
          order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
          active: Boolean(raw.active),
          updatedAt: serverTimestampFn()
        };
      default:
        throw new Error("Unknown collection: " + collectionName);
    }
  }

  async function upsertCollectionItem(collectionName, docId, rawData) {
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var cleanId = slugifyId(docId) || "item-" + Date.now();
    var path = collectionName + "/" + cleanId;
    var payload = sanitizeEntityPayload(collectionName, rawData, fs.serverTimestamp);
    try {
      await fs.setDoc(fs.doc(ctx.db, collectionName, cleanId), payload);
      return cleanId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async function deleteCollectionItem(collectionName, docId) {
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var path = collectionName + "/" + docId;
    try {
      await ctx.fsMod.deleteDoc(ctx.fsMod.doc(ctx.db, collectionName, docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  async function listProtectedCollection(collectionName) {
    var ctx = await ensureFirebase();
    if (!ctx) return [];
    try {
      var snap = await ctx.fsMod.getDocs(ctx.fsMod.collection(ctx.db, collectionName));
      return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  }

  async function updateRequestStatus(collectionName, docId, status) {
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var path = collectionName + "/" + docId;
    try {
      await fs.updateDoc(fs.doc(ctx.db, collectionName, docId), {
        status: status,
        updatedAt: fs.serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async function addAdminRecord(uid, email, displayName) {
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var cleanUid = safeStr(uid, 128).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanUid) throw new Error("Valid Firebase UID is required.");
    var path = "admins/" + cleanUid;
    try {
      await fs.setDoc(fs.doc(ctx.db, "admins", cleanUid), {
        email: safeStr(email, 160),
        display_name: safeStr(displayName || "", 120),
        added_by: ctx.auth.currentUser ? ctx.auth.currentUser.uid : "system",
        createdAt: fs.serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async function seedDatabaseDefaults() {
    var ctx = await ensureFirebase();
    if (!ctx) throw new Error("Firestore unavailable.");
    var fs = ctx.fsMod;
    var db = ctx.db;
    var DEFAULT_DATA = window.MQ_DEFAULT_DATA;

    try {
      var batch = fs.writeBatch(db);

      batch.set(fs.doc(db, "site_content", "settings"), Object.assign({}, DEFAULT_DATA.settings, {
        updatedAt: fs.serverTimestamp()
      }));
      batch.set(fs.doc(db, "site_content", "images"), Object.assign({}, DEFAULT_DATA.images, {
        updatedAt: fs.serverTimestamp()
      }));
      batch.set(fs.doc(db, "site_content", "legal"), Object.assign({}, DEFAULT_DATA.legal, {
        updatedAt: fs.serverTimestamp()
      }));
      batch.set(fs.doc(db, "site_content", "stats"), Object.assign({}, DEFAULT_DATA.stats, {
        updatedAt: fs.serverTimestamp()
      }));

      DEFAULT_DATA.heroSlides.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "hero_slides", item.id), copy);
      });
      DEFAULT_DATA.programmes.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "programmes", item.id), copy);
      });
      DEFAULT_DATA.campaigns.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "campaigns", item.id), copy);
      });
      DEFAULT_DATA.stories.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "stories", item.id), copy);
      });
      DEFAULT_DATA.media.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "media", item.id), copy);
      });
      DEFAULT_DATA.qurbaniOptions.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "qurbani_options", item.id), copy);
      });
      DEFAULT_DATA.faqs.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "faqs", item.id), copy);
      });
      DEFAULT_DATA.donationTiers.forEach(function (item) {
        var copy = Object.assign({}, item);
        delete copy.id;
        copy.updatedAt = fs.serverTimestamp();
        batch.set(fs.doc(db, "donation_tiers", item.id), copy);
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "seed_defaults_batch");
    }
  }

  // Trigger early connection probe when running over HTTP/HTTPS
  if (!isFileProtocol()) {
    ensureFirebase();
  }

  window.MQ_DB = {
    isFileProtocol: isFileProtocol,
    loadLiveSiteData: loadLiveSiteData,
    submitContactInquiry: submitContactInquiry,
    submitDataDeletionRequest: submitDataDeletionRequest,
    signInAdminWithGoogle: signInAdminWithGoogle,
    signOutAdmin: signOutAdmin,
    watchAdminAuth: watchAdminAuth,
    checkIsAdmin: checkIsAdmin,
    saveSettingsDoc: saveSettingsDoc,
    saveSiteImagesDoc: saveSiteImagesDoc,
    saveLegalDoc: saveLegalDoc,
    saveStatsDoc: saveStatsDoc,
    upsertCollectionItem: upsertCollectionItem,
    deleteCollectionItem: deleteCollectionItem,
    listProtectedCollection: listProtectedCollection,
    updateRequestStatus: updateRequestStatus,
    addAdminRecord: addAdminRecord,
    seedDatabaseDefaults: seedDatabaseDefaults
  };
})();
