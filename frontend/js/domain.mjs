export const money = value => value == null ? 'Not specified' : new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(value);
export const lawKey = row => `${row.jurisdiction_id}:${row.violation_id}:${row.vehicle_class_id ?? 'any'}`;
export function filterLaws(rows, {jurisdiction = '', category = '', search = '', saved = false, bookmarks = []} = {}) {
  const query = search.trim().toLowerCase();
  return rows.filter(row => (!jurisdiction || row.jurisdiction_id === Number(jurisdiction))
    && (!category || row.category_id === Number(category))
    && (!saved || bookmarks.includes(lawKey(row)))
    && (!query || `${row.violation_name} ${row.section_reference} ${row.description || ''} ${row.category_name}`.toLowerCase().includes(query)));
}
export function calculateFine(rows, {jurisdiction, violation, vehicle, repeat = false}) {
  const matches = rows.filter(r => r.jurisdiction_id === Number(jurisdiction) && r.violation_id === Number(violation));
  const row = (vehicle ? matches.find(r => r.vehicle_class_id === Number(vehicle)) : null)
    || matches.find(r => r.vehicle_class_id == null);
  if (!row) return null;
  return {...row, fine_amount: repeat ? row.subsequent_offence_fine : row.first_offence_fine, repeat};
}
export function rankLaws(message, rows) {
  const ignored = new Set('what the for fine fines is a in of and my how much without driving riding are can i to me tell with under penalty'.split(' '));
  const tokens = new Set((message.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => !ignored.has(t)));
  for (const [canonical, aliases] of Object.entries({helmet:['headgear'], speed:['speeding','overspeed','fast'], license:['licence'], drunk:['alcohol','drink'], seat:['seatbelt','belt'], phone:['mobile'], insurance:['uninsured'], pollution:['puc']})) {
    if (aliases.some(t => tokens.has(t))) tokens.add(canonical);
  }
  const ranked = rows.map(row => ({row, score: [...tokens].filter(t => `${row.violation_name} ${row.description || ''} ${row.section_reference}`.toLowerCase().includes(t)).length})).filter(x => x.score).sort((a,b) => b.score-a.score);
  return ranked.filter(x => x.score === ranked[0]?.score).slice(0,5).map(x => x.row);
}
export function validateSnapshot(data) {
  return data && ['laws','jurisdictions','violations','vehicles','categories'].every(key => Array.isArray(data[key]))
    && data.laws.length > 0 && data.laws.every(row => ['id','violation_id','jurisdiction_id','category_id'].every(key => Number.isInteger(row[key])));
}
