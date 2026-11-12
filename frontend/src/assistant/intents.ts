/**
 * What a guardian can ask the assistant about, and the words that give each topic away.
 * Keywords are lower-case. Bangla ones match anywhere in the question ("আবেদন কর" also
 * matches "আবেদন করব"); Latin ones, English or Banglish, must be whole words, so "hi"
 * does not match "which". To teach the assistant a new topic, add an intent here and its
 * answer in replies.ts.
 */
export const INTENTS = [
  { id: 'greet', keywords: ['হ্যালো', 'হাই', 'সালাম', 'আসসালামু', 'নমস্কার', 'hello', 'hi', 'hey', 'salam', 'assalamu alaikum'] },
  { id: 'thanks', keywords: ['ধন্যবাদ', 'thanks', 'thank you', 'dhonnobad', 'dhonnobaad'] },
  { id: 'help', keywords: ['সাহায্য', 'সহায়তা', 'কী করতে পারি', 'কিভাবে কাজ', 'কীভাবে কাজ', 'help', 'guide', 'how does it work', 'what can you do', 'shahajjo'] },
  { id: 'apply', keywords: ['আবেদন কর', 'কিভাবে আবেদন', 'কীভাবে আবেদন', 'ভর্তি হব', 'ভর্তি করাব', 'আসন নিত', 'apply', 'how to apply', 'admission process', 'abedon', 'vorti', 'bhorti'] },
  { id: 'studentId', keywords: ['জন্ম নিবন্ধন', 'নিবন্ধন নম্বর', '১৭ অঙ্ক', '17 অঙ্ক', 'birth registration', 'registration number', 'student id', 'birth certificate', 'nibondhon'] },
  { id: 'pay', keywords: ['ফি', 'টাকা', 'পেমেন্ট', 'পরিশোধ', 'জমা দেব', 'জমা দিব', 'pay', 'payment', 'fee', 'fees', 'money', 'taka', 'bkash'] },
  { id: 'expiry', keywords: ['সময় শেষ', 'মেয়াদ', 'কতক্ষণ', 'কত মিনিট', 'কত সময়', 'expire', 'expires', 'expired', 'expiry', 'deadline', 'how long', 'time limit', 'timer', 'somoy'] },
  { id: 'cancel', keywords: ['বাতিল', 'তুলে নিত', 'cancel', 'withdraw', 'refund', 'batil'] },
  { id: 'status', keywords: ['অবস্থা', 'আমার আবেদন', 'স্ট্যাটাস', 'কী হলো', 'status', 'my application', 'my applications', 'check application', 'obostha'] },
  { id: 'seats', keywords: ['খালি', 'আসন আছে', 'কোন শ্রেণি', 'কয়টি আসন', 'কতটি আসন', 'সিট', 'seat', 'seats', 'available', 'vacancy', 'vacant', 'which class', 'khali'] },
  { id: 'statuses', keywords: ['মানে কী', 'অর্থ কী', 'মানে কি', 'সংরক্ষিত মানে', 'meaning', 'what does', 'mean'] },
  { id: 'shifts', keywords: ['শিফট', 'প্রভাতী', 'দিবা', 'ক্লাসের সময়', 'shift', 'shifts', 'morning', 'class time', 'school time'] },
  { id: 'admin', keywords: ['শ্রেণি তৈরি', 'নতুন শ্রেণি', 'অ্যাডমিন', 'প্রশাসক', 'ব্যবস্থাপনা', 'admin', 'create class', 'add class', 'new class', 'administrator'] },
  { id: 'noLogin', keywords: ['লগইন', 'পাসওয়ার্ড', 'অ্যাকাউন্ট', 'login', 'log in', 'password', 'account', 'sign in', 'sign up'] },
  { id: 'language', keywords: ['ইংরেজি', 'ভাষা', 'english', 'language', 'bangla'] },
] as const

export type IntentId = (typeof INTENTS)[number]['id']

const BANGLA_ZERO = '০'.charCodeAt(0)

/** Lower case, ASCII digits, no punctuation, single spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - BANGLA_ZERO))
    .replace(/[?!।,.:;"'“”‘’()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const isLatin = (keyword: string) => /^[a-z0-9 ]+$/.test(keyword)

/**
 * The topic a question is most likely about, or null. Each keyword found adds its length,
 * so a specific phrase ("সময় শেষ") outweighs a word that turns up everywhere.
 */
export function matchIntent(question: string): IntentId | null {
  const text = normalize(question)
  const words = ` ${text} `
  let best: IntentId | null = null
  let bestScore = 0

  for (const intent of INTENTS) {
    let score = 0
    for (const keyword of intent.keywords) {
      const found = isLatin(keyword) ? words.includes(` ${keyword} `) : text.includes(normalize(keyword))
      if (found) score += keyword.length
    }
    if (score > bestScore) {
      best = intent.id
      bestScore = score
    }
  }

  return best
}
