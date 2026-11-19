// -----------------------------------------------------------------
// MASTER FRONTEND CONTROLLER — Mustaqiim Relief and Charity Foundation
// Handles shared header/footer, dropdown navigation, keyboard nav,
// Hero Carousel, Live Background/Site Images, Cookie Preferences,
// Forms, and live Firestore hydration.
// -----------------------------------------------------------------

import { DEFAULT_DATA } from './data.js';
import {
  loadLiveSiteData,
  submitContactInquiry,
  submitDataDeletionRequest
} from './firebase-db.js';

let DATA = window.MQ_DATA || structuredClone(DEFAULT_DATA);
let heroTimer = null;
let heroIndex = 0;
let heroPaused = false;
let leafletMap = null;
let dropdownDocBound = false;

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function currentPageName() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  return path === '' ? 'index.html' : path;
}

function getSlugParam() {
  return new URLSearchParams(window.location.search).get('slug');
}

function getProgrammeIcon(key) {
  switch (key) {
    case 'children':
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
    case 'qurbani':
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    case 'food':
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/></svg>';
    case 'water':
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';
    default:
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }
}

function renderImageMarkup(url, alt, eager = false) {
  const safeAlt = esc(alt || 'Mustaqiim Relief and Charity Foundation programme photograph');
  const safeUrl = esc(url || '');
  if (!safeUrl) {
    return '<span class="img-fallback-label">Licensed Foundation Media</span>';
  }
  const priorityAttr = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return (
    '<img src="' + safeUrl + '" alt="' + safeAlt + '" referrerpolicy="no-referrer" ' + priorityAttr +
    ' onerror="this.style.display=\'none\'; this.parentElement.insertAdjacentHTML(\'beforeend\', \'<span class=\\\'img-fallback-label\\\'>' + safeAlt + '</span>\');">'
  );
}

// -----------------------------------------------------------------
// 1. Header with Dropdown Lists & Keyboard-Accessible Mobile Drawer
// -----------------------------------------------------------------
const NAV_ITEMS = [
  { label: 'Home', href: 'index.html' },
  {
    label: 'About',
    id: 'about',
    children: [
      { label: 'Mission & Core Principles', desc: 'Our mission, vision, and Amanah values', href: 'about.html' },
      { label: 'Business Details', desc: 'Registration, hours, and Kampala base', href: 'about.html#business-details' },
      { label: 'Operational Map', desc: 'Nsambya coordination area', href: 'about.html#location-map' },
      { label: 'Frequently Asked Questions', desc: 'Answers on donations and Qurbani', href: 'faq.html' }
    ]
  },
  {
    label: 'Programmes',
    id: 'programmes',
    children: [
      { label: 'Helping Children in Uganda', desc: 'School kits, books, and daily nutrition', href: 'index.html#child-support' },
      { label: 'All Campaigns', desc: 'Active relief appeals across Uganda', href: 'campaigns.html' },
      { label: 'Qurbani / Udhiya 2026', desc: 'Livestock shares and Eid distribution', href: 'qurbani.html' },
      { label: 'Field Stories', desc: 'Community outreach reports and updates', href: 'stories.html' },
      { label: 'Media Gallery', desc: 'Licensed field and child care photos', href: 'gallery.html' }
    ]
  },
  { label: 'Stories', href: 'stories.html' },
  {
    label: 'Policies',
    id: 'policies',
    children: [
      { label: 'Privacy Policy', desc: 'Minimal data collection & donor rights', href: 'privacy-policy.html' },
      { label: 'Terms of Service', desc: 'Website and donation coordination terms', href: 'terms.html' },
      { label: 'Refund Policy', desc: 'Duplicate or erroneous gift refunds', href: 'refund-policy.html' },
      { label: 'Donation Policy', desc: 'Amanah allocation and age consent', href: 'donation-policy.html' },
      { label: 'Cookie Policy', desc: 'Essential storage and map preferences', href: 'cookie-policy.html' },
      { label: 'Data Deletion Request', desc: 'Request record access or erasure', href: 'data-deletion.html' }
    ]
  },
  { label: 'Contact', href: 'contact.html' }
];

const CHEVRON_SVG =
  '<svg class="nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="6 9 12 15 18 9"/>' +
  '</svg>';

function closeAllDesktopDropdowns(exceptEl = null) {
  document.querySelectorAll('.nav-dropdown').forEach((dd) => {
    if (dd !== exceptEl) {
      dd.classList.remove('open');
      const trigger = dd.querySelector('.nav-dropdown-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });
}

function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;

  const s = DATA.settings || {};
  const page = currentPageName();

  const navLinks = NAV_ITEMS.map((item) => {
    if (item.children) {
      const childPages = item.children.map((c) => c.href.split('#')[0]);
      const isActiveGroup = childPages.includes(page);
      const menuId = 'nav-menu-' + item.id;
      const itemsHtml = item.children.map((ch) =>
        '<li>' +
          '<a href="' + ch.href + '" class="nav-dropdown-link">' +
            '<strong>' + esc(ch.label) + '</strong>' +
            '<span>' + esc(ch.desc) + '</span>' +
          '</a>' +
        '</li>'
      ).join('');
      return (
        '<div class="nav-dropdown" data-dropdown="' + item.id + '">' +
          '<button type="button" class="nav-dropdown-trigger" aria-expanded="false" aria-controls="' + menuId + '" aria-haspopup="true"' +
          (isActiveGroup ? ' style="color:var(--forest-dark); font-weight:600;"' : '') + '>' +
            esc(item.label) + CHEVRON_SVG +
          '</button>' +
          '<ul class="nav-dropdown-menu" id="' + menuId + '" role="menu">' + itemsHtml + '</ul>' +
        '</div>'
      );
    }
    const active = page === item.href ? ' aria-current="page"' : '';
    return '<a href="' + item.href + '" class="nav-link"' + active + '>' + esc(item.label) + '</a>';
  }).join('');

  const mobileLinks = NAV_ITEMS.map((item) => {
    if (item.children) {
      const subHtml = item.children.map((ch) =>
        '<a href="' + ch.href + '" class="mobile-sublink">' + esc(ch.label) + '</a>'
      ).join('');
      return (
        '<div class="mobile-group">' +
          '<button type="button" class="mobile-group-btn" aria-expanded="false">' +
            '<span>' + esc(item.label) + '</span>' + CHEVRON_SVG +
          '</button>' +
          '<div class="mobile-sublinks">' + subHtml + '</div>' +
        '</div>'
      );
    }
    const active = page === item.href ? ' aria-current="page"' : '';
    return '<a href="' + item.href + '" class="mobile-link"' + active + '>' + esc(item.label) + '</a>';
  }).join('');

  el.innerHTML =
    '<div class="announcement-bar">' +
      '<span>' + esc(s.announcement_text || '') + '</span>' +
      '<a href="qurbani.html">Reserve Qurbani</a>' +
    '</div>' +
    '<div class="header-bar">' +
      '<div class="container header-inner">' +
        '<a href="index.html" class="brand" aria-label="Mustaqiim Relief and Charity Foundation Home">' +
          '<span class="logo-mark" aria-hidden="true">M</span>' +
          '<span class="brand-wordmark">Mustaqiim</span>' +
        '</a>' +
        '<nav class="main-nav" aria-label="Primary navigation">' + navLinks + '</nav>' +
        '<div class="header-actions">' +
          '<a href="donate.html" class="donate-btn-header">Donate</a>' +
          '<button type="button" class="menu-btn" id="menu-btn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path d="M3 6h18"></path><path d="M3 12h18"></path><path d="M3 18h18"></path>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation">' +
        '<div class="container">' +
          mobileLinks +
          '<a href="donate.html" class="mobile-donate">Donate</a>' +
        '</div>' +
      '</nav>' +
    '</div>';

  // Bind desktop dropdown toggles + keyboard nav
  el.querySelectorAll('.nav-dropdown').forEach((dd) => {
    const trigger = dd.querySelector('.nav-dropdown-trigger');
    const menuLinks = dd.querySelectorAll('.nav-dropdown-link');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !dd.classList.contains('open');
      closeAllDesktopDropdowns(dd);
      dd.classList.toggle('open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeAllDesktopDropdowns(dd);
        dd.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        if (menuLinks[0]) menuLinks[0].focus();
      } else if (e.key === 'Escape') {
        closeAllDesktopDropdowns();
        trigger.focus();
      }
    });

    dd.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDesktopDropdowns();
        trigger.focus();
      }
    });
  });

  // Bind mobile accordion submenus
  el.querySelectorAll('.mobile-group-btn').forEach((gbtn) => {
    gbtn.addEventListener('click', () => {
      const grp = gbtn.closest('.mobile-group');
      const isOpen = grp.classList.toggle('open');
      gbtn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  const btn = document.getElementById('menu-btn');
  const mnav = document.getElementById('mobile-nav');
  if (btn && mnav) {
    btn.addEventListener('click', () => {
      const isOpen = mnav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });
    mnav.querySelectorAll('a').forEach((lnk) => {
      lnk.addEventListener('click', () => {
        mnav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (!dropdownDocBound) {
    dropdownDocBound = true;
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-dropdown')) {
        closeAllDesktopDropdowns();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDesktopDropdowns();
        const mobNav = document.getElementById('mobile-nav');
        const menuBtn = document.getElementById('menu-btn');
        if (mobNav && mobNav.classList.contains('open')) {
          mobNav.classList.remove('open');
          if (menuBtn) {
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.focus();
          }
        }
      }
    });
  }
}

// -----------------------------------------------------------------
// 2. Live Background & Section Images Hydration
// -----------------------------------------------------------------
function hydrateSiteImages() {
  const imgs = { ...(DEFAULT_DATA.images || {}), ...(DATA.images || {}) };
  document.querySelectorAll('img[data-site-image]').forEach((imgEl) => {
    const key = imgEl.dataset.siteImage;
    const url = imgs[key + '_url'];
    const alt = imgs[key + '_alt'];
    if (url && imgEl.getAttribute('src') !== url) {
      imgEl.src = url;
      imgEl.style.display = 'block';
    }
    if (alt) {
      imgEl.alt = alt;
    }
  });
}

// -----------------------------------------------------------------
// 3. Scroll Reveal Transitions
// -----------------------------------------------------------------
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof IntersectionObserver === 'undefined') {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );

  items.forEach((el) => observer.observe(el));
}

// -----------------------------------------------------------------
// 4. Footer & Cookie Preferences
// -----------------------------------------------------------------
function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;

  const s = DATA.settings || {};
  const emailLine = s.public_email
    ? '<li><a href="mailto:' + esc(s.public_email) + '">' + esc(s.public_email) + '</a></li>'
    : '<li><a href="contact.html">Direct Inquiry Form</a></li>';

  const socialItems = [];
  if (s.facebook_url) {
    socialItems.push('<li><a href="' + esc(s.facebook_url) + '" target="_blank" rel="noreferrer noopener">Facebook</a></li>');
  }
  if (s.instagram_url) {
    socialItems.push('<li><a href="' + esc(s.instagram_url) + '" target="_blank" rel="noreferrer noopener">Instagram</a></li>');
  }

  el.innerHTML =
    '<footer class="site-footer">' +
      '<div class="container footer-grid">' +
        '<div>' +
          '<h2 class="footer-brand-title">' + esc(s.organisation_name || 'Mustaqiim Relief and Charity Foundation') + '</h2>' +
          '<p class="footer-text">' + esc(s.footer_mission || '') + '</p>' +
          '<p class="footer-location">' + esc(s.address_line || s.map_label || 'Nsambya, Kampala, Uganda') + '</p>' +
          '<p class="footer-text" style="margin-top:6px; font-size:13px;">Hours: ' + esc(s.operational_hours || 'Mon–Sat, 08:30–17:30 EAT') + '</p>' +
        '</div>' +
        '<div>' +
          '<h3 class="footer-col-title">Programmes</h3>' +
          '<ul class="footer-list">' +
            '<li><a href="index.html#child-support">Helping Children in Uganda</a></li>' +
            '<li><a href="about.html">About Us</a></li>' +
            '<li><a href="qurbani.html">Qurbani / Udhiya</a></li>' +
            '<li><a href="campaigns.html">Campaigns</a></li>' +
            '<li><a href="stories.html">Field Stories</a></li>' +
            '<li><a href="gallery.html">Media Gallery</a></li>' +
            '<li><a href="faq.html">FAQ</a></li>' +
          '</ul>' +
        '</div>' +
        '<div>' +
          '<h3 class="footer-col-title">Contact &amp; Management</h3>' +
          '<ul class="footer-list">' +
            '<li><a href="https://wa.me/' + esc(s.phone_international) + '" target="_blank" rel="noreferrer noopener">WhatsApp: ' + esc(s.phone_display) + '</a></li>' +
            emailLine +
            '<li><a href="contact.html">Contact Us</a></li>' +
            socialItems.join('') +
            '<li><a href="admin.html">Admin Dashboard</a></li>' +
          '</ul>' +
        '</div>' +
        '<div>' +
          '<h3 class="footer-col-title">Legal &amp; Privacy</h3>' +
          '<ul class="footer-list">' +
            '<li><a href="privacy-policy.html">Privacy Policy</a></li>' +
            '<li><a href="terms.html">Terms of Service</a></li>' +
            '<li><a href="refund-policy.html">Refund Policy</a></li>' +
            '<li><a href="cookie-policy.html">Cookie Policy</a></li>' +
            '<li><a href="donation-policy.html">Donation Policy</a></li>' +
            '<li><a href="data-deletion.html">Data Deletion Request</a></li>' +
            '<li><button type="button" id="footer-cookie-btn" style="text-align:left; text-decoration:underline; color:var(--gold-light); font-size:13.5px;">Manage Cookie Preferences</button></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="container footer-bottom">' +
        '<span>&copy; ' + new Date().getFullYear() + ' ' + esc(s.organisation_name || '') + '. All rights reserved.</span>' +
        '<span>All site photography is licensed or proprietary to the Foundation.</span>' +
      '</div>' +
    '</footer>';

  const cookieBtn = document.getElementById('footer-cookie-btn');
  if (cookieBtn) {
    cookieBtn.addEventListener('click', openCookieModal);
  }
}

function renderWhatsAppFab() {
  const existing = document.getElementById('mq-whatsapp-fab');
  if (existing) existing.remove();
  const s = DATA.settings || {};
  if (!s.phone_international) return;

  const a = document.createElement('a');
  a.id = 'mq-whatsapp-fab';
  a.className = 'whatsapp-fab';
  a.href = 'https://wa.me/' + encodeURIComponent(s.phone_international) + '?text=' + encodeURIComponent(s.whatsapp_message || '');
  a.target = '_blank';
  a.rel = 'noreferrer noopener';
  a.setAttribute('aria-label', 'Chat with Mustaqiim Relief on WhatsApp');
  a.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02z"/>' +
    '</svg>';
  document.body.appendChild(a);
}

// -----------------------------------------------------------------
// 5. Cookie Consent Banner & Preferences Modal
// -----------------------------------------------------------------
function getCookiePrefs() {
  try {
    const raw = localStorage.getItem('mq_cookie_prefs');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCookiePrefs(prefs) {
  try {
    localStorage.setItem('mq_cookie_prefs', JSON.stringify({
      essential: true,
      mapTiles: Boolean(prefs.mapTiles),
      updatedAt: new Date().toISOString()
    }));
  } catch {
    // Ignore storage restriction
  }
}

function initCookieBanner() {
  if (getCookiePrefs()) return;
  if (document.getElementById('mq-cookie-banner')) return;

  const banner = document.createElement('aside');
  banner.id = 'mq-cookie-banner';
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie and privacy notice');
  banner.innerHTML =
    '<h2>Your Privacy &amp; Cookie Choices</h2>' +
    '<p>We use strictly essential storage for navigation and security. We do not use advertising trackers. You may choose whether to load interactive map tiles.</p>' +
    '<div class="cookie-banner-actions">' +
      '<button type="button" class="btn btn-primary cookie-btn-sm" id="cookie-accept-all">Accept Preferences</button>' +
      '<button type="button" class="btn btn-outline cookie-btn-sm" id="cookie-essential-only">Essential Only</button>' +
      '<button type="button" class="btn btn-outline cookie-btn-sm" id="cookie-customize">Customize</button>' +
    '</div>';

  document.body.appendChild(banner);

  document.getElementById('cookie-accept-all').addEventListener('click', () => {
    saveCookiePrefs({ mapTiles: true });
    banner.remove();
  });
  document.getElementById('cookie-essential-only').addEventListener('click', () => {
    saveCookiePrefs({ mapTiles: false });
    banner.remove();
  });
  document.getElementById('cookie-customize').addEventListener('click', () => {
    banner.remove();
    openCookieModal();
  });
}

function openCookieModal() {
  const existing = document.getElementById('mq-cookie-modal');
  if (existing) existing.remove();
  const prefs = getCookiePrefs() || { essential: true, mapTiles: true };

  const backdrop = document.createElement('div');
  backdrop.id = 'mq-cookie-modal';
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'cookie-modal-title');
  backdrop.innerHTML =
    '<div class="modal-dialog">' +
      '<div class="modal-header">' +
        '<h2 id="cookie-modal-title">Cookie &amp; Storage Preferences</h2>' +
        '<button type="button" class="modal-close" id="cookie-modal-close" aria-label="Close preferences">&times;</button>' +
      '</div>' +
      '<p style="font-size:14px; color:var(--muted); margin-bottom:16px;">We collect only needed data. Manage your local storage and third-party map tile preferences below.</p>' +
      '<div class="consent-row">' +
        '<input type="checkbox" id="pref-essential" checked disabled>' +
        '<label for="pref-essential"><strong>Strictly Essential</strong><br>Required for core site navigation, form security, and remembering your consent choice.</label>' +
      '</div>' +
      '<div class="consent-row">' +
        '<input type="checkbox" id="pref-maps" ' + (prefs.mapTiles ? 'checked' : '') + '>' +
        '<label for="pref-maps"><strong>Interactive Map Tiles (OpenStreetMap)</strong><br>Allows loading interactive map imagery on the About page.</label>' +
      '</div>' +
      '<div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px; flex-wrap:wrap;">' +
        '<a href="cookie-policy.html" class="btn btn-outline cookie-btn-sm">Read Cookie Policy</a>' +
        '<button type="button" class="btn btn-primary cookie-btn-sm" id="cookie-save-prefs">Save Preferences</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(backdrop);

  const closeBtn = document.getElementById('cookie-modal-close');
  closeBtn.focus();

  function closeModal() {
    backdrop.remove();
  }
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
  document.getElementById('cookie-save-prefs').addEventListener('click', () => {
    const mapChecked = document.getElementById('pref-maps').checked;
    saveCookiePrefs({ mapTiles: mapChecked });
    closeModal();
  });
}

// -----------------------------------------------------------------
// 6. Rotating Hero Carousel (Changing Images & Text + Keyboard Nav)
// -----------------------------------------------------------------
function renderHeroCarousel() {
  const container = document.getElementById('hero-carousel');
  if (!container) return;

  const slides = (DATA.heroSlides || []).filter((sl) => sl.active !== false);
  if (!slides.length) return;

  if (heroIndex >= slides.length) heroIndex = 0;

  const slidesHtml = slides.map((sl, idx) => {
    const isActive = idx === heroIndex;
    const HeadingTag = isActive ? 'h1' : 'h2';
    return (
      '<div class="hero-slide' + (isActive ? ' is-active' : '') + '" role="group" aria-roledescription="slide" aria-label="Slide ' + (idx + 1) + ' of ' + slides.length + '" aria-hidden="' + (!isActive) + '">' +
        '<div class="hero-slide-media">' +
          renderImageMarkup(sl.image_url, sl.image_alt, idx === 0) +
          '<div class="hero-scrim" aria-hidden="true"></div>' +
        '</div>' +
        '<div class="container">' +
          '<div class="hero-content">' +
            (sl.eyebrow ? '<p class="hero-eyebrow">' + esc(sl.eyebrow) + '</p>' : '') +
            '<' + HeadingTag + ' class="hero-title">' + esc(sl.title) + '</' + HeadingTag + '>' +
            '<p class="hero-text">' + esc(sl.subtitle) + '</p>' +
            '<div class="hero-actions">' +
              (sl.primary_cta_label ? '<a href="' + esc(sl.primary_cta_href || 'donate.html') + '" class="btn btn-gold" tabindex="' + (isActive ? '0' : '-1') + '">' + esc(sl.primary_cta_label) + '</a>' : '') +
              (sl.secondary_cta_label ? '<a href="' + esc(sl.secondary_cta_href || 'campaigns.html') + '" class="btn btn-outline-light" tabindex="' + (isActive ? '0' : '-1') + '">' + esc(sl.secondary_cta_label) + '</a>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  const dotsHtml = slides.map((_, idx) => {
    const isCurrent = idx === heroIndex;
    return (
      '<button type="button" class="hero-dot" data-slide="' + idx + '" aria-label="Go to slide ' + (idx + 1) + '" aria-current="' + (isCurrent ? 'true' : 'false') + '">' +
        '<span class="hero-dot-bar" aria-hidden="true"></span>' +
      '</button>'
    );
  }).join('');

  container.innerHTML =
    '<div class="hero-slides" aria-live="polite">' + slidesHtml + '</div>' +
    (slides.length > 1
      ? '<div class="hero-controls">' +
          '<div class="container hero-controls-inner">' +
            '<div class="hero-dots" role="tablist" aria-label="Hero slide selection">' + dotsHtml + '</div>' +
            '<div class="hero-nav-btns">' +
              '<button type="button" class="hero-ctrl-btn" id="hero-prev" aria-label="Previous slide">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' +
              '</button>' +
              '<button type="button" class="hero-ctrl-btn" id="hero-next" aria-label="Next slide">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
              '</button>' +
              '<button type="button" class="hero-ctrl-btn hero-pause-btn" id="hero-pause" aria-pressed="' + heroPaused + '">' +
                (heroPaused ? 'Play' : 'Pause') +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '');

  if (slides.length > 1) {
    const goToSlide = (nextIdx) => {
      heroIndex = (nextIdx + slides.length) % slides.length;
      renderHeroCarousel();
    };

    container.querySelectorAll('.hero-dot').forEach((dot) => {
      dot.addEventListener('click', () => goToSlide(Number(dot.dataset.slide)));
    });
    const prevBtn = document.getElementById('hero-prev');
    const nextBtn = document.getElementById('hero-next');
    const pauseBtn = document.getElementById('hero-pause');

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(heroIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(heroIndex + 1));
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        heroPaused = !heroPaused;
        pauseBtn.setAttribute('aria-pressed', String(heroPaused));
        pauseBtn.textContent = heroPaused ? 'Play' : 'Pause';
        resetHeroTimer(slides.length);
      });
    }

    container.onkeydown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToSlide(heroIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToSlide(heroIndex + 1);
      }
    };

    resetHeroTimer(slides.length);
  }
}

function resetHeroTimer(totalSlides) {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroPaused || prefersReduced || totalSlides <= 1) return;

  heroTimer = setInterval(() => {
    const carousel = document.getElementById('hero-carousel');
    if (!carousel) return;
    if (carousel.matches(':hover') || carousel.contains(document.activeElement)) return;
    heroIndex = (heroIndex + 1) % totalSlides;
    renderHeroCarousel();
  }, 6000);
}

// -----------------------------------------------------------------
// 7. Homepage & Shared Dynamic Section Renderers
// -----------------------------------------------------------------
function renderHomeSections() {
  const s = DATA.settings || {};

  // Programmes ("What we do")
  const progGrid = document.getElementById('home-programmes');
  if (progGrid) {
    const progs = (DATA.programmes || []).filter((p) => p.active !== false);
    progGrid.innerHTML = progs.map((p) =>
      '<article class="programme-card">' +
        '<div class="programme-icon">' + getProgrammeIcon(p.icon_key) + '</div>' +
        '<h3 class="programme-title">' + esc(p.title) + '</h3>' +
        '<p class="programme-text">' + esc(p.description) + '</p>' +
        '<a href="' + esc(p.link_href) + '" class="programme-link">' + esc(p.link_label) + ' &rarr;</a>' +
      '</article>'
    ).join('');
  }

  // Featured Campaigns
  const homeCamp = document.getElementById('home-campaigns');
  if (homeCamp) {
    const activeCampaigns = (DATA.campaigns || []).filter((c) => c.active !== false).slice(0, 3);
    homeCamp.innerHTML = activeCampaigns.map(campaignCardHTML).join('');
  }

  // Impact Stats
  const statsGrid = document.getElementById('home-stats');
  const statsNote = document.getElementById('home-stats-note');
  if (statsGrid && DATA.stats) {
    if (statsNote) statsNote.textContent = DATA.stats.section_note || '';
    statsGrid.innerHTML = (DATA.stats.items || []).map((st) =>
      '<div class="stat">' +
        '<div class="stat-value">' + esc(st.value) + '</div>' +
        '<div class="stat-label">' + esc(st.label) + '</div>' +
        (st.note ? '<div class="stat-note">' + esc(st.note) + '</div>' : '') +
      '</div>'
    ).join('');
  }

  // Donation Tiers
  const tiersGrid = document.getElementById('home-tiers');
  if (tiersGrid) {
    const tiers = (DATA.donationTiers || []).filter((t) => t.active !== false);
    tiersGrid.innerHTML = tiers.map((t) =>
      '<article class="tier-card">' +
        '<div class="tier-amount">$' + esc(t.amount) + ' <small>' + esc(t.currency) + '</small></div>' +
        '<div class="tier-title">' + esc(t.title) + '</div>' +
        '<p class="tier-text">' + esc(t.description) + '</p>' +
        '<a href="donate.html?amount=' + encodeURIComponent(t.amount) + '" class="tier-link">Give $' + esc(t.amount) + ' &rarr;</a>' +
      '</article>'
    ).join('');
  }

  // Stories
  const homeStories = document.getElementById('home-stories');
  if (homeStories) {
    const activeStories = (DATA.stories || []).filter((st) => st.active !== false).slice(0, 2);
    homeStories.innerHTML = activeStories.map(storyCardHTML).join('');
  }

  // Gallery Preview (show 6 rich photos on homepage)
  const homeGallery = document.getElementById('home-gallery');
  if (homeGallery) {
    const featuredMedia = (DATA.media || []).filter((m) => m.active !== false).slice(0, 6);
    homeGallery.innerHTML = featuredMedia.map(galleryCardHTML).join('');
  }

  // Quote
  const qText = document.getElementById('home-quote-text');
  const qAuthor = document.getElementById('home-quote-author');
  const qRole = document.getElementById('home-quote-role');
  if (qText) qText.textContent = s.commitment_quote || '';
  if (qAuthor) qAuthor.textContent = s.commitment_author || '';
  if (qRole) qRole.textContent = s.commitment_role || '';

  // Home FAQs
  const homeFaqs = document.getElementById('home-faqs');
  if (homeFaqs) {
    const activeFaqs = (DATA.faqs || []).filter((f) => f.active !== false).slice(0, 4);
    homeFaqs.innerHTML = activeFaqs.map((f) =>
      '<details class="faq-item">' +
        '<summary class="faq-question">' + esc(f.question) + '</summary>' +
        '<p class="faq-answer">' + esc(f.answer) + '</p>' +
      '</details>'
    ).join('');
  }
}

function campaignCardHTML(c) {
  const target = Number(c.target_amount) || 0;
  const raised = Number(c.raised_amount) || 0;
  const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const metaRight = target > 0
    ? 'Target: ' + esc(c.currency) + ' ' + target.toLocaleString()
    : 'Ongoing programme';

  return (
    '<a href="campaign.html?slug=' + encodeURIComponent(c.slug) + '" class="campaign-card">' +
      '<div class="campaign-card-image img-frame">' +
        renderImageMarkup(c.image_url, c.image_alt || c.title) +
      '</div>' +
      '<div class="campaign-card-body">' +
        '<p class="card-meta-line">' + esc(c.location) + ' · ' + esc(c.currency || 'USD') + '</p>' +
        '<h3 class="campaign-card-title">' + esc(c.title) + '</h3>' +
        '<p class="campaign-card-summary">' + esc(c.summary) + '</p>' +
        '<div class="progress-bar" role="progressbar" aria-valuenow="' + progress + '" aria-valuemin="0" aria-valuemax="100">' +
          '<div class="progress-fill" style="width:' + progress + '%"></div>' +
        '</div>' +
        '<div class="progress-meta"><span>' + progress + '% funded</span><span>' + metaRight + '</span></div>' +
      '</div>' +
    '</a>'
  );
}

function storyCardHTML(st) {
  const d = new Date(st.published_at || Date.now());
  const dateLabel = isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    '<a href="story.html?slug=' + encodeURIComponent(st.slug) + '" class="story-card">' +
      '<div class="story-card-image img-frame">' +
        renderImageMarkup(st.image_url, st.image_alt || st.title) +
      '</div>' +
      '<div class="story-card-body">' +
        (dateLabel ? '<p class="card-meta-line">Field Update · ' + esc(dateLabel) + '</p>' : '') +
        '<h3 class="story-card-title">' + esc(st.title) + '</h3>' +
        '<p class="story-card-excerpt">' + esc(st.excerpt) + '</p>' +
      '</div>' +
    '</a>'
  );
}

function galleryCardHTML(m) {
  return (
    '<article class="gallery-card">' +
      '<div class="gallery-card-media img-frame">' +
        renderImageMarkup(m.image_url, m.image_alt || m.title) +
      '</div>' +
      '<div class="gallery-card-body">' +
        '<h3 class="gallery-card-title"><a href="media.html?slug=' + encodeURIComponent(m.slug) + '">' + esc(m.title) + '</a></h3>' +
        (m.caption ? '<p class="gallery-card-caption">' + esc(m.caption) + '</p>' : '') +
        (m.license_note ? '<p class="gallery-card-license">' + esc(m.license_note) + '</p>' : '') +
      '</div>' +
    '</article>'
  );
}

// -----------------------------------------------------------------
// 8. Business Details, Legal Dates & Inner Pages
// -----------------------------------------------------------------
function renderBusinessDetails() {
  const el = document.getElementById('business-details-list');
  if (!el) return;
  const s = DATA.settings || {};
  el.innerHTML =
    '<div class="business-details-row"><dt>Legal Entity</dt><dd>' + esc(s.organisation_name) + '</dd></div>' +
    '<div class="business-details-row"><dt>Organisation Type</dt><dd>' + esc(s.legal_status) + '</dd></div>' +
    '<div class="business-details-row"><dt>Registration / Registry Ref</dt><dd>' + esc(s.registration_number) + '</dd></div>' +
    '<div class="business-details-row"><dt>Operational Address</dt><dd>' + esc(s.address_line) + '</dd></div>' +
    '<div class="business-details-row"><dt>Operating Hours</dt><dd>' + esc(s.operational_hours) + '</dd></div>' +
    '<div class="business-details-row"><dt>Official Telephone / WhatsApp</dt><dd><a href="https://wa.me/' + esc(s.phone_international) + '" target="_blank" rel="noreferrer noopener" style="text-decoration:underline">' + esc(s.phone_display) + '</a></dd></div>' +
    '<div class="business-details-row"><dt>Email Contact</dt><dd>' + (s.public_email ? '<a href="mailto:' + esc(s.public_email) + '" style="text-decoration:underline">' + esc(s.public_email) + '</a>' : 'Available via Contact Form or WhatsApp') + '</dd></div>';
}

function renderLegalDates() {
  const legal = DATA.legal || {};
  document.querySelectorAll('[data-legal-field]').forEach((el) => {
    const key = el.dataset.legalField;
    if (legal[key]) el.textContent = legal[key];
  });
}

function initMap() {
  const el = document.getElementById('map');
  if (!el || typeof window.L === 'undefined') return;

  const s = DATA.settings || {};
  const lat = Number(s.map_lat) || 0.3025;
  const lng = Number(s.map_lng) || 32.5945;

  if (leafletMap) {
    leafletMap.setView([lat, lng], 14);
    return;
  }

  leafletMap = window.L.map(el).setView([lat, lng], 14);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(leafletMap);
  window.L.marker([lat, lng]).addTo(leafletMap).bindPopup(
    '<strong>' + esc(s.map_label || '') + '</strong><br>' + esc(s.map_description || '')
  );
}

function initQurbaniCalculator() {
  const sel = document.getElementById('qurbani-animal');
  const qty = document.getElementById('qurbani-qty');
  const total = document.getElementById('qurbani-total');
  const waBtn = document.getElementById('qurbani-wa-btn');
  if (!sel || !qty || !total) return;

  const s = DATA.settings || {};
  const opts = (DATA.qurbaniOptions || []).filter((o) => o.available !== false);

  sel.innerHTML = '';
  opts.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.label + ' — ' + o.note + (o.price > 0 ? ' ($' + o.price + ')' : '');
    sel.appendChild(opt);
  });

  function update() {
    const cur = opts.find((o) => o.id === sel.value) || opts[0];
    const q = Math.max(1, Number(qty.value) || 1);
    const price = cur ? Number(cur.price) || 0 : 0;
    const t = price * q;
    total.textContent = t > 0 ? (cur.currency || 'USD') + ' ' + t.toLocaleString() : 'Confirm current price on WhatsApp';
    if (waBtn && cur) {
      const msg = 'Assalamu alaikum, I would like to reserve ' + q + 'x ' + cur.label + ' for Qurbani.';
      waBtn.href = 'https://wa.me/' + encodeURIComponent(s.phone_international) + '?text=' + encodeURIComponent(msg);
    }
  }

  sel.onchange = update;
  qty.oninput = update;
  update();
}

function initDonationForm() {
  const form = document.getElementById('donation-form');
  if (!form) return;

  const s = DATA.settings || {};
  const chips = form.querySelectorAll('.form-chip');
  const custom = document.getElementById('custom-amount');
  const campaignSel = document.getElementById('campaign-select');
  const ageCheckbox = document.getElementById('donate-age-consent');
  const summary = document.getElementById('summary-value');
  const submit = document.getElementById('donation-submit');
  const error = document.getElementById('donation-error');

  const campaigns = (DATA.campaigns || []).filter((c) => c.active !== false);
  if (campaignSel && campaigns.length) {
    const prev = campaignSel.value;
    campaignSel.innerHTML = campaigns.map((c) => '<option value="' + esc(c.title) + '">' + esc(c.title) + '</option>').join('') +
      '<option value="General Humanitarian Relief">General Humanitarian Relief</option>';
    if (prev) campaignSel.value = prev;
  }

  const presetParam = Number(new URLSearchParams(window.location.search).get('amount'));
  let selectedAmount = presetParam >= 3 ? presetParam : 10;
  if (presetParam >= 3 && ![3, 5, 10, 25, 50, 100].includes(presetParam) && custom) {
    custom.value = String(presetParam);
  }

  chips.forEach((chip) => {
    chip.classList.toggle('form-chip-active', Number(chip.dataset.amount) === selectedAmount && !custom.value);
  });

  function refresh() {
    const eff = custom.value ? Number(custom.value) || 0 : selectedAmount;
    summary.textContent = eff > 0 ? 'USD ' + eff.toLocaleString() : '—';

    const validAmount = eff >= 3;
    const ageOk = ageCheckbox ? ageCheckbox.checked : true;

    if (!validAmount && eff > 0) {
      error.textContent = 'Minimum donation is US$3.';
      error.style.display = 'block';
    } else if (!ageOk) {
      error.textContent = 'Please confirm age 18+ or parental/guardian consent before continuing.';
      error.style.display = 'block';
    } else {
      error.style.display = 'none';
    }

    const canSubmit = validAmount && ageOk;
    submit.classList.toggle('form-submit-disabled', !canSubmit);
    submit.setAttribute('aria-disabled', String(!canSubmit));

    if (canSubmit) {
      const msg = 'Assalamu alaikum, I would like to donate USD ' + eff + ' toward ' + campaignSel.value + '.';
      submit.href = 'https://wa.me/' + encodeURIComponent(s.phone_international) + '?text=' + encodeURIComponent(msg);
    } else {
      submit.href = '#';
    }
  }

  chips.forEach((chip) => {
    chip.onclick = () => {
      chips.forEach((c) => c.classList.remove('form-chip-active'));
      chip.classList.add('form-chip-active');
      selectedAmount = Number(chip.dataset.amount);
      custom.value = '';
      refresh();
    };
  });
  custom.oninput = () => {
    chips.forEach((c) => c.classList.remove('form-chip-active'));
    refresh();
  };
  campaignSel.onchange = refresh;
  if (ageCheckbox) ageCheckbox.onchange = refresh;
  submit.onclick = (e) => {
    if (submit.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      error.style.display = 'block';
    }
  };
  refresh();
}

function initContactPage() {
  const s = DATA.settings || {};
  const waText = document.getElementById('contact-wa-number');
  const waBtn = document.getElementById('contact-wa-btn');
  const emailBox = document.getElementById('contact-email-box');
  const addressText = document.getElementById('contact-address-text');
  const hoursText = document.getElementById('contact-hours-text');

  if (waText) waText.textContent = s.phone_display || '+256 708 684 223';
  if (waBtn) waBtn.href = 'https://wa.me/' + encodeURIComponent(s.phone_international);
  if (addressText) addressText.textContent = s.address_line || s.map_label || 'Nsambya, Kampala, Uganda';
  if (hoursText) hoursText.textContent = s.operational_hours || '';
  if (emailBox) {
    emailBox.innerHTML = s.public_email
      ? '<a href="mailto:' + esc(s.public_email) + '" style="text-decoration:underline; font-weight:600">' + esc(s.public_email) + '</a>'
      : 'Use the secure inquiry form below or message us on WhatsApp.';
  }

  const form = document.getElementById('contact-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('contact-form-error');
    const okEl = document.getElementById('contact-form-success');
    const submitBtn = document.getElementById('contact-submit-btn');
    errEl.style.display = 'none';
    okEl.style.display = 'none';

    const name = document.getElementById('contact-name').value.trim();
    const contact_value = document.getElementById('contact-value').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const age_consent = document.getElementById('contact-age-consent').checked;

    if (!name || !contact_value || message.length < 5) {
      errEl.textContent = 'Please provide your name, a contact phone or email, and a short message.';
      errEl.style.display = 'block';
      return;
    }
    if (!age_consent) {
      errEl.textContent = 'Please confirm you are 18+ or have parental/guardian consent.';
      errEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    try {
      const refId = await submitContactInquiry({ name, contact_value, subject, message, age_consent });
      form.reset();
      okEl.textContent = 'Thank you. Your inquiry has been received (Reference: ' + refId + '). Our Kampala team will reply via your provided contact channel.';
      okEl.style.display = 'block';
    } catch {
      errEl.textContent = 'Unable to submit online right now. Please message us directly on WhatsApp at ' + (s.phone_display || '+256 708 684 223') + '.';
      errEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Inquiry';
    }
  });
}

function initDataDeletionPage() {
  const form = document.getElementById('deletion-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  const clearLocalBtn = document.getElementById('clear-local-storage-btn');
  if (clearLocalBtn) {
    clearLocalBtn.addEventListener('click', () => {
      try {
        localStorage.removeItem('mq_cookie_prefs');
        const msg = document.getElementById('local-clear-msg');
        if (msg) {
          msg.textContent = 'Local browser preferences cleared.';
          msg.style.display = 'block';
        }
      } catch {
        // Ignore
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('deletion-error');
    const okEl = document.getElementById('deletion-success');
    const submitBtn = document.getElementById('deletion-submit-btn');
    errEl.style.display = 'none';
    okEl.style.display = 'none';

    const requester_name = document.getElementById('del-name').value.trim();
    const contact_info = document.getElementById('del-contact').value.trim();
    const request_type = document.getElementById('del-type').value;
    const details = document.getElementById('del-details').value.trim();
    const age_consent = document.getElementById('del-age-consent').checked;

    if (!requester_name || !contact_info) {
      errEl.textContent = 'Please enter your name and the phone number or email associated with your record.';
      errEl.style.display = 'block';
      return;
    }
    if (!age_consent) {
      errEl.textContent = 'Please confirm you are 18+ or acting as a parent or legal guardian.';
      errEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Request...';
    try {
      const refId = await submitDataDeletionRequest({
        requester_name,
        contact_info,
        request_type,
        details,
        age_consent
      });
      form.reset();
      okEl.textContent = 'Your data deletion request has been logged (Reference ID: ' + refId + '). We process verified erasure requests within 14 business days.';
      okEl.style.display = 'block';
    } catch {
      errEl.textContent = 'Could not submit online. Please contact our team via WhatsApp to request immediate manual deletion.';
      errEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Data Request';
    }
  });
}

function initListAndDetailPages() {
  const s = DATA.settings || {};

  const campGrid = document.getElementById('campaigns-grid');
  if (campGrid) {
    const active = (DATA.campaigns || []).filter((c) => c.active !== false);
    campGrid.innerHTML = active.length ? active.map(campaignCardHTML).join('') : '<p class="page-empty">No active campaigns available right now.</p>';
  }

  const storiesGrid = document.getElementById('stories-grid');
  if (storiesGrid) {
    const active = (DATA.stories || []).filter((st) => st.active !== false);
    storiesGrid.innerHTML = active.length ? active.map(storyCardHTML).join('') : '<p class="page-empty">No field stories published yet.</p>';
  }

  const galleryGrid = document.getElementById('gallery-grid');
  if (galleryGrid) {
    const active = (DATA.media || []).filter((m) => m.active !== false);
    galleryGrid.innerHTML = active.length ? active.map(galleryCardHTML).join('') : '<p class="page-empty">No media items available.</p>';
  }

  const faqFull = document.getElementById('faq-list-full');
  if (faqFull) {
    const active = (DATA.faqs || []).filter((f) => f.active !== false);
    faqFull.innerHTML = active.map((f) =>
      '<details class="faq-item">' +
        '<summary class="faq-question">' + esc(f.question) + '</summary>' +
        '<p class="faq-answer">' + esc(f.answer) + '</p>' +
      '</details>'
    ).join('');
  }

  if (document.getElementById('campaign-detail')) {
    const slug = getSlugParam();
    const c = (DATA.campaigns || []).find((x) => x.slug === slug) || (DATA.campaigns || [])[0];
    if (!c) {
      document.getElementById('campaign-detail').innerHTML = '<p class="page-empty">Campaign not found.</p>';
    } else {
      document.title = c.title + ' — Mustaqiim Relief and Charity Foundation';
      document.getElementById('campaign-location').textContent = c.location;
      document.getElementById('campaign-title').textContent = c.title;
      document.getElementById('campaign-description').textContent = c.description;
      const imgWrap = document.getElementById('campaign-image');
      if (imgWrap) imgWrap.innerHTML = renderImageMarkup(c.image_url, c.image_alt || c.title, true);
      const target = Number(c.target_amount) || 0;
      const raised = Number(c.raised_amount) || 0;
      const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
      document.getElementById('campaign-progress').style.width = progress + '%';
      document.getElementById('campaign-meta').textContent =
        target > 0
          ? progress + '% funded — Target: ' + c.currency + ' ' + target.toLocaleString()
          : 'Ongoing humanitarian programme — Donate any amount from US$3';
      document.getElementById('campaign-wa').href =
        'https://wa.me/' + encodeURIComponent(s.phone_international) + '?text=' +
        encodeURIComponent('Assalamu alaikum, I would like to support ' + c.title);
    }
  }

  if (document.getElementById('story-detail')) {
    const slug = getSlugParam();
    const st = (DATA.stories || []).find((x) => x.slug === slug) || (DATA.stories || [])[0];
    if (!st) {
      document.getElementById('story-detail').innerHTML = '<p class="page-empty">Story not found.</p>';
    } else {
      document.title = st.title + ' — Mustaqiim Relief and Charity Foundation';
      const d = new Date(st.published_at || Date.now());
      document.getElementById('story-date').textContent = isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('story-title').textContent = st.title;
      document.getElementById('story-body').textContent = st.body;
      const imgWrap = document.getElementById('story-image');
      if (imgWrap) imgWrap.innerHTML = renderImageMarkup(st.image_url, st.image_alt || st.title, true);
    }
  }

  if (document.getElementById('media-detail')) {
    const slug = getSlugParam();
    const m = (DATA.media || []).find((x) => x.slug === slug) || (DATA.media || [])[0];
    if (!m) {
      document.getElementById('media-detail').innerHTML = '<p class="page-empty">Media item not found.</p>';
    } else {
      document.title = m.title + ' — Mustaqiim Relief and Charity Foundation';
      document.getElementById('media-title').textContent = m.title;
      document.getElementById('media-caption').textContent = m.caption || '';
      const licenseEl = document.getElementById('media-license');
      if (licenseEl) licenseEl.textContent = m.license_note || 'Licensed editorial media — Mustaqiim Relief and Charity Foundation';
      const player = document.getElementById('media-player');
      if (player) {
        if (m.media_type === 'video' && m.video_url) {
          player.innerHTML = '<video controls style="width:100%; height:100%; border-radius:14px;" poster="' + esc(m.image_url || '') + '"><source src="' + esc(m.video_url) + '"></video>';
        } else {
          player.innerHTML = renderImageMarkup(m.image_url, m.image_alt || m.title, true);
        }
      }
    }
  }
}

function hydrateAll() {
  renderHeader();
  renderFooter();
  renderWhatsAppFab();
  hydrateSiteImages();
  renderHeroCarousel();
  renderHomeSections();
  renderBusinessDetails();
  renderLegalDates();
  initMap();
  initQurbaniCalculator();
  initDonationForm();
  initContactPage();
  initDataDeletionPage();
  initListAndDetailPages();
}

// -----------------------------------------------------------------
// Boot Sequence
// -----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  hydrateAll();
  initScrollReveal();
  initCookieBanner();
  DATA = await loadLiveSiteData();
  hydrateAll();
});
