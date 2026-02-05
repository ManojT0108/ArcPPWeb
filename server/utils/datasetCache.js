const axios = require('axios');
const cheerio = require('cheerio');

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const DATASET_CACHE = new Map();

function cacheGet(id) {
  const hit = DATASET_CACHE.get(id);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    DATASET_CACHE.delete(id);
    return null;
  }
  return hit.data;
}

function cacheSet(id, data) {
  DATASET_CACHE.set(id, { ts: Date.now(), data });
}

async function scrapeProteomeCentral(datasetId) {
  const cached = cacheGet(datasetId);
  if (cached) return cached;

  const url = `https://proteomecentral.proteomexchange.org/cgi/GetDataset?ID=${encodeURIComponent(
    datasetId
  )}`;
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'ArcPP/1.0 (academic; mailto:lab@example.org)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 20000,
  });

  const $ = cheerio.load(html);
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const eq = (s) => norm(s).toLowerCase();

  // Title
  const title =
    norm($('td:contains("Title")').first().next('td').text()) ||
    norm($('th:contains("Title")').first().next('td').text()) ||
    norm($('b:contains("Title")').parent().next().text()) ||
    null;

  // Publication List
  let firstPublicationRow = null;
  const citations = [];

  let headerEl = $('*:contains("Publication List")')
    .filter(function () {
      return eq($(this).text()) === 'publication list';
    })
    .first();

  let pubTable = $();
  if (headerEl.length) {
    pubTable = headerEl.nextAll('table').first();
    if (!pubTable.length) pubTable = headerEl.parent().nextAll('table').first();
    if (!pubTable.length) pubTable = headerEl.closest('tr,td,th,div').nextAll('table').first();
  }
  if (!pubTable.length && headerEl.length) {
    const allAfter = headerEl.nextAll().add(headerEl.parent().nextAll());
    pubTable = allAfter.filter('table').first();
  }

  const extractYear = (txt) => {
    const matches = txt.match(/(19|20)\d{2}/g);
    if (!matches || !matches.length) return null;
    return parseInt(matches[matches.length - 1], 10);
  };

  if (pubTable && pubTable.length) {
    const trs = pubTable.find('tr').toArray();
    const candidates = [];
    for (const tr of trs) {
      const $tr = $(tr);
      const text = norm($tr.text());
      if (!text) continue;
      if (text.length >= 40 && /[,.;)]/.test(text)) {
        candidates.push({ $tr, text, year: extractYear(text) });
      }
    }

    let chosen = null;
    const withYear = candidates.filter((c) => Number.isFinite(c.year));
    if (withYear.length) {
      withYear.sort((a, b) => b.year - a.year);
      chosen = withYear[0];
    } else if (candidates.length) {
      chosen = candidates[0];
    }

    if (chosen) {
      const $row = chosen.$tr;

      $row.find('a').each((_, a) => {
        const $a = $(a);
        const t = norm($a.text());
        const href = $a.attr('href') || '';
        if (/^\[[^\]]+\]$/.test(t)) {
          citations.push({ label: t.replace(/^\[|\]$/g, ''), url: href || null });
          return;
        }
        if (/pubmed/i.test(href)) {
          citations.push({ label: 'pubmed', url: href });
          return;
        }
        if (/doi\.org/i.test(href)) {
          citations.push({ label: 'doi', url: href });
        }
      });

      firstPublicationRow = norm(
        $row.clone().find('a').remove().end().text().replace(/\[[^\]]+\]/g, '')
      );
    }
  }

  const result = {
    id: datasetId,
    title,
    firstPublicationRow,
    citations,
    sourceUrl: url,
  };
  cacheSet(datasetId, result);
  return result;
}

async function fetchSummariesBatched(ids, batchSize = 4) {
  const out = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          return await scrapeProteomeCentral(id);
        } catch (err) {
          console.warn('Scrape failed for', id, err.message);
          return {
            id,
            title: null,
            firstPublicationRow: null,
            citations: [],
            sourceUrl: `https://proteomecentral.proteomexchange.org/cgi/GetDataset?ID=${id}`,
          };
        }
      })
    );
    out.push(...results);
  }
  return out;
}

module.exports = { fetchSummariesBatched };
