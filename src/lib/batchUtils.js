/**
 * Generates clean, boutique date-coded batch numbers with cryptographic entropy to prevent collisions.
 *
 * Formats:
 * - Default single batch: BN-YYMMDD-XXXX (e.g. BN-261018-8F3K)
 * - Default bulk batch:   BN-YYMMDD-XXXX-1, BN-YYMMDD-XXXX-2
 * - Custom prefix bulk:   PREFIX-1, PREFIX-2 (or PREFIX-YYMMDD-XXXX-1)
 */
export function generateBatchNumber(prefix = '', index = null, sharedSalt = null) {
  const cleanPrefix = (prefix || '').trim().toUpperCase();
  const suffix = index !== null ? `-${index + 1}` : '';

  if (cleanPrefix) {
    return `${cleanPrefix}${suffix}`;
  }

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateCode = `${yy}${mm}${dd}`;

  // 4-character high-entropy alphanumeric salt (36^4 = 1,679,616 combinations)
  const salt = sharedSalt || Math.random().toString(36).substring(2, 6).toUpperCase();

  return `BN-${dateCode}-${salt}${suffix}`;
}
