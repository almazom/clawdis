/**
 * AI Report Data Processing Module
 * Layer 2: Data Processing - extracts topics and stats from cached messages
 */

export interface CacheMeta {
  channel: string;
  cached_at: string;
  total_messages: number;
  limit_requested: number;
  offset_id: number;
  fetch_strategy: string;
  range_label: string;
}

export interface CachedMessage {
  id: number;
  date_utc: string;
  date_msk: string;
  text: string;
  sender: string;
  views: number | null;
  forwards: number | null;
  reply_to_id: number | null;
}

export interface CacheData {
  meta: CacheMeta;
  messages: CachedMessage[];
}

export interface TopicStat {
  tag: string;
  count: number;
  examples: string[];
}

export interface SenderStat {
  name: string;
  message_count: number;
  last_active: string;
}

export interface ReportStats {
  total_messages: number;
  unique_senders: number;
  topics: TopicStat[];
  top_topics: string[];
  top_senders: SenderStat[];
  date_range: {
    earliest: string;
    latest: string;
  };
}

export function parseCache(data: CacheData): ReportStats {
  const messages = data.messages;

  // Topic extraction
  const topicMap = new Map<string, { count: number; examples: string[] }>();
  const senderMap = new Map<string, { count: number; last_date: string }>();
  const dates: string[] = [];

  for (const msg of messages) {
    // Extract hashtags
    const tags = (msg.text || '').toLowerCase().match(/#\w+/g) || [];
    for (const tag of tags) {
      const existing = topicMap.get(tag) || { count: 0, examples: [] };
      existing.count++;
      if (existing.examples.length < 3 && msg.text) {
        existing.examples.push(msg.text.slice(0, 150));
      }
      topicMap.set(tag, existing);
    }

    // Track senders (exclude Unknown)
    if (msg.sender && msg.sender !== 'Unknown') {
      const existing = senderMap.get(msg.sender) || { count: 0, last_date: msg.date_msk };
      existing.count++;
      existing.last_date = msg.date_msk;
      senderMap.set(msg.sender, existing);
    }

    // Track dates
    if (msg.date_msk) {
      dates.push(msg.date_msk);
    }
  }

  // Sort topics by count
  const topics: TopicStat[] = Array.from(topicMap.entries())
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      examples: data.examples
    }))
    .sort((a, b) => b.count - a.count);

  // Sort senders by activity
  const top_senders: SenderStat[] = Array.from(senderMap.entries())
    .map(([name, data]) => ({
      name,
      message_count: data.count,
      last_active: data.last_date
    }))
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, 10);

  return {
    total_messages: messages.length,
    unique_senders: senderMap.size,
    topics,
    top_topics: topics.slice(0, 5).map(t => t.tag),
    top_senders,
    date_range: {
      earliest: dates.sort()[0] || '',
      latest: dates.sort().reverse()[0] || ''
    }
  };
}

export function filterByPeriod(data: CacheData, period: 'today' | 'week'): CacheData {
  const now = new Date();
  const cutoff = period === 'today'
    ? new Date(now.setHours(0, 0, 0, 0))
    : new Date(now.setDate(now.getDate() - 7));

  const filtered = data.messages.filter(msg => {
    const msgDate = new Date(msg.date_utc);
    return msgDate >= cutoff;
  });

  return {
    ...data,
    messages: filtered
  };
}
