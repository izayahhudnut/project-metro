#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const RSS_URL = 'https://www.ksdk.com/feeds/syndication/rss/news';
const OUT_PATH = path.resolve('app/data/stl-news.json');

const iconFor = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('shoot') || t.includes('killed') || t.includes('homicide') || t.includes('crime')) return 'Siren';
  if (t.includes('blues') || t.includes('cardinals') || t.includes('sports')) return 'HeartPulse';
  if (t.includes('attorney') || t.includes('court') || t.includes('lawsuit') || t.includes('ag')) return 'Gavel';
  return 'Newspaper';
};

const leadFor = (icon) => {
  switch (icon) {
    case 'Siren': return 'Breaking';
    case 'HeartPulse': return 'Sports desk';
    case 'Gavel': return 'Capitol watch';
    default: return 'KSDK watch';
  }
};

const shorten = (title = '') => {
  if (title.length <= 90) return title;
  return title.slice(0, 87).trim() + '…';
};

const parseTitles = (xml) => {
  const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)]
    .map((m) => m[1]?.replace(/<!\[CDATA\[(.*)\]\]>/, '$1').trim())
    .filter(Boolean);
  return items;
};

const build = (titles) => titles.slice(0, 6).map((title) => {
  const icon = iconFor(title);
  const lead = leadFor(icon);
  return {
    icon,
    text: `${lead}: ${shorten(title)}`,
  };
});

const main = async () => {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();
  const titles = parseTitles(xml);
  const payload = build(titles);
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${payload.length} stories to ${OUT_PATH}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
