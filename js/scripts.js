// -----------------------------------------------------------------
// MASTER FRONTEND CONTROLLER — Mustaqiim Relief and Charity Foundation
// Standalone classic browser script (works on file://, GitHub Pages,
// static HTTP servers, and Vite dev/build without build dependencies).
// Handles shared header/footer, dropdown & keyboard navigation,
// smooth Hero Carousel transitions, smooth image & div container loads,
// Cookie Preferences, Forms, and live Firestore hydration.
// -----------------------------------------------------------------

(function () {
  "use strict";

  document.documentElement.classList.add("mq-js");

  var DEFAULT_DATA = window.MQ_DEFAULT_DATA || {};
  var DB = window.MQ_DB || {};

  var DATA = window.MQ_DATA || structuredClone(DEFAULT_DATA);
  var heroTimer = null;
  var heroIndex = 0;
  var heroPaused = false;
  var renderedHeroSignature = "";
  var leafletMap = null;
  var dropdownDocBound = false;
  var revealObserver = null;

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeUrl(url) {
    var u = String(url || "");
    if (u.indexOf("/src/assets/") === 0) {
      return u.slice(1);
    }
    return u;
  }

  function currentPageName() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    return path === "" ? "index.html" : path;
  }

  function getSlugParam() {
    return new URLSearchParams(window.location.search).get("slug");
  }

  function getProgrammeIcon(key) {
    switch (key) {
      case "children":
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
      case "qurbani":
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>';
      case "food":
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/></svg>';
      case "water":
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';
      default:
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    }
  }

  function renderImageMarkup(url, alt, eager) {
    var safeAlt = esc(alt || "Mustaqiim Relief and Charity Foundation programme photograph");
    var safeUrl = esc(normalizeUrl(url));
    if (!safeUrl) {
      return '<span class="img-fallback-label">Licensed Foundation Media</span>';
    }
    var priorityAttr = eager ? 'fetchpriority="high"' : 'loading="lazy"';
    return (
      '<img class="mq-fade-img" src="' + safeUrl + '" alt="' + safeAlt + '" referrerpolicy="no-referrer" ' + priorityAttr +
      ' onerror="this.style.display=\'none\'; if(this.parentElement){ this.parentElement.classList.add(\'has-loaded\'); this.parentElement.insertAdjacentHTML(\'beforeend\', \'<span class=\\\'img-fallback-label\\\'>' + safeAlt + '</span>\'); }">'
    );
  }

  // -----------------------------------------------------------------
  // Smooth Image Load Transitions
  // -----------------------------------------------------------------
  function markImageLoaded(imgEl) {
    if (!imgEl) return;
    imgEl.classList.add("is-loaded");
    var frame = imgEl.closest(".img-frame");
    if (frame) frame.classList.add("has-loaded");
  }

  function observeImagesForSmoothLoad(root) {
    var scope = root || document;
    var imgs = scope.querySelectorAll("img");
    imgs.forEach(function (imgEl) {
      if (!imgEl.classList.contains("mq-fade-img")) {
        imgEl.classList.add("mq-fade-img");
      }
      if (imgEl.dataset.fadeBound === "true") {
        if (imgEl.complete && imgEl.naturalWidth > 0) {
          markImageLoaded(imgEl);
        }
        return;
      }
      imgEl.dataset.fadeBound = "true";

      var onSettle = function () {
        requestAnimationFrame(function () {
          markImageLoaded(imgEl);
        });
      };

      if (imgEl.complete && imgEl.naturalWidth > 0) {
        requestAnimationFrame(function () {
          markImageLoaded(imgEl);
        });
      } else {
        imgEl.addEventListener("load", onSettle, { once: true });
        imgEl.addEventListener("error", function () {
          markImageLoaded(imgEl);
        }, { once: true });
        // Safety guard so no image ever remains unrevealed on slow or offline loads
        setTimeout(function () {
          markImageLoaded(imgEl);
        }, 1200);
      }
    });
  }

  // -----------------------------------------------------------------
  // 1. Header with Dropdown Lists & Keyboard-Accessible Mobile Drawer
  // -----------------------------------------------------------------
  var NAV_ITEMS = [
    { label: "Home", href: "index.html" },
    {
      label: "About",
      id: "about",
      children: [
        { label: "Mission & Core Principles", desc: "Our mission, vision, and Amanah values", href: "about.html" },
        { label: "Business Details", desc: "Registration, hours, and Kampala base", href: "about.html#business-details" },
        { label: "Operational Map", desc: "Nsambya coordination area", href: "about.html#location-map" },
        { label: "Frequently Asked Questions", desc: "Answers on donations and Qurbani", href: "faq.html" }
      ]
    },
    {
      label: "Programmes",
      id: "programmes",
      children: [
        { label: "Helping Children in Uganda", desc: "School kits, books, and daily nutrition", href: "index.html#child-support" },
        { label: "All Campaigns", desc: "Active relief appeals across Uganda", href: "campaigns.html" },
        { label: "Qurbani / Udhiya 2026", desc: "Livestock shares and Eid distribution", href: "qurbani.html" },
        { label: "Field Stories", desc: "Community outreach reports and updates", href: "stories.html" },
        { label: "Media Gallery", desc: "Licensed field and child care photos", href: "gallery.html" }
      ]
    },
    { label: "Stories", href: "stories.html" },
    {
      label: "Policies",
      id: "policies",
      children: [
        { label: "Privacy Policy", desc: "Minimal data collection & donor rights", href: "privacy-policy.html" },
        { label: "Terms of Service", desc: "Website and donation coordination terms", href: "terms.html" },
        { label: "Refund Policy", desc: "Duplicate or erroneous gift refunds", href: "refund-policy.html" },
        { label: "Donation Policy", desc: "Amanah allocation and age consent", href: "donation-policy.html" },
        { label: "Cookie Policy", desc: "Essential storage and map preferences", href: "cookie-policy.html" },
        { label: "Data Deletion Request", desc: "Request record access or erasure", href: "data-deletion.html" }
      ]
    },
    { label: "Contact", href: "contact.html" }
  ];

  var CHEVRON_SVG =
    '<svg class="nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="6 9 12 15 18 9"/>' +
    "</svg>";

  function closeAllDesktopDropdowns(exceptEl) {
    document.querySelectorAll(".nav-dropdown").forEach(function (dd) {
      if (dd !== exceptEl) {
        dd.classList.remove("open");
        var trigger = dd.querySelector(".nav-dropdown-trigger");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  function renderHeader() {
    var el = document.getElementById("site-header");
    if (!el) return;

    var s = DATA.settings || {};
    var page = currentPageName();

    var navLinks = NAV_ITEMS.map(function (item) {
      if (item.children) {
        var childPages = item.children.map(function (c) { return c.href.split("#")[0]; });
        var isActiveGroup = childPages.indexOf(page) !== -1;
        var menuId = "nav-menu-" + item.id;
        var itemsHtml = item.children.map(function (ch) {
          return (
            "<li>" +
              '<a href="' + ch.href + '" class="nav-dropdown-link">' +
                "<strong>" + esc(ch.label) + "</strong>" +
                "<span>" + esc(ch.desc) + "</span>" +
              "</a>" +
            "</li>"
          );
        }).join("");
        return (
          '<div class="nav-dropdown" data-dropdown="' + item.id + '">' +
            '<button type="button" class="nav-dropdown-trigger" aria-expanded="false" aria-controls="' + menuId + '" aria-haspopup="true"' +
            (isActiveGroup ? ' style="color:var(--forest-dark); font-weight:600;"' : "") + ">" +
              esc(item.label) + CHEVRON_SVG +
            "</button>" +
            '<ul class="nav-dropdown-menu" id="' + menuId + '" role="menu">' + itemsHtml + "</ul>" +
          "</div>"
        );
      }
      var active = page === item.href ? ' aria-current="page"' : "";
      return '<a href="' + item.href + '" class="nav-link"' + active + ">" + esc(item.label) + "</a>";
    }).join("");

    var mobileLinks = NAV_ITEMS.map(function (item) {
      if (item.children) {
        var subHtml = item.children.map(function (ch) {
          return '<a href="' + ch.href + '" class="mobile-sublink">' + esc(ch.label) + "</a>";
        }).join("");
        return (
          '<div class="mobile-group">' +
            '<button type="button" class="mobile-group-btn" aria-expanded="false">' +
              "<span>" + esc(item.label) + "</span>" + CHEVRON_SVG +
            "</button>" +
            '<div class="mobile-sublinks">' + subHtml + "</div>" +
          "</div>"
        );
      }
      var active = page === item.href ? ' aria-current="page"' : "";
      return '<a href="' + item.href + '" class="mobile-link"' + active + ">" + esc(item.label) + "</a>";
    }).join("");

    el.innerHTML =
      '<div class="announcement-bar">' +
        "<span>" + esc(s.announcement_text || "") + "</span>" +
        '<a href="qurbani.html">Reserve Qurbani</a>' +
      "</div>" +
      '<div class="header-bar">' +
        '<div class="container header-inner">' +
          '<a href="index.html" class="brand" aria-label="Mustaqiim Relief and Charity Foundation Home">' +
            '<span class="logo-mark" aria-hidden="true">M</span>' +
            '<span class="brand-wordmark">Mustaqiim</span>' +
          "</a>" +
          '<nav class="main-nav" aria-label="Primary navigation">' + navLinks + "</nav>" +
          '<div class="header-actions">' +
            '<a href="donate.html" class="donate-btn-header">Donate</a>' +
            '<button type="button" class="menu-btn" id="menu-btn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav">' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path d="M3 6h18"></path><path d="M3 12h18"></path><path d="M3 18h18"></path>' +
              "</svg>" +
            "</button>" +
          "</div>" +
        "</div>" +
        '<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation">' +
          '<div class="container">' +
            mobileLinks +
            '<a href="donate.html" class="mobile-donate">Donate</a>' +
          "</div>" +
        "</nav>" +
      "</div>";

    el.querySelectorAll(".nav-dropdown").forEach(function (dd) {
      var trigger = dd.querySelector(".nav-dropdown-trigger");
      var menuLinks = dd.querySelectorAll(".nav-dropdown-link");
      if (!trigger) return;

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = !dd.classList.contains("open");
        closeAllDesktopDropdowns(dd);
        dd.classList.toggle("open", willOpen);
        trigger.setAttribute("aria-expanded", String(willOpen));
      });

      trigger.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          closeAllDesktopDropdowns(dd);
          dd.classList.add("open");
          trigger.setAttribute("aria-expanded", "true");
          if (menuLinks[0]) menuLinks[0].focus();
        } else if (e.key === "Escape") {
          closeAllDesktopDropdowns();
          trigger.focus();
        }
      });

      dd.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeAllDesktopDropdowns();
          trigger.focus();
        }
      });
    });

    el.querySelectorAll(".mobile-group-btn").forEach(function (gbtn) {
      gbtn.addEventListener("click", function () {
        var grp = gbtn.closest(".mobile-group");
        var isOpen = grp.classList.toggle("open");
        gbtn.setAttribute("aria-expanded", String(isOpen));
      });
    });

    var btn = document.getElementById("menu-btn");
    var mnav = document.getElementById("mobile-nav");
    if (btn && mnav) {
      btn.addEventListener("click", function () {
        var isOpen = mnav.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(isOpen));
        btn.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
      });
      mnav.querySelectorAll("a").forEach(function (lnk) {
        lnk.addEventListener("click", function () {
          mnav.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
        });
      });
    }

    if (!dropdownDocBound) {
      dropdownDocBound = true;
      document.addEventListener("click", function (e) {
        if (!e.target.closest(".nav-dropdown")) {
          closeAllDesktopDropdowns();
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeAllDesktopDropdowns();
          var mobNav = document.getElementById("mobile-nav");
          var menuBtn = document.getElementById("menu-btn");
          if (mobNav && mobNav.classList.contains("open")) {
            mobNav.classList.remove("open");
            if (menuBtn) {
              menuBtn.setAttribute("aria-expanded", "false");
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
    var imgs = Object.assign({}, DEFAULT_DATA.images || {}, DATA.images || {});
    document.querySelectorAll("img[data-site-image]").forEach(function (imgEl) {
      var key = imgEl.dataset.siteImage;
      var url = normalizeUrl(imgs[key + "_url"]);
      var alt = imgs[key + "_alt"];
      if (url && imgEl.getAttribute("src") !== url) {
        imgEl.classList.remove("is-loaded");
        imgEl.dataset.fadeBound = "";
        imgEl.src = url;
        imgEl.style.display = "block";
      }
      if (alt) {
        imgEl.alt = alt;
      }
    });
    observeImagesForSmoothLoad(document);
  }

  // -----------------------------------------------------------------
  // 3. Universal Staggered Scroll Reveal Transitions for Div Containers
  // -----------------------------------------------------------------
  var STAGGER_GROUPS = [
    ".trust-bar-inner > .trust-item",
    ".intro-highlights > .intro-highlight-box",
    ".child-pillars > .child-pillar-card",
    ".child-visual-stack > .child-feature-card",
    ".programme-grid > .programme-card",
    "#home-campaigns > .campaign-card",
    "#campaigns-grid > .campaign-card",
    "#home-stats > .stat",
    "#home-tiers > .tier-card",
    "#home-stories > .story-card",
    "#stories-grid > .story-card",
    "#home-gallery > .gallery-card",
    "#gallery-grid > .gallery-card",
    ".values-list > .value-item",
    ".contact-grid > .contact-card",
    ".faq-list > .faq-item",
    ".legal-doc > h2",
    ".legal-doc > p",
    ".legal-doc > ul"
  ];

  var SINGLE_REVEAL_SELECTORS = [
    ".intro-copy",
    ".intro-figure",
    ".side-panel",
    ".calc",
    ".donation-form",
    ".contact-form-card",
    ".detail-hero-media",
    ".page-header"
  ];

  function applyRevealClasses() {
    STAGGER_GROUPS.forEach(function (selector) {
      var nodes = document.querySelectorAll(selector);
      nodes.forEach(function (el, idx) {
        if (!el.classList.contains("reveal")) {
          el.classList.add("reveal");
        }
        el.style.setProperty("--reveal-delay", Math.min(idx * 75, 420) + "ms");
      });
    });

    SINGLE_REVEAL_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        if (!el.classList.contains("reveal")) {
          el.classList.add("reveal");
        }
      });
    });
  }

  function revealImmediatelyIfVisible(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    if (rect.top < vh + 40 && rect.bottom > -40) {
      el.classList.add("is-visible");
      return true;
    }
    return false;
  }

  function initScrollReveal() {
    applyRevealClasses();
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    if (revealObserver) {
      revealObserver.disconnect();
    }

    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.03, rootMargin: "0px 0px -12px 0px" }
    );

    items.forEach(function (el) {
      if (!el.classList.contains("is-visible")) {
        if (!revealImmediatelyIfVisible(el)) {
          revealObserver.observe(el);
        }
      }
    });

    // Safety check for viewport items after paint
    setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        revealImmediatelyIfVisible(el);
      });
    }, 650);
  }

  // -----------------------------------------------------------------
  // 4. Footer & Cookie Preferences
  // -----------------------------------------------------------------
  function renderFooter() {
    var el = document.getElementById("site-footer");
    if (!el) return;

    var s = DATA.settings || {};
    var emailLine = s.public_email
      ? '<li><a href="mailto:' + esc(s.public_email) + '">' + esc(s.public_email) + "</a></li>"
      : '<li><a href="contact.html">Direct Inquiry Form</a></li>';

    var socialItems = [];
    if (s.facebook_url) {
      socialItems.push('<li><a href="' + esc(s.facebook_url) + '" target="_blank" rel="noreferrer noopener">Facebook</a></li>');
    }
    if (s.instagram_url) {
      socialItems.push('<li><a href="' + esc(s.instagram_url) + '" target="_blank" rel="noreferrer noopener">Instagram</a></li>');
    }

    el.innerHTML =
      '<footer class="site-footer">' +
        '<div class="container footer-grid">' +
          "<div>" +
            '<h2 class="footer-brand-title">' + esc(s.organisation_name || "Mustaqiim Relief and Charity Foundation") + "</h2>" +
            '<p class="footer-text">' + esc(s.footer_mission || "") + "</p>" +
            '<p class="footer-location">' + esc(s.address_line || s.map_label || "Nsambya, Kampala, Uganda") + "</p>" +
            '<p class="footer-text" style="margin-top:6px; font-size:13px;">Hours: ' + esc(s.operational_hours || "Mon–Sat, 08:30–17:30 EAT") + "</p>" +
          "</div>" +
          "<div>" +
            '<h3 class="footer-col-title">Programmes</h3>' +
            '<ul class="footer-list">' +
              '<li><a href="index.html#child-support">Helping Children in Uganda</a></li>' +
              '<li><a href="about.html">About Us</a></li>' +
              '<li><a href="qurbani.html">Qurbani / Udhiya</a></li>' +
              '<li><a href="campaigns.html">Campaigns</a></li>' +
              '<li><a href="stories.html">Field Stories</a></li>' +
              '<li><a href="gallery.html">Media Gallery</a></li>' +
              '<li><a href="faq.html">FAQ</a></li>' +
            "</ul>" +
          "</div>" +
          "<div>" +
            '<h3 class="footer-col-title">Contact &amp; Management</h3>' +
            '<ul class="footer-list">' +
              '<li><a href="https://wa.me/' + esc(s.phone_international) + '" target="_blank" rel="noreferrer noopener">WhatsApp: ' + esc(s.phone_display) + "</a></li>" +
              emailLine +
              '<li><a href="contact.html">Contact Us</a></li>' +
              socialItems.join("") +
              '<li><a href="admin.html">Admin Dashboard</a></li>' +
            "</ul>" +
          "</div>" +
          "<div>" +
            '<h3 class="footer-col-title">Legal &amp; Privacy</h3>' +
            '<ul class="footer-list">' +
              '<li><a href="privacy-policy.html">Privacy Policy</a></li>' +
              '<li><a href="terms.html">Terms of Service</a></li>' +
              '<li><a href="refund-policy.html">Refund Policy</a></li>' +
              '<li><a href="cookie-policy.html">Cookie Policy</a></li>' +
              '<li><a href="donation-policy.html">Donation Policy</a></li>' +
              '<li><a href="data-deletion.html">Data Deletion Request</a></li>' +
              '<li><button type="button" id="footer-cookie-btn" style="text-align:left; text-decoration:underline; color:var(--gold-light); font-size:13.5px;">Manage Cookie Preferences</button></li>' +
            "</ul>" +
          "</div>" +
        "</div>" +
        '<div class="container footer-bottom">' +
          "<span>&copy; " + new Date().getFullYear() + " " + esc(s.organisation_name || "") + ". All rights reserved.</span>" +
          "<span>All site photography is licensed or proprietary to the Foundation.</span>" +
        "</div>" +
      "</footer>";

    var cookieBtn = document.getElementById("footer-cookie-btn");
    if (cookieBtn) {
      cookieBtn.addEventListener("click", openCookieModal);
    }
  }

  function renderWhatsAppFab() {
    var existing = document.getElementById("mq-whatsapp-fab");
    if (existing) existing.remove();
    var s = DATA.settings || {};
    if (!s.phone_international) return;

    var a = document.createElement("a");
    a.id = "mq-whatsapp-fab";
    a.className = "whatsapp-fab";
    a.href = "https://wa.me/" + encodeURIComponent(s.phone_international) + "?text=" + encodeURIComponent(s.whatsapp_message || "");
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    a.setAttribute("aria-label", "Chat with Mustaqiim Relief on WhatsApp");
    a.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02z"/>' +
      "</svg>";
    document.body.appendChild(a);
  }

  // -----------------------------------------------------------------
  // 5. Cookie Consent Banner & Preferences Modal
  // -----------------------------------------------------------------
  function getCookiePrefs() {
    try {
      var raw = localStorage.getItem("mq_cookie_prefs");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveCookiePrefs(prefs) {
    try {
      localStorage.setItem("mq_cookie_prefs", JSON.stringify({
        essential: true,
        mapTiles: Boolean(prefs.mapTiles),
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      // Ignore storage restriction
    }
  }

  function initCookieBanner() {
    if (getCookiePrefs()) return;
    if (document.getElementById("mq-cookie-banner")) return;

    var banner = document.createElement("aside");
    banner.id = "mq-cookie-banner";
    banner.className = "cookie-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie and privacy notice");
    banner.innerHTML =
      "<h2>Your Privacy &amp; Cookie Choices</h2>" +
      "<p>We use strictly essential storage for navigation and security. We do not use advertising trackers. You may choose whether to load interactive map tiles.</p>" +
      '<div class="cookie-banner-actions">' +
        '<button type="button" class="btn btn-primary cookie-btn-sm" id="cookie-accept-all">Accept Preferences</button>' +
        '<button type="button" class="btn btn-outline cookie-btn-sm" id="cookie-essential-only">Essential Only</button>' +
        '<button type="button" class="btn btn-outline cookie-btn-sm" id="cookie-customize">Customize</button>' +
      "</div>";

    document.body.appendChild(banner);

    document.getElementById("cookie-accept-all").addEventListener("click", function () {
      saveCookiePrefs({ mapTiles: true });
      banner.remove();
    });
    document.getElementById("cookie-essential-only").addEventListener("click", function () {
      saveCookiePrefs({ mapTiles: false });
      banner.remove();
    });
    document.getElementById("cookie-customize").addEventListener("click", function () {
      banner.remove();
      openCookieModal();
    });
  }

  function openCookieModal() {
    var existing = document.getElementById("mq-cookie-modal");
    if (existing) existing.remove();
    var prefs = getCookiePrefs() || { essential: true, mapTiles: true };

    var backdrop = document.createElement("div");
    backdrop.id = "mq-cookie-modal";
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "cookie-modal-title");
    backdrop.innerHTML =
      '<div class="modal-dialog">' +
        '<div class="modal-header">' +
          '<h2 id="cookie-modal-title">Cookie &amp; Storage Preferences</h2>' +
          '<button type="button" class="modal-close" id="cookie-modal-close" aria-label="Close preferences">&times;</button>' +
        "</div>" +
        '<p style="font-size:14px; color:var(--muted); margin-bottom:16px;">We collect only needed data. Manage your local storage and third-party map tile preferences below.</p>' +
        '<div class="consent-row">' +
          '<input type="checkbox" id="pref-essential" checked disabled>' +
          '<label for="pref-essential"><strong>Strictly Essential</strong><br>Required for core site navigation, form security, and remembering your consent choice.</label>' +
        "</div>" +
        '<div class="consent-row">' +
          '<input type="checkbox" id="pref-maps" ' + (prefs.mapTiles ? "checked" : "") + ">" +
          '<label for="pref-maps"><strong>Interactive Map Tiles (OpenStreetMap)</strong><br>Allows loading interactive map imagery on the About page.</label>' +
        "</div>" +
        '<div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px; flex-wrap:wrap;">' +
          '<a href="cookie-policy.html" class="btn btn-outline cookie-btn-sm">Read Cookie Policy</a>' +
          '<button type="button" class="btn btn-primary cookie-btn-sm" id="cookie-save-prefs">Save Preferences</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(backdrop);

    var closeBtn = document.getElementById("cookie-modal-close");
    closeBtn.focus();

    function closeModal() {
      backdrop.remove();
    }
    closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    });
    document.getElementById("cookie-save-prefs").addEventListener("click", function () {
      var mapChecked = document.getElementById("pref-maps").checked;
      saveCookiePrefs({ mapTiles: mapChecked });
      closeModal();
    });
  }

  // -----------------------------------------------------------------
  // 6. Smooth Cross-Fading Hero Carousel
  // -----------------------------------------------------------------
  function updateHeroSlideClasses(container) {
    var slideEls = container.querySelectorAll(".hero-slide");
    var dotEls = container.querySelectorAll(".hero-dot");

    slideEls.forEach(function (slideEl, idx) {
      var active = idx === heroIndex;
      slideEl.classList.toggle("is-active", active);
      slideEl.setAttribute("aria-hidden", String(!active));
      slideEl.querySelectorAll(".hero-actions a").forEach(function (a) {
        a.setAttribute("tabindex", active ? "0" : "-1");
      });
    });

    dotEls.forEach(function (dotEl, idx) {
      dotEl.setAttribute("aria-current", idx === heroIndex ? "true" : "false");
    });
  }

  function renderHeroCarousel() {
    var container = document.getElementById("hero-carousel");
    if (!container) return;

    var slides = (DATA.heroSlides || []).filter(function (sl) { return sl.active !== false; });
    if (!slides.length) return;

    if (heroIndex >= slides.length) heroIndex = 0;

    var signature = JSON.stringify(slides.map(function (sl) {
      return [sl.id, sl.title, sl.eyebrow, sl.image_url, sl.subtitle];
    }));

    if (signature === renderedHeroSignature && container.querySelectorAll(".hero-slide").length === slides.length) {
      updateHeroSlideClasses(container);
      observeImagesForSmoothLoad(container);
      return;
    }
    renderedHeroSignature = signature;

    var slidesHtml = slides.map(function (sl, idx) {
      var isActive = idx === heroIndex;
      var HeadingTag = idx === 0 ? "h1" : "h2";
      return (
        '<div class="hero-slide' + (isActive ? " is-active" : "") + '" role="group" aria-roledescription="slide" aria-label="Slide ' + (idx + 1) + " of " + slides.length + '" aria-hidden="' + (!isActive) + '">' +
          '<div class="hero-slide-media">' +
            renderImageMarkup(sl.image_url, sl.image_alt, idx === 0) +
            '<div class="hero-scrim" aria-hidden="true"></div>' +
          "</div>" +
          '<div class="container">' +
            '<div class="hero-content">' +
              (sl.eyebrow ? '<p class="hero-eyebrow">' + esc(sl.eyebrow) + "</p>" : "") +
              "<" + HeadingTag + ' class="hero-title">' + esc(sl.title) + "</" + HeadingTag + ">" +
              '<p class="hero-text">' + esc(sl.subtitle) + "</p>" +
              '<div class="hero-actions">' +
                (sl.primary_cta_label ? '<a href="' + esc(sl.primary_cta_href || "donate.html") + '" class="btn btn-gold" tabindex="' + (isActive ? "0" : "-1") + '">' + esc(sl.primary_cta_label) + "</a>" : "") +
                (sl.secondary_cta_label ? '<a href="' + esc(sl.secondary_cta_href || "campaigns.html") + '" class="btn btn-outline-light" tabindex="' + (isActive ? "0" : "-1") + '">' + esc(sl.secondary_cta_label) + "</a>" : "") +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");

    var dotsHtml = slides.map(function (_, idx) {
      var isCurrent = idx === heroIndex;
      return (
        '<button type="button" class="hero-dot" data-slide="' + idx + '" aria-label="Go to slide ' + (idx + 1) + '" aria-current="' + (isCurrent ? "true" : "false") + '">' +
          '<span class="hero-dot-bar" aria-hidden="true"></span>' +
        "</button>"
      );
    }).join("");

    container.innerHTML =
      '<div class="hero-slides" aria-live="polite">' + slidesHtml + "</div>" +
      (slides.length > 1
        ? '<div class="hero-controls">' +
            '<div class="container hero-controls-inner">' +
              '<div class="hero-dots" role="tablist" aria-label="Hero slide selection">' + dotsHtml + "</div>" +
              '<div class="hero-nav-btns">' +
                '<button type="button" class="hero-ctrl-btn" id="hero-prev" aria-label="Previous slide">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' +
                "</button>" +
                '<button type="button" class="hero-ctrl-btn" id="hero-next" aria-label="Next slide">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
                "</button>" +
                '<button type="button" class="hero-ctrl-btn hero-pause-btn" id="hero-pause" aria-pressed="' + heroPaused + '">' +
                  (heroPaused ? "Play" : "Pause") +
                "</button>" +
              "</div>" +
            "</div>" +
          "</div>"
        : "");

    observeImagesForSmoothLoad(container);

    if (slides.length > 1) {
      var goToSlide = function (nextIdx) {
        heroIndex = (nextIdx + slides.length) % slides.length;
        updateHeroSlideClasses(container);
      };

      container.querySelectorAll(".hero-dot").forEach(function (dot) {
        dot.addEventListener("click", function () { goToSlide(Number(dot.dataset.slide)); });
      });
      var prevBtn = document.getElementById("hero-prev");
      var nextBtn = document.getElementById("hero-next");
      var pauseBtn = document.getElementById("hero-pause");

      if (prevBtn) prevBtn.addEventListener("click", function () { goToSlide(heroIndex - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { goToSlide(heroIndex + 1); });
      if (pauseBtn) {
        pauseBtn.addEventListener("click", function () {
          heroPaused = !heroPaused;
          pauseBtn.setAttribute("aria-pressed", String(heroPaused));
          pauseBtn.textContent = heroPaused ? "Play" : "Pause";
          resetHeroTimer(slides.length);
        });
      }

      container.onkeydown = function (e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goToSlide(heroIndex - 1);
        } else if (e.key === "ArrowRight") {
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
    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (heroPaused || prefersReduced || totalSlides <= 1) return;

    heroTimer = setInterval(function () {
      var carousel = document.getElementById("hero-carousel");
      if (!carousel) return;
      if (carousel.matches(":hover") || carousel.contains(document.activeElement)) return;
      heroIndex = (heroIndex + 1) % totalSlides;
      updateHeroSlideClasses(carousel);
    }, 6000);
  }

  // -----------------------------------------------------------------
  // 7. Homepage & Shared Dynamic Section Renderers
  // -----------------------------------------------------------------
  function renderHomeSections() {
    var s = DATA.settings || {};

    var progGrid = document.getElementById("home-programmes");
    if (progGrid) {
      var progs = (DATA.programmes || []).filter(function (p) { return p.active !== false; });
      progGrid.innerHTML = progs.map(function (p) {
        return (
          '<article class="programme-card">' +
            '<div class="programme-icon">' + getProgrammeIcon(p.icon_key) + "</div>" +
            '<h3 class="programme-title">' + esc(p.title) + "</h3>" +
            '<p class="programme-text">' + esc(p.description) + "</p>" +
            '<a href="' + esc(p.link_href) + '" class="programme-link">' + esc(p.link_label) + " &rarr;</a>" +
          "</article>"
        );
      }).join("");
    }

    var homeCamp = document.getElementById("home-campaigns");
    if (homeCamp) {
      var activeCampaigns = (DATA.campaigns || []).filter(function (c) { return c.active !== false; }).slice(0, 3);
      homeCamp.innerHTML = activeCampaigns.map(campaignCardHTML).join("");
    }

    var statsGrid = document.getElementById("home-stats");
    var statsNote = document.getElementById("home-stats-note");
    if (statsGrid && DATA.stats) {
      if (statsNote) statsNote.textContent = DATA.stats.section_note || "";
      statsGrid.innerHTML = (DATA.stats.items || []).map(function (st) {
        return (
          '<div class="stat">' +
            '<div class="stat-value">' + esc(st.value) + "</div>" +
            '<div class="stat-label">' + esc(st.label) + "</div>" +
            (st.note ? '<div class="stat-note">' + esc(st.note) + "</div>" : "") +
          "</div>"
        );
      }).join("");
    }

    var tiersGrid = document.getElementById("home-tiers");
    if (tiersGrid) {
      var tiers = (DATA.donationTiers || []).filter(function (t) { return t.active !== false; });
      tiersGrid.innerHTML = tiers.map(function (t) {
        return (
          '<article class="tier-card">' +
            '<div class="tier-amount">$' + esc(t.amount) + " <small>" + esc(t.currency) + "</small></div>" +
            '<div class="tier-title">' + esc(t.title) + "</div>" +
            '<p class="tier-text">' + esc(t.description) + "</p>" +
            '<a href="donate.html?amount=' + encodeURIComponent(t.amount) + '" class="tier-link">Give $' + esc(t.amount) + " &rarr;</a>" +
          "</article>"
        );
      }).join("");
    }

    var homeStories = document.getElementById("home-stories");
    if (homeStories) {
      var activeStories = (DATA.stories || []).filter(function (st) { return st.active !== false; }).slice(0, 2);
      homeStories.innerHTML = activeStories.map(storyCardHTML).join("");
    }

    var homeGallery = document.getElementById("home-gallery");
    if (homeGallery) {
      var featuredMedia = (DATA.media || []).filter(function (m) { return m.active !== false; }).slice(0, 6);
      homeGallery.innerHTML = featuredMedia.map(galleryCardHTML).join("");
    }

    var qText = document.getElementById("home-quote-text");
    var qAuthor = document.getElementById("home-quote-author");
    var qRole = document.getElementById("home-quote-role");
    if (qText) qText.textContent = s.commitment_quote || "";
    if (qAuthor) qAuthor.textContent = s.commitment_author || "";
    if (qRole) qRole.textContent = s.commitment_role || "";

    var homeFaqs = document.getElementById("home-faqs");
    if (homeFaqs) {
      var activeFaqs = (DATA.faqs || []).filter(function (f) { return f.active !== false; }).slice(0, 4);
      homeFaqs.innerHTML = activeFaqs.map(function (f) {
        return (
          '<details class="faq-item">' +
            '<summary class="faq-question">' + esc(f.question) + "</summary>" +
            '<p class="faq-answer">' + esc(f.answer) + "</p>" +
          "</details>"
        );
      }).join("");
    }
  }

  function campaignCardHTML(c) {
    var target = Number(c.target_amount) || 0;
    var raised = Number(c.raised_amount) || 0;
    var progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
    var metaRight = target > 0
      ? "Target: " + esc(c.currency) + " " + target.toLocaleString()
      : "Ongoing programme";

    return (
      '<a href="campaign.html?slug=' + encodeURIComponent(c.slug) + '" class="campaign-card">' +
        '<div class="campaign-card-image img-frame">' +
          renderImageMarkup(c.image_url, c.image_alt || c.title) +
        "</div>" +
        '<div class="campaign-card-body">' +
          '<p class="card-meta-line">' + esc(c.location) + " · " + esc(c.currency || "USD") + "</p>" +
          '<h3 class="campaign-card-title">' + esc(c.title) + "</h3>" +
          '<p class="campaign-card-summary">' + esc(c.summary) + "</p>" +
          '<div class="progress-bar" role="progressbar" aria-valuenow="' + progress + '" aria-valuemin="0" aria-valuemax="100">' +
            '<div class="progress-fill" style="width:' + progress + '%"></div>' +
          "</div>" +
          '<div class="progress-meta"><span>' + progress + "% funded</span><span>" + metaRight + "</span></div>" +
        "</div>" +
      "</a>"
    );
  }

  function storyCardHTML(st) {
    var d = new Date(st.published_at || Date.now());
    var dateLabel = isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

    return (
      '<a href="story.html?slug=' + encodeURIComponent(st.slug) + '" class="story-card">' +
        '<div class="story-card-image img-frame">' +
          renderImageMarkup(st.image_url, st.image_alt || st.title) +
        "</div>" +
        '<div class="story-card-body">' +
          (dateLabel ? '<p class="card-meta-line">Field Update · ' + esc(dateLabel) + "</p>" : "") +
          '<h3 class="story-card-title">' + esc(st.title) + "</h3>" +
          '<p class="story-card-excerpt">' + esc(st.excerpt) + "</p>" +
        "</div>" +
      "</a>"
    );
  }

  function galleryCardHTML(m) {
    return (
      '<article class="gallery-card">' +
        '<div class="gallery-card-media img-frame">' +
          renderImageMarkup(m.image_url, m.image_alt || m.title) +
        "</div>" +
        '<div class="gallery-card-body">' +
          '<h3 class="gallery-card-title"><a href="media.html?slug=' + encodeURIComponent(m.slug) + '">' + esc(m.title) + "</a></h3>" +
          (m.caption ? '<p class="gallery-card-caption">' + esc(m.caption) + "</p>" : "") +
          (m.license_note ? '<p class="gallery-card-license">' + esc(m.license_note) + "</p>" : "") +
        "</div>" +
      "</article>"
    );
  }

  // -----------------------------------------------------------------
  // 8. Business Details, Legal Dates & Inner Pages
  // -----------------------------------------------------------------
  function renderBusinessDetails() {
    var el = document.getElementById("business-details-list");
    if (!el) return;
    var s = DATA.settings || {};
    el.innerHTML =
      '<div class="business-details-row"><dt>Legal Entity</dt><dd>' + esc(s.organisation_name) + "</dd></div>" +
      '<div class="business-details-row"><dt>Organisation Type</dt><dd>' + esc(s.legal_status) + "</dd></div>" +
      '<div class="business-details-row"><dt>Registration / Registry Ref</dt><dd>' + esc(s.registration_number) + "</dd></div>" +
      '<div class="business-details-row"><dt>Operational Address</dt><dd>' + esc(s.address_line) + "</dd></div>" +
      '<div class="business-details-row"><dt>Operating Hours</dt><dd>' + esc(s.operational_hours) + "</dd></div>" +
      '<div class="business-details-row"><dt>Official Telephone / WhatsApp</dt><dd><a href="https://wa.me/' + esc(s.phone_international) + '" target="_blank" rel="noreferrer noopener" style="text-decoration:underline">' + esc(s.phone_display) + "</a></dd></div>" +
      '<div class="business-details-row"><dt>Email Contact</dt><dd>' + (s.public_email ? '<a href="mailto:' + esc(s.public_email) + '" style="text-decoration:underline">' + esc(s.public_email) + "</a>" : "Available via Contact Form or WhatsApp") + "</dd></div>";
  }

  function renderLegalDates() {
    var legal = DATA.legal || {};
    document.querySelectorAll("[data-legal-field]").forEach(function (el) {
      var key = el.dataset.legalField;
      if (legal[key]) el.textContent = legal[key];
    });
  }

  function initMap() {
    var el = document.getElementById("map");
    if (!el || typeof window.L === "undefined") return;

    var s = DATA.settings || {};
    var lat = Number(s.map_lat) || 0.3025;
    var lng = Number(s.map_lng) || 32.5945;

    if (leafletMap) {
      leafletMap.setView([lat, lng], 14);
      return;
    }

    leafletMap = window.L.map(el).setView([lat, lng], 14);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(leafletMap);
    window.L.marker([lat, lng]).addTo(leafletMap).bindPopup(
      "<strong>" + esc(s.map_label || "") + "</strong><br>" + esc(s.map_description || "")
    );
  }

  function initQurbaniCalculator() {
    var sel = document.getElementById("qurbani-animal");
    var qty = document.getElementById("qurbani-qty");
    var total = document.getElementById("qurbani-total");
    var waBtn = document.getElementById("qurbani-wa-btn");
    if (!sel || !qty || !total) return;

    var s = DATA.settings || {};
    var opts = (DATA.qurbaniOptions || []).filter(function (o) { return o.available !== false; });

    sel.innerHTML = "";
    opts.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = o.label + " — " + o.note + (o.price > 0 ? " ($" + o.price + ")" : "");
      sel.appendChild(opt);
    });

    function update() {
      var cur = opts.find(function (o) { return o.id === sel.value; }) || opts[0];
      var q = Math.max(1, Number(qty.value) || 1);
      var price = cur ? Number(cur.price) || 0 : 0;
      var t = price * q;
      total.textContent = t > 0 ? (cur.currency || "USD") + " " + t.toLocaleString() : "Confirm current price on WhatsApp";
      if (waBtn && cur) {
        var msg = "Assalamu alaikum, I would like to reserve " + q + "x " + cur.label + " for Qurbani.";
        waBtn.href = "https://wa.me/" + encodeURIComponent(s.phone_international) + "?text=" + encodeURIComponent(msg);
      }
    }

    sel.onchange = update;
    qty.oninput = update;
    update();
  }

  function initDonationForm() {
    var form = document.getElementById("donation-form");
    if (!form) return;

    var s = DATA.settings || {};
    var chips = form.querySelectorAll(".form-chip");
    var custom = document.getElementById("custom-amount");
    var campaignSel = document.getElementById("campaign-select");
    var ageCheckbox = document.getElementById("donate-age-consent");
    var summary = document.getElementById("summary-value");
    var submit = document.getElementById("donation-submit");
    var error = document.getElementById("donation-error");

    var campaigns = (DATA.campaigns || []).filter(function (c) { return c.active !== false; });
    if (campaignSel && campaigns.length) {
      var prev = campaignSel.value;
      campaignSel.innerHTML = campaigns.map(function (c) {
        return '<option value="' + esc(c.title) + '">' + esc(c.title) + "</option>";
      }).join("") + '<option value="General Humanitarian Relief">General Humanitarian Relief</option>';
      if (prev) campaignSel.value = prev;
    }

    var presetParam = Number(new URLSearchParams(window.location.search).get("amount"));
    var selectedAmount = presetParam >= 3 ? presetParam : 10;
    if (presetParam >= 3 && [3, 5, 10, 25, 50, 100].indexOf(presetParam) === -1 && custom) {
      custom.value = String(presetParam);
    }

    chips.forEach(function (chip) {
      chip.classList.toggle("form-chip-active", Number(chip.dataset.amount) === selectedAmount && !custom.value);
    });

    function refresh() {
      var eff = custom.value ? Number(custom.value) || 0 : selectedAmount;
      summary.textContent = eff > 0 ? "USD " + eff.toLocaleString() : "—";

      var validAmount = eff >= 3;
      var ageOk = ageCheckbox ? ageCheckbox.checked : true;

      if (!validAmount && eff > 0) {
        error.textContent = "Minimum donation is US$3.";
        error.style.display = "block";
      } else if (!ageOk) {
        error.textContent = "Please confirm age 18+ or parental/guardian consent before continuing.";
        error.style.display = "block";
      } else {
        error.style.display = "none";
      }

      var canSubmit = validAmount && ageOk;
      submit.classList.toggle("form-submit-disabled", !canSubmit);
      submit.setAttribute("aria-disabled", String(!canSubmit));

      if (canSubmit) {
        var msg = "Assalamu alaikum, I would like to donate USD " + eff + " toward " + campaignSel.value + ".";
        submit.href = "https://wa.me/" + encodeURIComponent(s.phone_international) + "?text=" + encodeURIComponent(msg);
      } else {
        submit.href = "#";
      }
    }

    chips.forEach(function (chip) {
      chip.onclick = function () {
        chips.forEach(function (c) { c.classList.remove("form-chip-active"); });
        chip.classList.add("form-chip-active");
        selectedAmount = Number(chip.dataset.amount);
        custom.value = "";
        refresh();
      };
    });
    custom.oninput = function () {
      chips.forEach(function (c) { c.classList.remove("form-chip-active"); });
      refresh();
    };
    campaignSel.onchange = refresh;
    if (ageCheckbox) ageCheckbox.onchange = refresh;
    submit.onclick = function (e) {
      if (submit.getAttribute("aria-disabled") === "true") {
        e.preventDefault();
        error.style.display = "block";
      }
    };
    refresh();
  }

  function initContactPage() {
    var s = DATA.settings || {};
    var waText = document.getElementById("contact-wa-number");
    var waBtn = document.getElementById("contact-wa-btn");
    var emailBox = document.getElementById("contact-email-box");
    var addressText = document.getElementById("contact-address-text");
    var hoursText = document.getElementById("contact-hours-text");

    if (waText) waText.textContent = s.phone_display || "+256 708 684 223";
    if (waBtn) waBtn.href = "https://wa.me/" + encodeURIComponent(s.phone_international);
    if (addressText) addressText.textContent = s.address_line || s.map_label || "Nsambya, Kampala, Uganda";
    if (hoursText) hoursText.textContent = s.operational_hours || "";
    if (emailBox) {
      emailBox.innerHTML = s.public_email
        ? '<a href="mailto:' + esc(s.public_email) + '" style="text-decoration:underline; font-weight:600">' + esc(s.public_email) + "</a>"
        : "Use the secure inquiry form below or message us on WhatsApp.";
    }

    var form = document.getElementById("contact-form");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var errEl = document.getElementById("contact-form-error");
      var okEl = document.getElementById("contact-form-success");
      var submitBtn = document.getElementById("contact-submit-btn");
      errEl.style.display = "none";
      okEl.style.display = "none";

      var name = document.getElementById("contact-name").value.trim();
      var contact_value = document.getElementById("contact-value").value.trim();
      var subject = document.getElementById("contact-subject").value.trim();
      var message = document.getElementById("contact-message").value.trim();
      var age_consent = document.getElementById("contact-age-consent").checked;

      if (!name || !contact_value || message.length < 5) {
        errEl.textContent = "Please provide your name, a contact phone or email, and a short message.";
        errEl.style.display = "block";
        return;
      }
      if (!age_consent) {
        errEl.textContent = "Please confirm you are 18+ or have parental/guardian consent.";
        errEl.style.display = "block";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      try {
        var refId = await DB.submitContactInquiry({
          name: name,
          contact_value: contact_value,
          subject: subject,
          message: message,
          age_consent: age_consent
        });
        form.reset();
        okEl.textContent = "Thank you. Your inquiry has been received (Reference: " + refId + "). Our Kampala team will reply via your provided contact channel.";
        okEl.style.display = "block";
      } catch (err) {
        errEl.textContent = "Unable to submit online in offline/local mode. Please message us directly on WhatsApp at " + (s.phone_display || "+256 708 684 223") + ".";
        errEl.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Inquiry";
      }
    });
  }

  function initDataDeletionPage() {
    var form = document.getElementById("deletion-form");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    var clearLocalBtn = document.getElementById("clear-local-storage-btn");
    if (clearLocalBtn) {
      clearLocalBtn.addEventListener("click", function () {
        try {
          localStorage.removeItem("mq_cookie_prefs");
          var msg = document.getElementById("local-clear-msg");
          if (msg) {
            msg.textContent = "Local browser preferences cleared.";
            msg.style.display = "block";
          }
        } catch (e) {
          // Ignore
        }
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var errEl = document.getElementById("deletion-error");
      var okEl = document.getElementById("deletion-success");
      var submitBtn = document.getElementById("deletion-submit-btn");
      errEl.style.display = "none";
      okEl.style.display = "none";

      var requester_name = document.getElementById("del-name").value.trim();
      var contact_info = document.getElementById("del-contact").value.trim();
      var request_type = document.getElementById("del-type").value;
      var details = document.getElementById("del-details").value.trim();
      var age_consent = document.getElementById("del-age-consent").checked;

      if (!requester_name || !contact_info) {
        errEl.textContent = "Please enter your name and the phone number or email associated with your record.";
        errEl.style.display = "block";
        return;
      }
      if (!age_consent) {
        errEl.textContent = "Please confirm you are 18+ or acting as a parent or legal guardian.";
        errEl.style.display = "block";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting Request...";
      try {
        var refId = await DB.submitDataDeletionRequest({
          requester_name: requester_name,
          contact_info: contact_info,
          request_type: request_type,
          details: details,
          age_consent: age_consent
        });
        form.reset();
        okEl.textContent = "Your data deletion request has been logged (Reference ID: " + refId + "). We process verified erasure requests within 14 business days.";
        okEl.style.display = "block";
      } catch (err) {
        errEl.textContent = "Could not submit online in offline/local mode. Please contact our team via WhatsApp to request immediate manual deletion.";
        errEl.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Data Request";
      }
    });
  }

  function initListAndDetailPages() {
    var s = DATA.settings || {};

    var campGrid = document.getElementById("campaigns-grid");
    if (campGrid) {
      var activeCamps = (DATA.campaigns || []).filter(function (c) { return c.active !== false; });
      campGrid.innerHTML = activeCamps.length ? activeCamps.map(campaignCardHTML).join("") : '<p class="page-empty">No active campaigns available right now.</p>';
    }

    var storiesGrid = document.getElementById("stories-grid");
    if (storiesGrid) {
      var activeStories = (DATA.stories || []).filter(function (st) { return st.active !== false; });
      storiesGrid.innerHTML = activeStories.length ? activeStories.map(storyCardHTML).join("") : '<p class="page-empty">No field stories published yet.</p>';
    }

    var galleryGrid = document.getElementById("gallery-grid");
    if (galleryGrid) {
      var activeMedia = (DATA.media || []).filter(function (m) { return m.active !== false; });
      galleryGrid.innerHTML = activeMedia.length ? activeMedia.map(galleryCardHTML).join("") : '<p class="page-empty">No media items available.</p>';
    }

    var faqFull = document.getElementById("faq-list-full");
    if (faqFull) {
      var activeFaqs = (DATA.faqs || []).filter(function (f) { return f.active !== false; });
      faqFull.innerHTML = activeFaqs.map(function (f) {
        return (
          '<details class="faq-item">' +
            '<summary class="faq-question">' + esc(f.question) + "</summary>" +
            '<p class="faq-answer">' + esc(f.answer) + "</p>" +
          "</details>"
        );
      }).join("");
    }

    if (document.getElementById("campaign-detail")) {
      var cSlug = getSlugParam();
      var c = (DATA.campaigns || []).find(function (x) { return x.slug === cSlug; }) || (DATA.campaigns || [])[0];
      if (!c) {
        document.getElementById("campaign-detail").innerHTML = '<p class="page-empty">Campaign not found.</p>';
      } else {
        document.title = c.title + " — Mustaqiim Relief and Charity Foundation";
        document.getElementById("campaign-location").textContent = c.location;
        document.getElementById("campaign-title").textContent = c.title;
        document.getElementById("campaign-description").textContent = c.description;
        var imgWrap = document.getElementById("campaign-image");
        if (imgWrap) imgWrap.innerHTML = renderImageMarkup(c.image_url, c.image_alt || c.title, true);
        var target = Number(c.target_amount) || 0;
        var raised = Number(c.raised_amount) || 0;
        var progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
        document.getElementById("campaign-progress").style.width = progress + "%";
        document.getElementById("campaign-meta").textContent =
          target > 0
            ? progress + "% funded — Target: " + c.currency + " " + target.toLocaleString()
            : "Ongoing humanitarian programme — Donate any amount from US$3";
        document.getElementById("campaign-wa").href =
          "https://wa.me/" + encodeURIComponent(s.phone_international) + "?text=" +
          encodeURIComponent("Assalamu alaikum, I would like to support " + c.title);
      }
    }

    if (document.getElementById("story-detail")) {
      var stSlug = getSlugParam();
      var st = (DATA.stories || []).find(function (x) { return x.slug === stSlug; }) || (DATA.stories || [])[0];
      if (!st) {
        document.getElementById("story-detail").innerHTML = '<p class="page-empty">Story not found.</p>';
      } else {
        document.title = st.title + " — Mustaqiim Relief and Charity Foundation";
        var d = new Date(st.published_at || Date.now());
        document.getElementById("story-date").textContent = isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
        document.getElementById("story-title").textContent = st.title;
        document.getElementById("story-body").textContent = st.body;
        var stImgWrap = document.getElementById("story-image");
        if (stImgWrap) stImgWrap.innerHTML = renderImageMarkup(st.image_url, st.image_alt || st.title, true);
      }
    }

    if (document.getElementById("media-detail")) {
      var mSlug = getSlugParam();
      var m = (DATA.media || []).find(function (x) { return x.slug === mSlug; }) || (DATA.media || [])[0];
      if (!m) {
        document.getElementById("media-detail").innerHTML = '<p class="page-empty">Media item not found.</p>';
      } else {
        document.title = m.title + " — Mustaqiim Relief and Charity Foundation";
        document.getElementById("media-title").textContent = m.title;
        document.getElementById("media-caption").textContent = m.caption || "";
        var licenseEl = document.getElementById("media-license");
        if (licenseEl) licenseEl.textContent = m.license_note || "Licensed editorial media — Mustaqiim Relief and Charity Foundation";
        var player = document.getElementById("media-player");
        if (player) {
          if (m.media_type === "video" && m.video_url) {
            player.innerHTML = '<video controls style="width:100%; height:100%; border-radius:14px;" poster="' + esc(normalizeUrl(m.image_url)) + '"><source src="' + esc(m.video_url) + '"></video>';
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
    observeImagesForSmoothLoad(document);
    initScrollReveal();
  }

  // -----------------------------------------------------------------
  // Boot Sequence
  // -----------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", async function () {
    hydrateAll();
    initCookieBanner();
    if (typeof DB.loadLiveSiteData === "function") {
      try {
        DATA = await DB.loadLiveSiteData();
        hydrateAll();
      } catch (err) {
        // Bundled defaults remain active
      }
    }
  });
})();
