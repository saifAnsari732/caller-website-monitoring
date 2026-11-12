import crypto from 'crypto';

const REPEATED_DIGIT_REGEX = /^(\d)\1{9}$/;
const SEQUENTIAL_REGEX = /^(0123456789|1234567890|9876543210|0987654321)$/;
const JUNK_NAMES = ['test', 'asdf', 'fake', 'demo', 'na', 'n/a', 'none', 'xyz', 'qwe', 'qwerty', 'abc'];

export function analyzeLeadQuality({ name = '', mobile = '', email = '', city = '', state = '', business_type = '', product_interest = '' }) {
  const flags = [];
  let score = 0;

  const rawMobile = String(mobile || '').replace(/\D/g, '');
  const cleanMobile = rawMobile.length === 10 ? rawMobile : (rawMobile.length > 10 ? rawMobile.slice(-10) : '');

  // 1. Phone validation
  if (!cleanMobile || cleanMobile.length !== 10) {
    flags.push('Invalid phone format');
  } else if (!/^[6-9]/.test(cleanMobile)) {
    flags.push('Unrecognized Indian mobile prefix');
    score += 5;
  } else if (REPEATED_DIGIT_REGEX.test(cleanMobile) || SEQUENTIAL_REGEX.test(cleanMobile)) {
    flags.push('Suspect fake/dummy phone number');
  } else {
    score += 35; // Valid verified Indian mobile
  }

  // 2. Name validation
  const cleanName = String(name || '').trim();
  if (!cleanName || cleanName.length < 2) {
    flags.push('Missing or too short name');
  } else if (JUNK_NAMES.includes(cleanName.toLowerCase())) {
    flags.push('Suspect test/dummy name');
  } else if (!/[A-Za-z]/.test(cleanName)) {
    flags.push('Name contains no letters');
  } else {
    score += 25; // Valid name
  }

  // 3. Email validation
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    score += 15;
    if (cleanEmail.includes('gmail.com') || cleanEmail.includes('yahoo.com') || cleanEmail.includes('outlook.com')) {
      score += 5;
    }
  }

  // 4. Commercial Intent (Business type & Product preference)
  const bType = String(business_type || '').trim();
  if (bType && bType.length > 2) {
    score += 10;
  }

  const pInterest = String(product_interest || '').trim();
  if (pInterest && pInterest.length > 2) {
    score += 10;
  }

  // Tier classification
  let tier = 'Standard';
  let isSpam = false;

  if (flags.includes('Suspect fake/dummy phone number') || flags.includes('Suspect test/dummy name')) {
    tier = 'Suspect / Spam';
    isSpam = true;
    score = Math.min(score, 20);
  } else if (score >= 80) {
    tier = 'High Intent (VIP)';
  } else if (score >= 55) {
    tier = 'Standard';
  } else {
    tier = 'Low Intent';
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    tier,
    isSpam,
    flags,
    cleanMobile,
    cleanEmail,
    cleanName
  };
}

export function hashMetaUserData(val = '') {
  if (!val) return '';
  return crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex');
}
