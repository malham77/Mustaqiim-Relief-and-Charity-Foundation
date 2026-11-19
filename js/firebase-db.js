// -----------------------------------------------------------------
// FIREBASE FIRESTORE & AUTH INTEGRATION
// Connects public pages and Admin Dashboard to live Cloud Firestore.
// -----------------------------------------------------------------

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { DEFAULT_DATA } from './data.js';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write'
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser ? auth.currentUser.uid : null,
      email: auth.currentUser ? auth.currentUser.email : null,
      emailVerified: auth.currentUser ? auth.currentUser.emailVerified : null,
      isAnonymous: auth.currentUser ? auth.currentUser.isAnonymous : null,
      tenantId: auth.currentUser ? auth.currentUser.tenantId : null,
      providerInfo: auth.currentUser && auth.currentUser.providerData
        ? auth.currentUser.providerData.map((p) => ({
            providerId: p.providerId,
            email: p.email
          }))
        : []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory Connection Validation Probe
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firebase Firestore is offline. Please verify firebase-applet-config.json.');
    }
  }
}
testConnection();

function safeStr(val, maxLen) {
  return String(val == null ? '' : val).trim().slice(0, maxLen);
}

function slugifyId(val) {
  return String(val || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// -----------------------------------------------------------------
// Public Read Hydration
// -----------------------------------------------------------------
export async function loadLiveSiteData() {
  const result = structuredClone(DEFAULT_DATA);

  try {
    const [
      settingsSnap,
      imagesSnap,
      legalSnap,
      statsSnap,
      heroSnap,
      campaignsSnap,
      storiesSnap,
      mediaSnap,
      qurbaniSnap,
      faqsSnap,
      programmesSnap,
      tiersSnap
    ] = await Promise.all([
      getDoc(doc(db, 'site_content', 'settings')),
      getDoc(doc(db, 'site_content', 'images')),
      getDoc(doc(db, 'site_content', 'legal')),
      getDoc(doc(db, 'site_content', 'stats')),
      getDocs(collection(db, 'hero_slides')),
      getDocs(collection(db, 'campaigns')),
      getDocs(collection(db, 'stories')),
      getDocs(collection(db, 'media')),
      getDocs(collection(db, 'qurbani_options')),
      getDocs(collection(db, 'faqs')),
      getDocs(collection(db, 'programmes')),
      getDocs(collection(db, 'donation_tiers'))
    ]);

    if (settingsSnap.exists()) {
      result.settings = { ...result.settings, ...settingsSnap.data() };
    }
    if (imagesSnap.exists()) {
      result.images = { ...result.images, ...imagesSnap.data() };
    }
    if (legalSnap.exists()) {
      result.legal = { ...result.legal, ...legalSnap.data() };
    }
    if (statsSnap.exists()) {
      const st = statsSnap.data();
      result.stats = {
        section_note: st.section_note || result.stats.section_note,
        items: Array.isArray(st.items) && st.items.length ? st.items : result.stats.items
      };
    }

    if (!heroSnap.empty) {
      result.heroSlides = heroSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    if (!campaignsSnap.empty) {
      result.campaigns = campaignsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    if (!storiesSnap.empty) {
      result.stories = storiesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    }
    if (!mediaSnap.empty) {
      result.media = mediaSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    if (!qurbaniSnap.empty) {
      result.qurbaniOptions = qurbaniSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    if (!faqsSnap.empty) {
      result.faqs = faqsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    if (!programmesSnap.empty) {
      result.programmes = programmesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    if (!tiersSnap.empty) {
      result.donationTiers = tiersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  } catch (error) {
    console.warn('Using bundled site defaults; Firestore sync skipped or partial:', error?.message || error);
  }

  window.MQ_DATA = result;
  return result;
}

// -----------------------------------------------------------------
// Public Form Submissions (Minimal Data + Age Consent)
// -----------------------------------------------------------------
export async function submitContactInquiry({ name, contact_value, subject, message, age_consent }) {
  const path = 'contact_inquiries';
  if (!age_consent) {
    throw new Error('Age or parental consent confirmation is required.');
  }
  const payload = {
    name: safeStr(name, 120),
    contact_value: safeStr(contact_value, 160),
    subject: safeStr(subject || 'General Inquiry', 160),
    message: safeStr(message, 2000),
    age_consent: true,
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitDataDeletionRequest({ requester_name, contact_info, request_type, details, age_consent }) {
  const path = 'data_deletion_requests';
  if (!age_consent) {
    throw new Error('Age or parental consent confirmation is required.');
  }
  const allowedTypes = ['delete_all', 'delete_inquiry', 'access_copy'];
  const cleanType = allowedTypes.includes(request_type) ? request_type : 'delete_all';
  const payload = {
    requester_name: safeStr(requester_name, 120),
    contact_info: safeStr(contact_info, 160),
    request_type: cleanType,
    details: safeStr(details || '', 1000),
    age_consent: true,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// -----------------------------------------------------------------
// Admin Auth & Authorization
// -----------------------------------------------------------------
export async function signInAdminWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutAdmin() {
  await signOut(auth);
}

export function watchAdminAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function checkIsAdmin(user) {
  if (!user || !user.emailVerified) return false;
  if (user.email === 'maleham06@gmail.com') return true;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    return false;
  }
}

// -----------------------------------------------------------------
// Admin Write & Management Operations (Blueprint-Compliant)
// -----------------------------------------------------------------
export async function saveSettingsDoc(data) {
  const path = 'site_content/settings';
  const payload = {
    organisation_name: safeStr(data.organisation_name, 160) || 'Mustaqiim Relief and Charity Foundation',
    tagline: safeStr(data.tagline, 240),
    registration_number: safeStr(data.registration_number, 120),
    legal_status: safeStr(data.legal_status, 160),
    operational_hours: safeStr(data.operational_hours, 160),
    address_line: safeStr(data.address_line, 240),
    phone_display: safeStr(data.phone_display, 40) || '+256 708 684 223',
    phone_international: safeStr(data.phone_international, 30).replace(/[^0-9]/g, '') || '256708684223',
    whatsapp_message: safeStr(data.whatsapp_message, 300),
    public_email: safeStr(data.public_email, 160),
    facebook_url: safeStr(data.facebook_url, 300),
    instagram_url: safeStr(data.instagram_url, 300),
    map_lat: Number.isFinite(Number(data.map_lat)) ? Number(data.map_lat) : 0.3025,
    map_lng: Number.isFinite(Number(data.map_lng)) ? Number(data.map_lng) : 32.5945,
    map_label: safeStr(data.map_label, 160) || 'Nsambya, Kampala, Uganda',
    map_description: safeStr(data.map_description, 300),
    announcement_text: safeStr(data.announcement_text, 240),
    footer_mission: safeStr(data.footer_mission, 400),
    commitment_quote: safeStr(data.commitment_quote, 500),
    commitment_author: safeStr(data.commitment_author, 160),
    commitment_role: safeStr(data.commitment_role, 160),
    updatedAt: serverTimestamp()
  };
  try {
    await setDoc(doc(db, 'site_content', 'settings'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveLegalDoc(data) {
  const path = 'site_content/legal';
  const payload = {
    privacy_updated: safeStr(data.privacy_updated, 80) || 'November 2026',
    terms_updated: safeStr(data.terms_updated, 80) || 'November 2026',
    refund_updated: safeStr(data.refund_updated, 80) || 'November 2026',
    cookie_updated: safeStr(data.cookie_updated, 80) || 'November 2026',
    donation_policy_updated: safeStr(data.donation_policy_updated, 80) || 'November 2026',
    data_deletion_updated: safeStr(data.data_deletion_updated, 80) || 'November 2026',
    privacy_contact_note: safeStr(data.privacy_contact_note, 400),
    updatedAt: serverTimestamp()
  };
  try {
    await setDoc(doc(db, 'site_content', 'legal'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveStatsDoc(data) {
  const path = 'site_content/stats';
  const items = Array.isArray(data.items)
    ? data.items.slice(0, 6).map((item) => ({
        label: safeStr(item.label, 80),
        value: safeStr(item.value, 60),
        note: safeStr(item.note, 120)
      }))
    : [];
  const payload = {
    section_note: safeStr(data.section_note, 300),
    items,
    updatedAt: serverTimestamp()
  };
  try {
    await setDoc(doc(db, 'site_content', 'stats'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSiteImagesDoc(data) {
  const path = 'site_content/images';
  const def = DEFAULT_DATA.images;
  const payload = {
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
    updatedAt: serverTimestamp()
  };
  try {
    await setDoc(doc(db, 'site_content', 'images'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function sanitizeEntityPayload(collectionName, raw) {
  switch (collectionName) {
    case 'hero_slides':
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
        updatedAt: serverTimestamp()
      };
    case 'campaigns':
      return {
        slug: slugifyId(raw.slug || raw.title) || 'campaign-item',
        title: safeStr(raw.title, 160),
        summary: safeStr(raw.summary, 400),
        description: safeStr(raw.description, 4000),
        image_url: safeStr(raw.image_url, 500),
        image_alt: safeStr(raw.image_alt, 240),
        target_amount: Math.max(0, Number(raw.target_amount) || 0),
        raised_amount: Math.max(0, Number(raw.raised_amount) || 0),
        currency: safeStr(raw.currency, 10) || 'USD',
        location: safeStr(raw.location, 120) || 'Uganda',
        active: Boolean(raw.active),
        order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
        updatedAt: serverTimestamp()
      };
    case 'stories':
      return {
        slug: slugifyId(raw.slug || raw.title) || 'story-item',
        title: safeStr(raw.title, 180),
        excerpt: safeStr(raw.excerpt, 400),
        body: safeStr(raw.body, 8000),
        image_url: safeStr(raw.image_url, 500),
        image_alt: safeStr(raw.image_alt, 240),
        published_at: safeStr(raw.published_at, 60) || new Date().toISOString(),
        active: Boolean(raw.active),
        updatedAt: serverTimestamp()
      };
    case 'media':
      return {
        slug: slugifyId(raw.slug || raw.title) || 'media-item',
        title: safeStr(raw.title, 160),
        caption: safeStr(raw.caption, 400),
        media_type: raw.media_type === 'video' ? 'video' : 'photo',
        image_url: safeStr(raw.image_url, 500),
        video_url: safeStr(raw.video_url, 500),
        image_alt: safeStr(raw.image_alt, 240) || safeStr(raw.title, 160),
        license_note: safeStr(raw.license_note, 240),
        featured: Boolean(raw.featured),
        order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
        active: Boolean(raw.active),
        updatedAt: serverTimestamp()
      };
    case 'qurbani_options':
      return {
        label: safeStr(raw.label, 100),
        note: safeStr(raw.note, 120),
        price: Math.max(0, Number(raw.price) || 0),
        currency: safeStr(raw.currency, 10) || 'USD',
        available: Boolean(raw.available),
        order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
        updatedAt: serverTimestamp()
      };
    case 'faqs':
      return {
        question: safeStr(raw.question, 240),
        answer: safeStr(raw.answer, 2000),
        order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
        active: Boolean(raw.active),
        updatedAt: serverTimestamp()
      };
    case 'programmes':
      return {
        title: safeStr(raw.title, 120),
        description: safeStr(raw.description, 400),
        link_label: safeStr(raw.link_label, 60) || 'Learn more',
        link_href: safeStr(raw.link_href, 200) || 'about.html',
        icon_key: ['qurbani', 'food', 'water', 'community', 'children'].includes(raw.icon_key) ? raw.icon_key : 'community',
        order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
        active: Boolean(raw.active),
        updatedAt: serverTimestamp()
      };
    case 'donation_tiers':
      return {
        amount: Math.max(3, Number(raw.amount) || 3),
        currency: safeStr(raw.currency, 10) || 'USD',
        title: safeStr(raw.title, 100),
        description: safeStr(raw.description, 300),
        order: Math.max(0, Math.min(1000, Number(raw.order) || 0)),
        active: Boolean(raw.active),
        updatedAt: serverTimestamp()
      };
    default:
      throw new Error('Unknown collection: ' + collectionName);
  }
}

export async function upsertCollectionItem(collectionName, docId, rawData) {
  const cleanId = slugifyId(docId) || 'item-' + Date.now();
  const path = collectionName + '/' + cleanId;
  const payload = sanitizeEntityPayload(collectionName, rawData);
  try {
    await setDoc(doc(db, collectionName, cleanId), payload);
    return cleanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCollectionItem(collectionName, docId) {
  const path = collectionName + '/' + docId;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listProtectedCollection(collectionName) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export async function updateRequestStatus(collectionName, docId, status) {
  const path = collectionName + '/' + docId;
  try {
    await updateDoc(doc(db, collectionName, docId), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addAdminRecord(uid, email, displayName) {
  const cleanUid = safeStr(uid, 128).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanUid) throw new Error('Valid Firebase UID is required.');
  const path = 'admins/' + cleanUid;
  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      email: safeStr(email, 160),
      display_name: safeStr(displayName || '', 120),
      added_by: auth.currentUser ? auth.currentUser.uid : 'system',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function seedDatabaseDefaults() {
  try {
    const batch = writeBatch(db);

    batch.set(doc(db, 'site_content', 'settings'), {
      ...DEFAULT_DATA.settings,
      updatedAt: serverTimestamp()
    });
    batch.set(doc(db, 'site_content', 'images'), {
      ...DEFAULT_DATA.images,
      updatedAt: serverTimestamp()
    });
    batch.set(doc(db, 'site_content', 'legal'), {
      ...DEFAULT_DATA.legal,
      updatedAt: serverTimestamp()
    });
    batch.set(doc(db, 'site_content', 'stats'), {
      ...DEFAULT_DATA.stats,
      updatedAt: serverTimestamp()
    });

    DEFAULT_DATA.heroSlides.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'hero_slides', id), { ...rest, updatedAt: serverTimestamp() });
    });
    DEFAULT_DATA.programmes.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'programmes', id), { ...rest, updatedAt: serverTimestamp() });
    });
    DEFAULT_DATA.campaigns.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'campaigns', id), { ...rest, updatedAt: serverTimestamp() });
    });
    DEFAULT_DATA.stories.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'stories', id), { ...rest, updatedAt: serverTimestamp() });
    });
    DEFAULT_DATA.media.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'media', id), { ...rest, updatedAt: serverTimestamp() });
    });
    DEFAULT_DATA.qurbaniOptions.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'qurbani_options', id), { ...rest, updatedAt: serverTimestamp() });
    });
    DEFAULT_DATA.faqs.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'faqs', id), { ...rest, updatedAt: serverTimestamp() });
    });
    DEFAULT_DATA.donationTiers.forEach((item) => {
      const { id, ...rest } = item;
      batch.set(doc(db, 'donation_tiers', id), { ...rest, updatedAt: serverTimestamp() });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_defaults_batch');
  }
}
