const crypto = require('crypto');

/**
 * Normalizes company names.
 * Removes common suffixes (Inc, LLC, Co, Ltd) and converts to Title Case.
 */
function normalizeCompanyName(name) {
  if (!name || typeof name !== 'string') return '';
  
  // Clean whitespace and lowercase for matching
  let clean = name.trim();
  
  // Regex to remove common corporate suffixes (case-insensitive, whole-word or trailing)
  const suffixRegex = /\b(llc|inc|ltd|corp|co|co\.|corporation|incorporated|limited)\b/gi;
  clean = clean.replace(suffixRegex, '');
  
  // Remove trailing dots, commas, or dashes
  clean = clean.replace(/[,.\-\s]+$/, '').replace(/^[,.\-\s]+/, '');
  
  // Normalize spacing
  clean = clean.replace(/\s+/g, ' ');
  
  if (clean.length === 0) return name.trim();
  
  // Convert to Title Case (e.g. "google llc" -> "Google")
  return clean.split(' ')
    .map(word => {
      // Check if it's already mixed case (e.g. "eBay" or "McDonalds") and preserve it,
      // otherwise capitalize first letter.
      if (word === word.toUpperCase() && word.length > 1 && word.length <= 4) {
        return word; // Keep acronyms like "AWS"
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Computes a SHA-256 hash of a salary submission's core values to prevent duplication.
 */
function computeDuplicateHash(companyId, levelName, title, location, baseSalary, stockGrant, bonus, yoe) {
  const cleanLevel = String(levelName).trim().toLowerCase();
  const cleanTitle = String(title).trim().toLowerCase();
  const cleanLoc = String(location).trim().toLowerCase();
  
  const rawStr = `${companyId}|${cleanLevel}|${cleanTitle}|${cleanLoc}|${Number(baseSalary)}|${Number(stockGrant || 0)}|${Number(bonus || 0)}|${Number(yoe)}`;
  
  return crypto.createHash('sha256').update(rawStr).digest('hex');
}

/**
 * Intelligently maps an unknown level name to standard categories:
 * "Entry", "Mid", "Senior", "Staff", "Principal"
 */
function guessStandardLevel(levelName, companyName = '') {
  const clean = String(levelName).trim().toUpperCase();
  const compClean = String(companyName).trim().toLowerCase();
  
  // Standard FAANG mappings
  if (compClean.includes('google') || compClean.includes('amazon')) {
    if (clean.includes('L3') || clean.includes('3')) return 'Entry';
    if (clean.includes('L4') || clean.includes('4')) return 'Mid';
    if (clean.includes('L5') || clean.includes('5')) return 'Senior';
    if (clean.includes('L6') || clean.includes('6')) return 'Staff';
    if (clean.includes('L7') || clean.includes('L8') || clean.includes('7') || clean.includes('8')) return 'Principal';
  }
  
  if (compClean.includes('meta')) {
    if (clean.includes('E3') || clean.includes('3')) return 'Entry';
    if (clean.includes('E4') || clean.includes('4')) return 'Mid';
    if (clean.includes('E5') || clean.includes('5')) return 'Senior';
    if (clean.includes('E6') || clean.includes('6')) return 'Staff';
    if (clean.includes('E7') || clean.includes('E8') || clean.includes('7') || clean.includes('8')) return 'Principal';
  }

  if (compClean.includes('microsoft')) {
    const num = parseInt(clean.replace(/\D/g, ''));
    if (!isNaN(num)) {
      if (num <= 60) return 'Entry';
      if (num <= 62) return 'Mid';
      if (num <= 64) return 'Senior';
      if (num <= 65) return 'Staff';
      return 'Principal';
    }
  }

  // General heuristic mapping
  if (clean.includes('ENTRY') || clean.includes('JUN') || clean.includes('ASSOCIATE') || clean.includes('I') && !clean.includes('III') && !clean.includes('IV')) {
    return 'Entry';
  }
  if (clean.includes('SENIOR') || clean.includes('SR') || clean.includes('III') || clean.includes('L5') || clean.includes('E5')) {
    return 'Senior';
  }
  if (clean.includes('STAFF') || clean.includes('LEAD') || clean.includes('IV') || clean.includes('L6') || clean.includes('E6')) {
    return 'Staff';
  }
  if (clean.includes('PRINCIPAL') || clean.includes('DIR') || clean.includes('MGR') || clean.includes('VP') || clean.includes('ARCHITECT')) {
    return 'Principal';
  }
  if (clean.includes('MID') || clean.includes('II') || clean.includes('L4') || clean.includes('E4')) {
    return 'Mid';
  }
  
  // Default fallback
  return 'Senior';
}

module.exports = {
  normalizeCompanyName,
  computeDuplicateHash,
  guessStandardLevel
};
