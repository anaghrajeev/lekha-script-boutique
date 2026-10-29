import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
const supabaseAnon = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnon);

/**
 * Fetches all rows from a Supabase table, bypassing the default 1000-row PostgREST limit.
 * Uses parallel range requests based on exact row count for maximum speed,
 * and falls back to sequential range paging if count check fails.
 *
 * @param {string} table - Table name
 * @param {string} [select='*'] - Select expression
 * @param {function} [queryModifier] - Optional function to apply filters/sorting, e.g. (q) => q.order('created_at', { ascending: false })
 * @param {number} [pageSize=1000] - Batch page size
 * @returns {Promise<Array>} Array of all matching rows
 */
export async function fetchAllRows(table, select = '*', queryModifier = null, pageSize = 1000) {
  try {
    let countQ = supabase.from(table).select('*', { count: 'exact', head: true });
    if (queryModifier) {
      countQ = queryModifier(countQ);
    }
    const { count, error: countErr } = await countQ;
    if (countErr) throw countErr;

    if (count == null || count === 0) return [];

    const totalPages = Math.ceil(count / pageSize);
    if (totalPages === 1) {
      let q = supabase.from(table).select(select);
      if (queryModifier) q = queryModifier(q);
      const { data, error } = await q.range(0, pageSize - 1);
      if (error) throw error;
      return data || [];
    }

    const pagePromises = Array.from({ length: totalPages }, (_, i) => {
      let q = supabase.from(table).select(select);
      if (queryModifier) q = queryModifier(q);
      return q.range(i * pageSize, (i + 1) * pageSize - 1);
    });

    const results = await Promise.all(pagePromises);
    const combined = [];
    for (const res of results) {
      if (res.error) throw res.error;
      if (res.data) combined.push(...res.data);
    }
    return combined;
  } catch (err) {
    console.warn(`Parallel fetch failed for ${table}, falling back to sequential paging:`, err);
    const allRows = [];
    let from = 0;
    while (true) {
      let q = supabase.from(table).select(select);
      if (queryModifier) q = queryModifier(q);
      const { data, error } = await q.range(from, from + pageSize - 1);
      if (error) throw error;
      if (data && data.length > 0) allRows.push(...data);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    return allRows;
  }
}

