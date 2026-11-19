// -----------------------------------------------------------------
// ADMIN DASHBOARD CONTROLLER — Mustaqiim Relief and Charity Foundation
// Standalone classic script connected to Cloud Firestore + Google Auth.
// -----------------------------------------------------------------

(function () {
  "use strict";

  var DEFAULT_DATA = window.MQ_DEFAULT_DATA || {};
  var LICENSED_IMAGE_PRESETS = window.MQ_LICENSED_IMAGE_PRESETS || [];
  var DB = window.MQ_DB || {};

  var loadLiveSiteData = DB.loadLiveSiteData;
  var signInAdminWithGoogle = DB.signInAdminWithGoogle;
  var signOutAdmin = DB.signOutAdmin;
  var watchAdminAuth = DB.watchAdminAuth;
  var checkIsAdmin = DB.checkIsAdmin;
  var saveSettingsDoc = DB.saveSettingsDoc;
  var saveSiteImagesDoc = DB.saveSiteImagesDoc;
  var saveLegalDoc = DB.saveLegalDoc;
  var saveStatsDoc = DB.saveStatsDoc;
  var upsertCollectionItem = DB.upsertCollectionItem;
  var deleteCollectionItem = DB.deleteCollectionItem;
  var listProtectedCollection = DB.listProtectedCollection;
  var updateRequestStatus = DB.updateRequestStatus;
  var addAdminRecord = DB.addAdminRecord;
  var seedDatabaseDefaults = DB.seedDatabaseDefaults;

  var SITE_DATA = structuredClone(DEFAULT_DATA);
  var CURRENT_USER = null;
  var ACTIVE_TAB = "overview";
  var PROTECTED_DATA = {
    contact_inquiries: [],
    data_deletion_requests: [],
    admins: []
  };

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(msg, isError) {
    var existing = document.getElementById("admin-toast");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.id = "admin-toast";
    el.className = "admin-toast" + (isError ? " error" : "");
    el.setAttribute("role", "status");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.remove();
    }, 4000);
  }

  var SIDEBAR_GROUPS = [
    {
      label: "Dashboard",
      items: [
        { id: "overview", label: "Overview" },
        { id: "settings", label: "Site & Business Details" }
      ]
    },
    {
      label: "Homepage & Content",
      items: [
        { id: "hero", label: "Hero Carousel Slides" },
        { id: "images", label: "Backgrounds & Site Images" },
        { id: "programmes", label: "Programmes & Impact Stats" },
        { id: "campaigns", label: "Campaigns" },
        { id: "qurbani", label: "Qurbani Options" },
        { id: "stories", label: "Field Stories" },
        { id: "media", label: "Media Gallery" },
        { id: "faqs", label: "FAQs" },
        { id: "tiers", label: "Donation Tiers" }
      ]
    },
    {
      label: "Governance & Privacy",
      items: [
        { id: "legal", label: "Legal Policy Dates" },
        { id: "requests", label: "Inquiries & Data Deletions" },
        { id: "admins", label: "Admin Access" }
      ]
    }
  ];

  function renderAuthGate(message, showSignOut) {
    var root = document.getElementById("admin-root");
    var isLocalFile = typeof DB.isFileProtocol === "function" && DB.isFileProtocol();
    var fileNoticeHtml = isLocalFile
      ? '<div class="calc-note" style="text-align:left; margin-bottom:18px;">You are currently viewing this file directly via <strong>file://</strong>. Google Sign-In and live Cloud Firestore updates require opening the website over <strong>HTTP or HTTPS</strong> (such as your GitHub Pages link or live web domain).</div>'
      : "";

    root.innerHTML =
      '<main id="main-content" class="admin-auth-screen">' +
        '<div class="admin-auth-card">' +
          '<div class="logo-mark" style="margin:0 auto 16px; width:48px; height:48px; font-size:20px;">M</div>' +
          "<h1>Mustaqiim Admin Dashboard</h1>" +
          "<p>Sign in with your authorized administrator Google account to manage website content, campaigns, business details, and user data requests.</p>" +
          fileNoticeHtml +
          (message ? '<div class="form-error" style="text-align:left;">' + esc(message) + "</div>" : "") +
          '<div style="display:flex; flex-direction:column; gap:10px;">' +
            (isLocalFile ? "" : '<button type="button" id="admin-google-login" class="btn btn-primary full-width">Sign in with Google</button>') +
            (showSignOut ? '<button type="button" id="admin-gate-signout" class="btn btn-outline full-width">Sign Out Current Account</button>' : "") +
            '<a href="index.html" class="btn btn-outline full-width">Return to Public Website</a>' +
          "</div>" +
        "</div>" +
      "</main>";

    var loginBtn = document.getElementById("admin-google-login");
    if (loginBtn) {
      loginBtn.addEventListener("click", async function () {
        try {
          await signInAdminWithGoogle();
        } catch (err) {
          showToast("Sign-in failed: " + (err.message || err), true);
        }
      });
    }

    var signOutBtn = document.getElementById("admin-gate-signout");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () { signOutAdmin(); });
    }
  }

async function refreshAllData() {
  SITE_DATA = await loadLiveSiteData();
  try {
    const [inquiries, deletions, admins] = await Promise.all([
      listProtectedCollection('contact_inquiries'),
      listProtectedCollection('data_deletion_requests'),
      listProtectedCollection('admins')
    ]);
    PROTECTED_DATA = {
      contact_inquiries: inquiries || [],
      data_deletion_requests: deletions || [],
      admins: admins || []
    };
  } catch (err) {
    console.warn('Protected collections fetch warning:', err?.message || err);
  }
}

function renderDashboardShell() {
  const root = document.getElementById('admin-root');
  const navHtml = SIDEBAR_GROUPS.map((group) =>
    '<div class="admin-nav-group-label">' + esc(group.label) + '</div>' +
    group.items.map((item) =>
      '<button type="button" class="admin-nav-btn" data-tab="' + item.id + '" aria-current="' + (ACTIVE_TAB === item.id ? 'page' : 'false') + '">' +
        esc(item.label) +
      '</button>'
    ).join('')
  ).join('');

  const activeTitle = SIDEBAR_GROUPS.flatMap((g) => g.items).find((i) => i.id === ACTIVE_TAB)?.label || 'Overview';

  root.innerHTML =
    '<div class="admin-shell">' +
      '<aside class="admin-sidebar" id="admin-sidebar" aria-label="Admin dashboard navigation">' +
        '<div class="admin-sidebar-header">' +
          '<a href="index.html" class="admin-brand">' +
            '<span class="logo-mark" aria-hidden="true">M</span>' +
            '<span>Mustaqiim CMS</span>' +
          '</a>' +
          '<button type="button" class="admin-mobile-toggle" id="admin-sidebar-close" aria-label="Close sidebar" style="color:#fff; border-color:rgba(255,255,255,0.25);">&times;</button>' +
        '</div>' +
        '<nav class="admin-nav-scroll">' + navHtml + '</nav>' +
        '<div class="admin-sidebar-footer">' +
          '<div class="admin-user-email">' + esc(CURRENT_USER?.email || '') + '</div>' +
          '<button type="button" id="admin-signout-btn" class="btn btn-outline-light full-width" style="padding:8px 14px; min-height:38px; font-size:13px;">Sign Out</button>' +
        '</div>' +
      '</aside>' +
      '<div class="admin-main">' +
        '<header class="admin-topbar">' +
          '<div class="admin-topbar-left">' +
            '<button type="button" class="admin-mobile-toggle" id="admin-sidebar-open" aria-label="Open sidebar">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>' +
            '</button>' +
            '<h1 class="admin-breadcrumb">' + esc(activeTitle) + '</h1>' +
          '</div>' +
          '<div class="admin-topbar-actions">' +
            '<a href="index.html" target="_blank" rel="noreferrer noopener" class="btn btn-outline" style="padding:8px 18px; min-height:38px; font-size:13px;">View Live Site</a>' +
          '</div>' +
        '</header>' +
        '<main id="main-content" class="admin-content"></main>' +
      '</div>' +
    '</div>';

  const sidebar = document.getElementById('admin-sidebar');
  document.getElementById('admin-sidebar-open').addEventListener('click', () => sidebar.classList.add('open'));
  document.getElementById('admin-sidebar-close').addEventListener('click', () => sidebar.classList.remove('open'));
  document.getElementById('admin-signout-btn').addEventListener('click', () => signOutAdmin());

  document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ACTIVE_TAB = btn.dataset.tab;
      sidebar.classList.remove('open');
      renderDashboardShell();
    });
  });

  renderTabContent();
}

function renderTabContent() {
  const main = document.getElementById('main-content');
  if (!main) return;

  switch (ACTIVE_TAB) {
    case 'overview': renderOverviewTab(main); break;
    case 'settings': renderSettingsTab(main); break;
    case 'hero': renderHeroTab(main); break;
    case 'images': renderSiteImagesTab(main); break;
    case 'programmes': renderProgrammesAndStatsTab(main); break;
    case 'campaigns': renderCampaignsTab(main); break;
    case 'qurbani': renderQurbaniTab(main); break;
    case 'stories': renderStoriesTab(main); break;
    case 'media': renderMediaTab(main); break;
    case 'faqs': renderFaqsTab(main); break;
    case 'tiers': renderTiersTab(main); break;
    case 'legal': renderLegalTab(main); break;
    case 'requests': renderRequestsTab(main); break;
    case 'admins': renderAdminsTab(main); break;
    default: renderOverviewTab(main);
  }
}

// -----------------------------------------------------------------
// 1. Overview Tab
// -----------------------------------------------------------------
function renderOverviewTab(container) {
  const pendingDeletions = PROTECTED_DATA.data_deletion_requests.filter((r) => r.status === 'pending').length;
  const newInquiries = PROTECTED_DATA.contact_inquiries.filter((r) => r.status === 'new').length;

  container.innerHTML =
    '<div class="admin-kpi-grid">' +
      '<div class="admin-kpi-card"><div class="admin-kpi-label">Hero Slides</div><div class="admin-kpi-value">' + SITE_DATA.heroSlides.length + '</div></div>' +
      '<div class="admin-kpi-card"><div class="admin-kpi-label">Campaigns</div><div class="admin-kpi-value">' + SITE_DATA.campaigns.length + '</div></div>' +
      '<div class="admin-kpi-card"><div class="admin-kpi-label">Field Stories</div><div class="admin-kpi-value">' + SITE_DATA.stories.length + '</div></div>' +
      '<div class="admin-kpi-card"><div class="admin-kpi-label">Media Assets</div><div class="admin-kpi-value">' + SITE_DATA.media.length + '</div></div>' +
      '<div class="admin-kpi-card"><div class="admin-kpi-label">New Inquiries</div><div class="admin-kpi-value">' + newInquiries + '</div></div>' +
      '<div class="admin-kpi-card"><div class="admin-kpi-label">Pending Deletions</div><div class="admin-kpi-value">' + pendingDeletions + '</div></div>' +
    '</div>' +
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Database Synchronization</h2></div>' +
      '<p style="color:var(--muted); margin-bottom:18px;">If this is your first time launching the website or you want to populate Firestore with the starter baseline records so all collections are live-editable, click below.</p>' +
      '<div style="display:flex; gap:12px; flex-wrap:wrap;">' +
        '<button type="button" id="seed-db-btn" class="btn btn-primary">Initialize / Seed Default Content to Firestore</button>' +
        '<button type="button" id="refresh-db-btn" class="btn btn-outline">Reload Live Data</button>' +
      '</div>' +
    '</div>' +
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Quick Page Links</h2></div>' +
      '<div style="display:flex; gap:10px; flex-wrap:wrap;">' +
        '<a href="index.html" target="_blank" class="btn btn-outline">Homepage</a>' +
        '<a href="about.html" target="_blank" class="btn btn-outline">About &amp; Business Details</a>' +
        '<a href="campaigns.html" target="_blank" class="btn btn-outline">Campaigns</a>' +
        '<a href="qurbani.html" target="_blank" class="btn btn-outline">Qurbani</a>' +
        '<a href="privacy-policy.html" target="_blank" class="btn btn-outline">Privacy Policy</a>' +
        '<a href="data-deletion.html" target="_blank" class="btn btn-outline">Data Deletion</a>' +
      '</div>' +
    '</div>';

  document.getElementById('seed-db-btn').addEventListener('click', async () => {
    try {
      await seedDatabaseDefaults();
      await refreshAllData();
      showToast('Default site content saved to Firestore.');
      renderTabContent();
    } catch (err) {
      showToast('Failed to seed database: ' + err.message, true);
    }
  });
  document.getElementById('refresh-db-btn').addEventListener('click', async () => {
    await refreshAllData();
    showToast('Live database reloaded.');
    renderTabContent();
  });
}

// -----------------------------------------------------------------
// 2. Site & Business Details Tab
// -----------------------------------------------------------------
function renderSettingsTab(container) {
  const s = SITE_DATA.settings || {};
  container.innerHTML =
    '<form id="admin-settings-form" class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Organisation, Business Details &amp; Contact</h2>' +
        '<button type="submit" class="btn btn-primary">Save Settings</button>' +
      '</div>' +
      '<div class="admin-form-grid admin-form-grid-2">' +
        fieldInput('organisation_name', 'Organisation Legal Name', s.organisation_name, 160, true) +
        fieldInput('tagline', 'Site Tagline', s.tagline, 240) +
        fieldInput('legal_status', 'Organisation / Business Type', s.legal_status, 160) +
        fieldInput('registration_number', 'NGO / Registration Reference', s.registration_number, 120) +
        fieldInput('operational_hours', 'Operating Hours', s.operational_hours, 160) +
        fieldInput('address_line', 'Physical / Operational Address', s.address_line, 240) +
        fieldInput('phone_display', 'Telephone / WhatsApp Display', s.phone_display, 40, true) +
        fieldInput('phone_international', 'WhatsApp Digits Only (e.g. 256708684223)', s.phone_international, 30, true) +
        fieldInput('public_email', 'Public Email Address (optional)', s.public_email, 160) +
        fieldInput('announcement_text', 'Top Announcement Bar Text', s.announcement_text, 240) +
        fieldInput('facebook_url', 'Facebook Page URL', s.facebook_url, 300) +
        fieldInput('instagram_url', 'Instagram Profile URL', s.instagram_url, 300) +
        fieldInput('map_label', 'Map Pin Title', s.map_label, 160, true) +
        fieldInput('map_description', 'Map Pin Description', s.map_description, 300) +
        fieldInput('map_lat', 'Map Latitude', s.map_lat, 20, false, 'number') +
        fieldInput('map_lng', 'Map Longitude', s.map_lng, 20, false, 'number') +
      '</div>' +
      '<div style="margin-top:16px;">' +
        fieldTextarea('whatsapp_message', 'Default WhatsApp Greeting Message', s.whatsapp_message, 300) +
        fieldTextarea('footer_mission', 'Footer Mission Statement', s.footer_mission, 400) +
        fieldTextarea('commitment_quote', 'Homepage Commitment Quote', s.commitment_quote, 500) +
      '</div>' +
      '<div class="admin-form-grid admin-form-grid-2">' +
        fieldInput('commitment_author', 'Commitment Attribution', s.commitment_author, 160) +
        fieldInput('commitment_role', 'Commitment Subtitle', s.commitment_role, 160) +
      '</div>' +
    '</form>';

  document.getElementById('admin-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    try {
      await saveSettingsDoc(data);
      await refreshAllData();
      showToast('Site and business details saved to Firestore.');
    } catch (err) {
      showToast('Error saving settings: ' + err.message, true);
    }
  });
}

// -----------------------------------------------------------------
// 2b. Backgrounds & Site Images Tab (Live Image & Alt Editor)
// -----------------------------------------------------------------
const SITE_IMAGE_SLOTS = [
  {
    key: 'child_support_bg',
    title: 'Helping Children in Uganda — Section Background',
    hint: 'Full-width background behind the Child Support showcase section on the homepage.'
  },
  {
    key: 'child_support_card1',
    title: 'Child Nutrition Feature Card (Homepage)',
    hint: 'Left feature photo inside the Supporting Children in Uganda showcase.'
  },
  {
    key: 'child_support_card2',
    title: 'Nsambya Learning Support Card (Homepage)',
    hint: 'Right feature photo inside the Supporting Children in Uganda showcase.'
  },
  {
    key: 'about_side_image',
    title: 'Who We Are & About Page Side Visual',
    hint: 'Displayed beside Who We Are on Homepage and in the About Us sidebar.'
  },
  {
    key: 'qurbani_promo_bg',
    title: 'Qurbani Promo Banner Background',
    hint: 'Subtle background backdrop behind the Qurbani / Udhiya homepage banner.'
  },
  {
    key: 'qurbani_promo_feature',
    title: 'Qurbani Promo Feature Image',
    hint: 'Right-hand visual inside the Qurbani / Udhiya homepage banner.'
  },
  {
    key: 'quote_bg',
    title: 'Commitment Quote Section Background',
    hint: 'Full-width background behind the Amanah commitment quote.'
  },
  {
    key: 'cta_bg',
    title: 'Bottom Call-To-Action Background',
    hint: 'Full-width background behind the Support a Family / Child CTA banner.'
  },
  {
    key: 'inner_hero_about',
    title: 'About Page Hero Background',
    hint: 'Top banner background photo on about.html.'
  },
  {
    key: 'inner_hero_qurbani',
    title: 'Qurbani Page Hero Background',
    hint: 'Top banner background photo on qurbani.html.'
  },
  {
    key: 'inner_hero_donate',
    title: 'Donate Page Hero Background',
    hint: 'Top banner background photo on donate.html.'
  }
];

function renderSiteImagesTab(container) {
  const imgs = { ...(DEFAULT_DATA.images || {}), ...(SITE_DATA.images || {}) };

  const cardsHtml = SITE_IMAGE_SLOTS.map((slot) => {
    const curUrl = imgs[slot.key + '_url'] || '';
    const curAlt = imgs[slot.key + '_alt'] || '';
    const options = LICENSED_IMAGE_PRESETS.map((p, idx) =>
      '<option value="' + idx + '"' + (p.url === curUrl ? ' selected' : '') + '>' + esc(p.label) + '</option>'
    ).join('');

    return (
      '<div style="border:1px solid var(--border); border-radius:12px; padding:18px; background:var(--cream); margin-bottom:18px;">' +
        '<h3 style="font-size:1rem; margin-bottom:4px;">' + esc(slot.title) + '</h3>' +
        '<p style="font-size:13px; color:var(--muted); margin-bottom:14px;">' + esc(slot.hint) + '</p>' +
        '<div class="admin-form-grid admin-form-grid-2" style="align-items:start;">' +
          '<div>' +
            '<div class="form-field">' +
              '<label class="form-label" for="preset-' + esc(slot.key) + '">Choose Licensed Preset</label>' +
              '<select class="form-select site-img-preset" data-key="' + esc(slot.key) + '" id="preset-' + esc(slot.key) + '">' +
                '<option value="">-- Select a foundation image preset --</option>' + options +
              '</select>' +
            '</div>' +
            fieldInput(slot.key + '_url', 'Image URL (local path or HTTPS)', curUrl, 500, true) +
            fieldInput(slot.key + '_alt', 'Descriptive Alt Text (Accessibility & SEO)', curAlt, 240, true) +
          '</div>' +
          '<div>' +
            '<div class="admin-img-preview" style="height:220px; margin-top:0;">' +
              '<img id="preview-' + esc(slot.key) + '" src="' + esc(curUrl) + '" alt="' + esc(curAlt) + '" referrerpolicy="no-referrer">' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  container.innerHTML =
    '<form id="admin-site-images-form" class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div>' +
          '<h2>Live Background &amp; Section Images</h2>' +
          '<p style="font-size:13.5px; color:var(--muted); margin-top:4px;">Update any section background or page photograph live in Firestore. All changes sync immediately to the public site.</p>' +
        '</div>' +
        '<button type="submit" class="btn btn-primary" id="save-site-images-btn">Save All Images Live</button>' +
      '</div>' +
      cardsHtml +
      '<div style="display:flex; justify-content:flex-end; margin-top:12px;">' +
        '<button type="submit" class="btn btn-primary">Save All Images Live</button>' +
      '</div>' +
    '</form>';

  container.querySelectorAll('.site-img-preset').forEach((sel) => {
    sel.addEventListener('change', () => {
      if (sel.value === '') return;
      const preset = LICENSED_IMAGE_PRESETS[Number(sel.value)];
      const key = sel.dataset.key;
      const urlInp = document.getElementById('fld-' + key + '_url');
      const altInp = document.getElementById('fld-' + key + '_alt');
      const prevImg = document.getElementById('preview-' + key);
      if (preset && urlInp && altInp && prevImg) {
        urlInp.value = preset.url;
        altInp.value = preset.alt;
        prevImg.src = preset.url;
        prevImg.alt = preset.alt;
      }
    });
  });

  SITE_IMAGE_SLOTS.forEach((slot) => {
    const urlInp = document.getElementById('fld-' + slot.key + '_url');
    const prevImg = document.getElementById('preview-' + slot.key);
    if (urlInp && prevImg) {
      urlInp.addEventListener('input', () => {
        prevImg.src = urlInp.value.trim();
      });
    }
  });

  document.getElementById('admin-site-images-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-site-images-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await saveSiteImagesDoc(data);
      await refreshAllData();
      showToast('All site & background images updated live in Firestore.');
    } catch (err) {
      showToast('Error saving images: ' + err.message, true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save All Images Live';
    }
  });
}

// -----------------------------------------------------------------
// 3. Hero Carousel Slides Tab
// -----------------------------------------------------------------
function renderHeroTab(container) {
  const slides = SITE_DATA.heroSlides || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Homepage Rotating Hero Slides</h2>' +
        '<button type="button" class="btn btn-primary" id="add-hero-btn">Add Hero Slide</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Order</th><th>Headline &amp; Eyebrow</th><th>Alt Text</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          slides.map((sl) =>
            '<tr>' +
              '<td class="num">' + esc(sl.order) + '</td>' +
              '<td><strong>' + esc(sl.title) + '</strong><br><span style="color:var(--muted); font-size:12.5px;">' + esc(sl.eyebrow) + '</span></td>' +
              '<td style="max-width:260px; font-size:13px;">' + esc(sl.image_alt) + '</td>' +
              '<td>' + (sl.active !== false ? 'Active' : 'Hidden') + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-hero" data-id="' + esc(sl.id) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-hero" data-id="' + esc(sl.id) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-hero-btn').addEventListener('click', () => openHeroEditor(null));
  container.querySelectorAll('.edit-hero').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = slides.find((x) => x.id === btn.dataset.id);
      openHeroEditor(item);
    });
  });
  container.querySelectorAll('.del-hero').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await deleteCollectionItem('hero_slides', btn.dataset.id);
        await refreshAllData();
        showToast('Hero slide deleted.');
        renderTabContent();
      } catch (err) {
        showToast('Delete failed: ' + err.message, true);
      }
    });
  });
}

function openHeroEditor(item) {
  const sl = item || {
    id: 'slide-' + Date.now(),
    eyebrow: '',
    title: '',
    subtitle: '',
    primary_cta_label: 'Donate now',
    primary_cta_href: 'donate.html',
    secondary_cta_label: 'Learn more',
    secondary_cta_href: 'about.html',
    image_url: LICENSED_IMAGE_PRESETS[0].url,
    image_alt: LICENSED_IMAGE_PRESETS[0].alt,
    order: (SITE_DATA.heroSlides?.length || 0) + 1,
    active: true
  };

  openEditorModal(item ? 'Edit Hero Slide' : 'New Hero Slide',
    fieldInput('eyebrow', 'Eyebrow Text', sl.eyebrow, 100) +
    fieldInput('title', 'Main Headline', sl.title, 160, true) +
    fieldTextarea('subtitle', 'Supporting Description', sl.subtitle, 400) +
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('primary_cta_label', 'Primary Button Label', sl.primary_cta_label, 60) +
      fieldInput('primary_cta_href', 'Primary Button Link', sl.primary_cta_href, 200) +
      fieldInput('secondary_cta_label', 'Secondary Button Label', sl.secondary_cta_label, 60) +
      fieldInput('secondary_cta_href', 'Secondary Button Link', sl.secondary_cta_href, 200) +
      fieldInput('order', 'Display Order', sl.order, 10, true, 'number') +
      fieldCheckbox('active', 'Active on Homepage', sl.active !== false) +
    '</div>' +
    imagePickerFields(sl.image_url, sl.image_alt),
    async (data) => {
      await upsertCollectionItem('hero_slides', sl.id, { ...data, active: data.active === 'on' });
    }
  );
}

// -----------------------------------------------------------------
// 4. Programmes & Impact Stats Tab
// -----------------------------------------------------------------
function renderProgrammesAndStatsTab(container) {
  const progs = SITE_DATA.programmes || [];
  const stats = SITE_DATA.stats || { section_note: '', items: [] };

  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Core Programmes ("What We Do")</h2>' +
        '<button type="button" class="btn btn-primary" id="add-prog-btn">Add Programme</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Order</th><th>Title</th><th>Link</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          progs.map((p) =>
            '<tr>' +
              '<td class="num">' + esc(p.order) + '</td>' +
              '<td><strong>' + esc(p.title) + '</strong><br><span style="color:var(--muted); font-size:13px;">' + esc(p.description) + '</span></td>' +
              '<td>' + esc(p.link_href) + '</td>' +
              '<td>' + (p.active !== false ? 'Active' : 'Hidden') + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-prog" data-id="' + esc(p.id) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-prog" data-id="' + esc(p.id) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>' +
    '<form id="admin-stats-form" class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Impact Numbers (Only Verified Figures)</h2>' +
        '<button type="submit" class="btn btn-primary">Save Impact Stats</button>' +
      '</div>' +
      fieldInput('section_note', 'Verification Disclaimer Note', stats.section_note, 300, true) +
      '<div id="stats-rows">' +
        (stats.items || []).map((st, idx) =>
          '<div class="admin-form-grid admin-form-grid-2" style="padding:12px; border:1px solid #DCE0DC; border-radius:8px; margin-bottom:12px;">' +
            fieldInput('stat_value_' + idx, 'Stat ' + (idx + 1) + ' Value', st.value, 60, true) +
            fieldInput('stat_label_' + idx, 'Stat ' + (idx + 1) + ' Label', st.label, 80, true) +
            fieldInput('stat_note_' + idx, 'Stat ' + (idx + 1) + ' Context Note', st.note, 120) +
          '</div>'
        ).join('') +
      '</div>' +
    '</form>';

  document.getElementById('add-prog-btn').addEventListener('click', () => openProgrammeEditor(null));
  container.querySelectorAll('.edit-prog').forEach((btn) => {
    btn.addEventListener('click', () => openProgrammeEditor(progs.find((x) => x.id === btn.dataset.id)));
  });
  container.querySelectorAll('.del-prog').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('programmes', btn.dataset.id);
      await refreshAllData();
      showToast('Programme removed.');
      renderTabContent();
    });
  });

  document.getElementById('admin-stats-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const items = (stats.items || []).map((_, idx) => ({
      value: fd.get('stat_value_' + idx),
      label: fd.get('stat_label_' + idx),
      note: fd.get('stat_note_' + idx)
    }));
    try {
      await saveStatsDoc({ section_note: fd.get('section_note'), items });
      await refreshAllData();
      showToast('Impact stats saved.');
    } catch (err) {
      showToast('Error: ' + err.message, true);
    }
  });
}

function openProgrammeEditor(item) {
  const p = item || {
    id: 'prog-' + Date.now(),
    title: '',
    description: '',
    link_label: 'Learn more',
    link_href: 'campaigns.html',
    icon_key: 'community',
    order: (SITE_DATA.programmes?.length || 0) + 1,
    active: true
  };
  openEditorModal(item ? 'Edit Programme' : 'New Programme',
    fieldInput('title', 'Programme Title', p.title, 120, true) +
    fieldTextarea('description', 'Description', p.description, 400, true) +
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('link_label', 'Link Label', p.link_label, 60, true) +
      fieldInput('link_href', 'Link URL', p.link_href, 200, true) +
      fieldSelect('icon_key', 'Icon', p.icon_key, [
        { value: 'children', label: 'Child Education / Books' },
        { value: 'qurbani', label: 'Location / Qurbani' },
        { value: 'food', label: 'Food Relief' },
        { value: 'water', label: 'Clean Water' },
        { value: 'community', label: 'Community Care' }
      ]) +
      fieldInput('order', 'Order', p.order, 10, true, 'number') +
    '</div>' +
    fieldCheckbox('active', 'Active', p.active !== false),
    async (data) => {
      await upsertCollectionItem('programmes', p.id, { ...data, active: data.active === 'on' });
    }
  );
}

// -----------------------------------------------------------------
// 5. Campaigns Tab
// -----------------------------------------------------------------
function renderCampaignsTab(container) {
  const list = SITE_DATA.campaigns || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Campaigns</h2>' +
        '<button type="button" class="btn btn-primary" id="add-camp-btn">Add Campaign</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Title</th><th>Location</th><th>Raised / Target</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          list.map((c) =>
            '<tr>' +
              '<td><strong>' + esc(c.title) + '</strong><br><span style="color:var(--muted); font-size:12px;">slug: ' + esc(c.slug) + '</span></td>' +
              '<td>' + esc(c.location) + '</td>' +
              '<td class="num">' + esc(c.currency) + ' ' + Number(c.raised_amount || 0).toLocaleString() + ' / ' + Number(c.target_amount || 0).toLocaleString() + '</td>' +
              '<td>' + (c.active !== false ? 'Active' : 'Hidden') + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-camp" data-id="' + esc(c.id || c.slug) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-camp" data-id="' + esc(c.id || c.slug) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-camp-btn').addEventListener('click', () => openCampaignEditor(null));
  container.querySelectorAll('.edit-camp').forEach((btn) => {
    btn.addEventListener('click', () => openCampaignEditor(list.find((x) => (x.id || x.slug) === btn.dataset.id)));
  });
  container.querySelectorAll('.del-camp').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('campaigns', btn.dataset.id);
      await refreshAllData();
      showToast('Campaign deleted.');
      renderTabContent();
    });
  });
}

function openCampaignEditor(item) {
  const c = item || {
    id: 'campaign-' + Date.now(),
    slug: '',
    title: '',
    summary: '',
    description: '',
    image_url: LICENSED_IMAGE_PRESETS[3].url,
    image_alt: LICENSED_IMAGE_PRESETS[3].alt,
    target_amount: 0,
    raised_amount: 0,
    currency: 'USD',
    location: 'Uganda',
    order: (SITE_DATA.campaigns?.length || 0) + 1,
    active: true
  };
  openEditorModal(item ? 'Edit Campaign' : 'New Campaign',
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('title', 'Campaign Title', c.title, 160, true) +
      fieldInput('slug', 'URL Slug (lowercase, hyphens)', c.slug, 100) +
      fieldInput('location', 'Location', c.location, 120, true) +
      fieldInput('currency', 'Currency Code', c.currency, 10, true) +
      fieldInput('target_amount', 'Target Amount', c.target_amount, 20, true, 'number') +
      fieldInput('raised_amount', 'Raised Amount', c.raised_amount, 20, true, 'number') +
      fieldInput('order', 'Order', c.order || 1, 10, false, 'number') +
      fieldCheckbox('active', 'Active on Website', c.active !== false) +
    '</div>' +
    fieldTextarea('summary', 'Short Card Summary', c.summary, 400, true) +
    fieldTextarea('description', 'Full Campaign Description', c.description, 4000, true) +
    imagePickerFields(c.image_url, c.image_alt),
    async (data) => {
      const targetId = item ? (c.id || c.slug) : (data.slug || c.id);
      await upsertCollectionItem('campaigns', targetId, { ...data, active: data.active === 'on' });
    }
  );
}

// -----------------------------------------------------------------
// 6. Qurbani Options Tab
// -----------------------------------------------------------------
function renderQurbaniTab(container) {
  const list = SITE_DATA.qurbaniOptions || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Qurbani / Udhiya Share Options</h2>' +
        '<button type="button" class="btn btn-primary" id="add-qurb-btn">Add Qurbani Option</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Order</th><th>Option</th><th>Share Note</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          list.map((q) =>
            '<tr>' +
              '<td class="num">' + esc(q.order) + '</td>' +
              '<td><strong>' + esc(q.label) + '</strong></td>' +
              '<td>' + esc(q.note) + '</td>' +
              '<td class="num">' + (q.price > 0 ? esc(q.currency || 'USD') + ' ' + Number(q.price).toLocaleString() : 'Confirm on WhatsApp') + '</td>' +
              '<td>' + (q.available !== false ? 'Available' : 'Unavailable') + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-qurb" data-id="' + esc(q.id) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-qurb" data-id="' + esc(q.id) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-qurb-btn').addEventListener('click', () => openQurbaniEditor(null));
  container.querySelectorAll('.edit-qurb').forEach((btn) => {
    btn.addEventListener('click', () => openQurbaniEditor(list.find((x) => x.id === btn.dataset.id)));
  });
  container.querySelectorAll('.del-qurb').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('qurbani_options', btn.dataset.id);
      await refreshAllData();
      showToast('Qurbani option deleted.');
      renderTabContent();
    });
  });
}

function openQurbaniEditor(item) {
  const q = item || {
    id: 'qurb-' + Date.now(),
    label: '',
    note: '',
    price: 0,
    currency: 'USD',
    order: (SITE_DATA.qurbaniOptions?.length || 0) + 1,
    available: true
  };
  openEditorModal(item ? 'Edit Qurbani Option' : 'New Qurbani Option',
    fieldInput('label', 'Animal / Share Label', q.label, 100, true) +
    fieldInput('note', 'Share Note (e.g. One of seven shares)', q.note, 120, true) +
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('price', 'Price (0 = confirm via WhatsApp)', q.price, 20, true, 'number') +
      fieldInput('currency', 'Currency', q.currency || 'USD', 10, true) +
      fieldInput('order', 'Order', q.order, 10, true, 'number') +
      fieldCheckbox('available', 'Available for Reservation', q.available !== false) +
    '</div>',
    async (data) => {
      await upsertCollectionItem('qurbani_options', q.id, { ...data, available: data.available === 'on' });
    }
  );
}

// -----------------------------------------------------------------
// 7. Stories Tab
// -----------------------------------------------------------------
function renderStoriesTab(container) {
  const list = SITE_DATA.stories || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Field Stories</h2>' +
        '<button type="button" class="btn btn-primary" id="add-story-btn">Add Story</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Title</th><th>Published</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          list.map((st) =>
            '<tr>' +
              '<td><strong>' + esc(st.title) + '</strong><br><span style="color:var(--muted); font-size:13px;">' + esc(st.excerpt) + '</span></td>' +
              '<td class="num">' + esc(String(st.published_at || '').slice(0, 10)) + '</td>' +
              '<td>' + (st.active !== false ? 'Published' : 'Draft') + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-story" data-id="' + esc(st.id || st.slug) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-story" data-id="' + esc(st.id || st.slug) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-story-btn').addEventListener('click', () => openStoryEditor(null));
  container.querySelectorAll('.edit-story').forEach((btn) => {
    btn.addEventListener('click', () => openStoryEditor(list.find((x) => (x.id || x.slug) === btn.dataset.id)));
  });
  container.querySelectorAll('.del-story').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('stories', btn.dataset.id);
      await refreshAllData();
      showToast('Story deleted.');
      renderTabContent();
    });
  });
}

function openStoryEditor(item) {
  const st = item || {
    id: 'story-' + Date.now(),
    slug: '',
    title: '',
    excerpt: '',
    body: '',
    image_url: LICENSED_IMAGE_PRESETS[0].url,
    image_alt: LICENSED_IMAGE_PRESETS[0].alt,
    published_at: new Date().toISOString().slice(0, 10),
    active: true
  };
  openEditorModal(item ? 'Edit Story' : 'New Field Story',
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('title', 'Story Headline', st.title, 180, true) +
      fieldInput('slug', 'URL Slug', st.slug, 100) +
      fieldInput('published_at', 'Publish Date (YYYY-MM-DD)', String(st.published_at || '').slice(0, 10), 60, true) +
      fieldCheckbox('active', 'Published on Website', st.active !== false) +
    '</div>' +
    fieldTextarea('excerpt', 'Short Excerpt', st.excerpt, 400, true) +
    fieldTextarea('body', 'Full Story Body', st.body, 8000, true) +
    imagePickerFields(st.image_url, st.image_alt),
    async (data) => {
      const targetId = item ? (st.id || st.slug) : (data.slug || st.id);
      await upsertCollectionItem('stories', targetId, { ...data, active: data.active === 'on' });
    }
  );
}

// -----------------------------------------------------------------
// 8. Media Gallery Tab
// -----------------------------------------------------------------
function renderMediaTab(container) {
  const list = SITE_DATA.media || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Media Gallery &amp; Image Licensing</h2>' +
        '<button type="button" class="btn btn-primary" id="add-media-btn">Add Media Item</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Title</th><th>Type</th><th>Alt Text</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          list.map((m) =>
            '<tr>' +
              '<td><strong>' + esc(m.title) + '</strong><br><span style="color:var(--muted); font-size:12.5px;">' + esc(m.caption) + '</span></td>' +
              '<td>' + esc(m.media_type) + '</td>' +
              '<td style="max-width:260px; font-size:13px;">' + esc(m.image_alt) + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-media" data-id="' + esc(m.id || m.slug) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-media" data-id="' + esc(m.id || m.slug) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-media-btn').addEventListener('click', () => openMediaEditor(null));
  container.querySelectorAll('.edit-media').forEach((btn) => {
    btn.addEventListener('click', () => openMediaEditor(list.find((x) => (x.id || x.slug) === btn.dataset.id)));
  });
  container.querySelectorAll('.del-media').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('media', btn.dataset.id);
      await refreshAllData();
      showToast('Media item deleted.');
      renderTabContent();
    });
  });
}

function openMediaEditor(item) {
  const m = item || {
    id: 'media-' + Date.now(),
    slug: '',
    title: '',
    caption: '',
    media_type: 'photo',
    image_url: LICENSED_IMAGE_PRESETS[0].url,
    video_url: '',
    image_alt: LICENSED_IMAGE_PRESETS[0].alt,
    license_note: 'Licensed foundation editorial asset — Mustaqiim Relief and Charity Foundation',
    featured: true,
    order: (SITE_DATA.media?.length || 0) + 1,
    active: true
  };
  openEditorModal(item ? 'Edit Media Item' : 'New Media Item',
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('title', 'Title', m.title, 160, true) +
      fieldInput('slug', 'URL Slug', m.slug, 100) +
      fieldSelect('media_type', 'Media Type', m.media_type, [
        { value: 'photo', label: 'Photograph' },
        { value: 'video', label: 'Video' }
      ]) +
      fieldInput('order', 'Order', m.order || 1, 10, false, 'number') +
    '</div>' +
    fieldInput('caption', 'Caption', m.caption, 400) +
    fieldInput('license_note', 'License / Attribution Note', m.license_note, 240) +
    fieldInput('video_url', 'Video File URL (only if type is Video)', m.video_url, 500) +
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldCheckbox('featured', 'Feature on Homepage', m.featured !== false) +
      fieldCheckbox('active', 'Active in Gallery', m.active !== false) +
    '</div>' +
    imagePickerFields(m.image_url, m.image_alt),
    async (data) => {
      const targetId = item ? (m.id || m.slug) : (data.slug || m.id);
      await upsertCollectionItem('media', targetId, {
        ...data,
        featured: data.featured === 'on',
        active: data.active === 'on'
      });
    }
  );
}

// -----------------------------------------------------------------
// 9. FAQs Tab
// -----------------------------------------------------------------
function renderFaqsTab(container) {
  const list = SITE_DATA.faqs || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Frequently Asked Questions</h2>' +
        '<button type="button" class="btn btn-primary" id="add-faq-btn">Add FAQ</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Order</th><th>Question</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          list.map((f) =>
            '<tr>' +
              '<td class="num">' + esc(f.order) + '</td>' +
              '<td><strong>' + esc(f.question) + '</strong><br><span style="color:var(--muted); font-size:13px;">' + esc(f.answer) + '</span></td>' +
              '<td>' + (f.active !== false ? 'Active' : 'Hidden') + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-faq" data-id="' + esc(f.id) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-faq" data-id="' + esc(f.id) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-faq-btn').addEventListener('click', () => openFaqEditor(null));
  container.querySelectorAll('.edit-faq').forEach((btn) => {
    btn.addEventListener('click', () => openFaqEditor(list.find((x) => x.id === btn.dataset.id)));
  });
  container.querySelectorAll('.del-faq').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('faqs', btn.dataset.id);
      await refreshAllData();
      showToast('FAQ removed.');
      renderTabContent();
    });
  });
}

function openFaqEditor(item) {
  const f = item || {
    id: 'faq-' + Date.now(),
    question: '',
    answer: '',
    order: (SITE_DATA.faqs?.length || 0) + 1,
    active: true
  };
  openEditorModal(item ? 'Edit FAQ' : 'New FAQ',
    fieldInput('question', 'Question', f.question, 240, true) +
    fieldTextarea('answer', 'Answer', f.answer, 2000, true) +
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('order', 'Order', f.order, 10, true, 'number') +
      fieldCheckbox('active', 'Active', f.active !== false) +
    '</div>',
    async (data) => {
      await upsertCollectionItem('faqs', f.id, { ...data, active: data.active === 'on' });
    }
  );
}

// -----------------------------------------------------------------
// 10. Donation Tiers Tab
// -----------------------------------------------------------------
function renderTiersTab(container) {
  const list = SITE_DATA.donationTiers || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Illustrative Donation Tiers</h2>' +
        '<button type="button" class="btn btn-primary" id="add-tier-btn">Add Tier</button>' +
      '</div>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Order</th><th>Amount</th><th>Title</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          list.map((t) =>
            '<tr>' +
              '<td class="num">' + esc(t.order) + '</td>' +
              '<td class="num"><strong>' + esc(t.currency) + ' ' + esc(t.amount) + '</strong></td>' +
              '<td><strong>' + esc(t.title) + '</strong><br><span style="color:var(--muted); font-size:13px;">' + esc(t.description) + '</span></td>' +
              '<td>' + (t.active !== false ? 'Active' : 'Hidden') + '</td>' +
              '<td class="admin-row-actions">' +
                '<button type="button" class="btn-xs edit-tier" data-id="' + esc(t.id) + '">Edit</button>' +
                '<button type="button" class="btn-xs btn-xs-danger del-tier" data-id="' + esc(t.id) + '">Delete</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-tier-btn').addEventListener('click', () => openTierEditor(null));
  container.querySelectorAll('.edit-tier').forEach((btn) => {
    btn.addEventListener('click', () => openTierEditor(list.find((x) => x.id === btn.dataset.id)));
  });
  container.querySelectorAll('.del-tier').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('donation_tiers', btn.dataset.id);
      await refreshAllData();
      showToast('Tier deleted.');
      renderTabContent();
    });
  });
}

function openTierEditor(item) {
  const t = item || {
    id: 'tier-' + Date.now(),
    amount: 10,
    currency: 'USD',
    title: '',
    description: '',
    order: (SITE_DATA.donationTiers?.length || 0) + 1,
    active: true
  };
  openEditorModal(item ? 'Edit Donation Tier' : 'New Donation Tier',
    '<div class="admin-form-grid admin-form-grid-2">' +
      fieldInput('amount', 'Amount (minimum 3)', t.amount, 10, true, 'number') +
      fieldInput('currency', 'Currency', t.currency || 'USD', 10, true) +
      fieldInput('title', 'Tier Title', t.title, 100, true) +
      fieldInput('order', 'Order', t.order, 10, true, 'number') +
    '</div>' +
    fieldTextarea('description', 'Illustrative Description', t.description, 300, true) +
    fieldCheckbox('active', 'Active', t.active !== false),
    async (data) => {
      await upsertCollectionItem('donation_tiers', t.id, { ...data, active: data.active === 'on' });
    }
  );
}

// -----------------------------------------------------------------
// 11. Legal Policy Dates Tab
// -----------------------------------------------------------------
function renderLegalTab(container) {
  const l = SITE_DATA.legal || {};
  container.innerHTML =
    '<form id="admin-legal-form" class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Legal Policy Effective Dates</h2>' +
        '<button type="submit" class="btn btn-primary">Save Policy Dates</button>' +
      '</div>' +
      '<div class="admin-form-grid admin-form-grid-2">' +
        fieldInput('privacy_updated', 'Privacy Policy Last Updated', l.privacy_updated, 80, true) +
        fieldInput('terms_updated', 'Terms of Service Last Updated', l.terms_updated, 80, true) +
        fieldInput('refund_updated', 'Refund Policy Last Updated', l.refund_updated, 80, true) +
        fieldInput('cookie_updated', 'Cookie Policy Last Updated', l.cookie_updated, 80, true) +
        fieldInput('donation_policy_updated', 'Donation Policy Last Updated', l.donation_policy_updated, 80) +
        fieldInput('data_deletion_updated', 'Data Deletion Page Last Updated', l.data_deletion_updated, 80) +
      '</div>' +
      '<div style="margin-top:16px;">' +
        fieldTextarea('privacy_contact_note', 'Privacy Officer Contact Note', l.privacy_contact_note, 400) +
      '</div>' +
    '</form>';

  document.getElementById('admin-legal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await saveLegalDoc(data);
      await refreshAllData();
      showToast('Legal dates updated.');
    } catch (err) {
      showToast('Error: ' + err.message, true);
    }
  });
}

// -----------------------------------------------------------------
// 12. Inquiries & Data Deletion Requests Tab
// -----------------------------------------------------------------
function renderRequestsTab(container) {
  const inquiries = PROTECTED_DATA.contact_inquiries || [];
  const deletions = PROTECTED_DATA.data_deletion_requests || [];

  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Data Deletion &amp; Access Requests</h2></div>' +
      (deletions.length === 0
        ? '<p style="color:var(--muted);">No data deletion requests submitted.</p>'
        : '<div class="admin-table-wrap"><table class="admin-table">' +
            '<thead><tr><th>Requester</th><th>Contact</th><th>Type</th><th>Details</th><th>Status</th><th>Actions</th></tr></thead>' +
            '<tbody>' +
              deletions.map((r) =>
                '<tr>' +
                  '<td><strong>' + esc(r.requester_name) + '</strong></td>' +
                  '<td>' + esc(r.contact_info) + '</td>' +
                  '<td>' + esc(r.request_type) + '</td>' +
                  '<td style="max-width:260px;">' + esc(r.details || '—') + '</td>' +
                  '<td><strong>' + esc(r.status) + '</strong></td>' +
                  '<td class="admin-row-actions">' +
                    (r.status !== 'completed' ? '<button type="button" class="btn-xs mark-del-done" data-id="' + esc(r.id) + '">Mark Completed</button>' : '') +
                    '<button type="button" class="btn-xs btn-xs-danger rm-del-req" data-id="' + esc(r.id) + '">Delete Record</button>' +
                  '</td>' +
                '</tr>'
              ).join('') +
            '</tbody>' +
          '</table></div>') +
    '</div>' +
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Contact Form Inquiries</h2></div>' +
      (inquiries.length === 0
        ? '<p style="color:var(--muted);">No contact inquiries submitted yet.</p>'
        : '<div class="admin-table-wrap"><table class="admin-table">' +
            '<thead><tr><th>Name</th><th>Contact</th><th>Subject &amp; Message</th><th>Status</th><th>Actions</th></tr></thead>' +
            '<tbody>' +
              inquiries.map((q) =>
                '<tr>' +
                  '<td><strong>' + esc(q.name) + '</strong></td>' +
                  '<td>' + esc(q.contact_value) + '</td>' +
                  '<td style="max-width:300px;"><strong>' + esc(q.subject) + '</strong><br>' + esc(q.message) + '</td>' +
                  '<td><strong>' + esc(q.status) + '</strong></td>' +
                  '<td class="admin-row-actions">' +
                    (q.status !== 'resolved' ? '<button type="button" class="btn-xs mark-inq-done" data-id="' + esc(q.id) + '">Mark Resolved</button>' : '') +
                    '<button type="button" class="btn-xs btn-xs-danger rm-inq-req" data-id="' + esc(q.id) + '">Delete Record</button>' +
                  '</td>' +
                '</tr>'
              ).join('') +
            '</tbody>' +
          '</table></div>') +
    '</div>';

  container.querySelectorAll('.mark-del-done').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await updateRequestStatus('data_deletion_requests', btn.dataset.id, 'completed');
      await refreshAllData();
      showToast('Marked as completed.');
      renderTabContent();
    });
  });
  container.querySelectorAll('.rm-del-req').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('data_deletion_requests', btn.dataset.id);
      await refreshAllData();
      showToast('Deletion request record erased.');
      renderTabContent();
    });
  });
  container.querySelectorAll('.mark-inq-done').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await updateRequestStatus('contact_inquiries', btn.dataset.id, 'resolved');
      await refreshAllData();
      showToast('Inquiry marked resolved.');
      renderTabContent();
    });
  });
  container.querySelectorAll('.rm-inq-req').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('contact_inquiries', btn.dataset.id);
      await refreshAllData();
      showToast('Inquiry record permanently deleted.');
      renderTabContent();
    });
  });
}

// -----------------------------------------------------------------
// 13. Admin Access Tab
// -----------------------------------------------------------------
function renderAdminsTab(container) {
  const admins = PROTECTED_DATA.admins || [];
  container.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header"><h2>Authorized Administrators</h2></div>' +
      '<p style="color:var(--muted); margin-bottom:16px;">Primary administrator <strong>maleham06@gmail.com</strong> is permanently authorized. Add additional team administrators by Firebase Auth UID below.</p>' +
      '<form id="add-admin-form" class="admin-form-grid admin-form-grid-2" style="margin-bottom:24px;">' +
        fieldInput('uid', 'Firebase User UID', '', 128, true) +
        fieldInput('email', 'Verified Google Email', '', 160, true) +
        fieldInput('display_name', 'Display Name', '', 120) +
        '<div style="display:flex; align-items:flex-end;"><button type="submit" class="btn btn-primary">Grant Admin Access</button></div>' +
      '</form>' +
      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>UID</th><th>Email</th><th>Name</th><th>Actions</th></tr></thead>' +
        '<tbody>' +
          '<tr><td class="num">Primary</td><td>maleham06@gmail.com</td><td>Super Admin (Bootstrapped)</td><td>Protected</td></tr>' +
          admins.map((a) =>
            '<tr>' +
              '<td class="num">' + esc(a.id) + '</td>' +
              '<td>' + esc(a.email) + '</td>' +
              '<td>' + esc(a.display_name || '—') + '</td>' +
              '<td><button type="button" class="btn-xs btn-xs-danger rm-admin" data-id="' + esc(a.id) + '">Revoke</button></td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>';

  document.getElementById('add-admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await addAdminRecord(fd.get('uid'), fd.get('email'), fd.get('display_name'));
      await refreshAllData();
      showToast('Administrator added.');
      renderTabContent();
    } catch (err) {
      showToast('Failed to add admin: ' + err.message, true);
    }
  });

  container.querySelectorAll('.rm-admin').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCollectionItem('admins', btn.dataset.id);
      await refreshAllData();
      showToast('Admin access revoked.');
      renderTabContent();
    });
  });
}

// -----------------------------------------------------------------
// Form Helpers & Reusable Modal Editor
// -----------------------------------------------------------------
function fieldInput(name, label, value, maxLen = 200, required = false, type = 'text') {
  return (
    '<div class="form-field">' +
      '<label class="form-label" for="fld-' + esc(name) + '">' + esc(label) + '</label>' +
      '<input class="form-input" id="fld-' + esc(name) + '" name="' + esc(name) + '" type="' + esc(type) + '"' +
      (type === 'number' ? ' step="any"' : ' maxlength="' + maxLen + '"') +
      (required ? ' required' : '') +
      ' value="' + esc(value == null ? '' : value) + '">' +
    '</div>'
  );
}

function fieldTextarea(name, label, value, maxLen = 2000, required = false) {
  return (
    '<div class="form-field">' +
      '<label class="form-label" for="fld-' + esc(name) + '">' + esc(label) + '</label>' +
      '<textarea class="form-textarea" id="fld-' + esc(name) + '" name="' + esc(name) + '" maxlength="' + maxLen + '"' +
      (required ? ' required' : '') + '>' + esc(value == null ? '' : value) + '</textarea>' +
    '</div>'
  );
}

function fieldSelect(name, label, currentVal, options) {
  return (
    '<div class="form-field">' +
      '<label class="form-label" for="fld-' + esc(name) + '">' + esc(label) + '</label>' +
      '<select class="form-select" id="fld-' + esc(name) + '" name="' + esc(name) + '">' +
        options.map((o) => '<option value="' + esc(o.value) + '"' + (o.value === currentVal ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
      '</select>' +
    '</div>'
  );
}

function fieldCheckbox(name, label, checked) {
  return (
    '<div class="consent-row" style="margin:0; align-items:center;">' +
      '<input type="checkbox" id="fld-' + esc(name) + '" name="' + esc(name) + '" ' + (checked ? 'checked' : '') + '>' +
      '<label for="fld-' + esc(name) + '" style="font-weight:600;">' + esc(label) + '</label>' +
    '</div>'
  );
}

function imagePickerFields(currentUrl, currentAlt) {
  const options = LICENSED_IMAGE_PRESETS.map((p, idx) =>
    '<option value="' + idx + '"' + (p.url === currentUrl ? ' selected' : '') + '>' + esc(p.label) + '</option>'
  ).join('');

  return (
    '<div style="border:1px solid #DCE0DC; border-radius:10px; padding:16px; margin-top:12px; background:#F7F6F1;">' +
      '<div class="form-field">' +
        '<label class="form-label" for="preset-img-select">Licensed Image Library Preset</label>' +
        '<select class="form-select" id="preset-img-select"><option value="">-- Choose a licensed image or enter custom URL below --</option>' + options + '</select>' +
      '</div>' +
      fieldInput('image_url', 'Image URL (local src/assets/images/... or HTTPS)', currentUrl, 500, true) +
      fieldInput('image_alt', 'Descriptive Alt Text (Required for Accessibility & Google SEO)', currentAlt, 240, true) +
      '<div class="admin-img-preview"><img id="editor-img-preview" src="' + esc(currentUrl || '') + '" alt="' + esc(currentAlt || 'Image preview') + '"></div>' +
    '</div>'
  );
}

function openEditorModal(title, bodyHtml, onSave) {
  const existing = document.getElementById('admin-editor-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'admin-editor-modal';
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.innerHTML =
    '<div class="modal-dialog modal-dialog-lg">' +
      '<div class="modal-header">' +
        '<h2>' + esc(title) + '</h2>' +
        '<button type="button" class="modal-close" id="editor-close-btn" aria-label="Close editor">&times;</button>' +
      '</div>' +
      '<form id="admin-modal-form">' +
        bodyHtml +
        '<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">' +
          '<button type="button" class="btn btn-outline" id="editor-cancel-btn">Cancel</button>' +
          '<button type="submit" class="btn btn-primary" id="editor-save-btn">Save Changes</button>' +
        '</div>' +
      '</form>' +
    '</div>';

  document.body.appendChild(backdrop);

  const presetSel = document.getElementById('preset-img-select');
  const urlInp = document.getElementById('fld-image_url');
  const altInp = document.getElementById('fld-image_alt');
  const previewImg = document.getElementById('editor-img-preview');

  if (presetSel && urlInp && altInp && previewImg) {
    presetSel.addEventListener('change', () => {
      if (presetSel.value === '') return;
      const preset = LICENSED_IMAGE_PRESETS[Number(presetSel.value)];
      if (preset) {
        urlInp.value = preset.url;
        if (!altInp.value.trim()) altInp.value = preset.alt;
        previewImg.src = preset.url;
        previewImg.alt = altInp.value;
      }
    });
    urlInp.addEventListener('input', () => {
      previewImg.src = urlInp.value;
    });
  }

  function close() {
    backdrop.remove();
  }
  document.getElementById('editor-close-btn').addEventListener('click', close);
  document.getElementById('editor-cancel-btn').addEventListener('click', close);

  document.getElementById('admin-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('editor-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await onSave(data);
      await refreshAllData();
      close();
      showToast('Saved to Firestore.');
      renderTabContent();
    } catch (err) {
      showToast('Save failed: ' + err.message, true);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });
}

// -----------------------------------------------------------------
// Boot Admin Auth Watcher
// -----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  watchAdminAuth(async (user) => {
    CURRENT_USER = user;
    if (!user) {
      renderAuthGate();
      return;
    }
    const isAllowed = await checkIsAdmin(user);
    if (!isAllowed) {
      renderAuthGate('Signed in as ' + (user.email || 'unknown account') + ', which does not have administrator permissions. Please sign in with maleham06@gmail.com or an authorized admin account.', true);
      return;
    }
    await refreshAllData();
    renderDashboardShell();
  });
});
})();
