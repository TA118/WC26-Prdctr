export function gcalUrl(title: string, kickoff: string, venue: string): string {
  // kickoff is already UTC ISO — strip separators to get GCal format (e.g. "20260611T190000Z")
  const start = kickoff.replace(/[-:]/g, '');
  const endMs = new Date(kickoff).getTime() + 2 * 60 * 60 * 1000;
  const end = new Date(endMs).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${start}/${end}` +
    `&location=${encodeURIComponent(venue)}`
  );
}
