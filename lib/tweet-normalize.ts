export function normalizeTweetText(raw: string): string {
  let text = raw;
  text = text.replace(/https?:\/\/\S+/g, '');           // remove URLs
  text = text.replace(/([.:]) {2,}([A-Z])/g, '$1 $2'); // collapse 2+ spaces → 1
  text = text.replace(/([.:])([A-Z])/g, '$1 $2');       // insert missing space
  text = text.replace(/ {2,}/g, ' ');                    // collapse leftover double spaces
  text = text.trim();
  return text;
}
