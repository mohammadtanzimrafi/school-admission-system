import type { Locale } from '../i18n/messages'
import type { IntentId } from './intents'

/** What the assistant knows about this guardian right now, already worded for display. */
export interface AssistantContext {
  /** The saved birth registration number, in local digits, or null. */
  studentId: string | null
  /** "১০ মিনিট": how long a seat stays held. */
  holdLength: string
  /** The unpaid application closest to running out, if any. */
  pending: { holdId: string; className: string; timeLeft: string } | null
  /** Classes this student is admitted to. */
  admitted: string[]
  applicationCount: number
  /** The same count in local digits. */
  applicationCountLabel: string
  /** Classes with free seats, most seats first; null until the list has loaded. */
  openClasses: { name: string; available: string }[] | null
}

/** A button under an answer: go to a page, or do something on this one. */
export type AssistantAction = { label: string; to: string } | { label: string; run: 'askStudentId' | 'toggleLanguage' }

export interface Reply {
  text: string
  actions?: AssistantAction[]
  /** Offer the suggested questions again under this answer. */
  suggest?: boolean
}

type Topic = IntentId | 'fallback'
type Copy = Record<Topic, (context: AssistantContext) => Reply>

const MAX_LISTED_CLASSES = 5

const bn: Copy = {
  greet: () => ({
    text: 'আসসালামু আলাইকুম! আমি অ্যাডমিটলি সহায়ক। ভর্তির যেকোনো ধাপ নিয়ে জিজ্ঞেস করুন, অথবা নিচের প্রশ্নগুলো থেকে বেছে নিন।',
    suggest: true,
  }),
  thanks: () => ({ text: 'আপনাকেও ধন্যবাদ! আর কিছু জানতে চাইলে জিজ্ঞেস করুন।' }),
  help: ({ holdLength }) => ({
    text: `ভর্তি চার ধাপে:\n১. উপরে শিক্ষার্থীর জন্ম নিবন্ধন নম্বর দিন।\n২. «শ্রেণি খুঁজুন» থেকে শ্রেণিতে আবেদন করুন।\n৩. আসন ${holdLength} সংরক্ষিত থাকবে।\n৪. এর মধ্যে ভর্তি ফি দিলেই ভর্তি নিশ্চিত।`,
    actions: [{ label: 'শ্রেণি খুঁজুন', to: '/' }],
    suggest: true,
  }),
  apply: ({ studentId, holdLength }) => ({
    text: `আবেদন করতে:\n১. ${studentId ? 'জন্ম নিবন্ধন নম্বর দেওয়া আছে।' : 'উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।'}\n২. «শ্রেণি খুঁজুন» পাতায় পছন্দের শ্রেণির «আবেদন করুন» চাপুন।\n৩. আসনটি ${holdLength} আপনার জন্য সংরক্ষিত থাকবে; এর মধ্যে ভর্তি ফি দিন।`,
    actions: studentId ? [{ label: 'শ্রেণি খুঁজুন', to: '/' }] : [{ label: 'নম্বর লিখুন', run: 'askStudentId' }, { label: 'শ্রেণি খুঁজুন', to: '/' }],
  }),
  studentId: ({ studentId }) =>
    studentId
      ? { text: `এখন এই নম্বরটি দেওয়া আছে: ${studentId}। অন্য শিক্ষার্থীর জন্য উপরের ঘরে «পরিবর্তন» চাপুন।` }
      : {
          text: 'উপরের ঘরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখে «সংরক্ষণ» চাপুন। বাংলা বা ইংরেজি, যেকোনো অঙ্কে লেখা যায়। এই নম্বরই শিক্ষার্থীর পরিচয়, লগইন লাগবে না।',
          actions: [{ label: 'নম্বর লিখুন', run: 'askStudentId' }],
        },
  pay: ({ pending }) =>
    pending
      ? {
          text: `${pending.className}-এর আসন আর ${pending.timeLeft} সংরক্ষিত আছে। এখনই ফি দিলে ভর্তি নিশ্চিত হবে। এটি নমুনা পেমেন্ট, কোনো টাকা কাটা হয় না।`,
          actions: [{ label: 'ভর্তি ফি দিন', to: `/applications/${pending.holdId}/pay` }],
        }
      : {
          text: 'আসন সংরক্ষণের পর «আমার আবেদন» পাতায় «ভর্তি ফি জমা দিন» চাপুন, তারপর «নমুনা পেমেন্ট সম্পন্ন করুন»। এটি নমুনা পেমেন্ট, কোনো টাকা কাটা হয় না।',
          actions: [{ label: 'আমার আবেদন', to: '/applications' }],
        },
  expiry: ({ holdLength, pending }) => ({
    text:
      `আবেদন করলে আসনটি ${holdLength} আপনার জন্য সংরক্ষিত থাকে। এর মধ্যে ফি না দিলে মেয়াদ শেষ হয়, আর আসনটি নিজে থেকেই অন্যদের জন্য খুলে যায়। আসন খালি থাকলে আবার আবেদন করা যায়।` +
      (pending ? `\n\nআপনার ${pending.className}-এর আসনে আর ${pending.timeLeft} সময় আছে।` : ''),
    actions: pending ? [{ label: 'ভর্তি ফি দিন', to: `/applications/${pending.holdId}/pay` }] : undefined,
  }),
  cancel: ({ pending }) =>
    pending
      ? {
          text: `ফি দেওয়ার আগে পর্যন্ত আবেদন বাতিল করা যায়। বাতিল করলে আসনটি সঙ্গে সঙ্গে অন্যদের জন্য খুলে যাবে। ${pending.className}-এর আবেদন বাতিল করতে:`,
          actions: [{ label: 'আবেদন বাতিল', to: `/applications/${pending.holdId}/cancel` }],
        }
      : {
          text: 'ফি দেওয়ার আগে পর্যন্ত আবেদন বাতিল করা যায়: «আমার আবেদন» পাতায় «আবেদন বাতিল» চাপুন। ভর্তি নিশ্চিত হয়ে গেলে আর বাতিল করা যায় না।',
          actions: [{ label: 'আমার আবেদন', to: '/applications' }],
        },
  status: ({ studentId, pending, admitted, applicationCount, applicationCountLabel }) => {
    if (!studentId) {
      return { text: 'আবেদনের অবস্থা দেখতে আগে উপরে শিক্ষার্থীর জন্ম নিবন্ধন নম্বর দিন।', actions: [{ label: 'নম্বর লিখুন', run: 'askStudentId' }] }
    }
    if (applicationCount === 0) {
      return { text: 'এই নম্বরে এখনো কোনো আবেদন নেই।', actions: [{ label: 'শ্রেণি খুঁজুন', to: '/' }] }
    }
    const lines = [
      ...(pending ? [`◷ ${pending.className}: আসন সংরক্ষিত, ফি বাকি (${pending.timeLeft} সময় আছে)`] : []),
      ...admitted.map((name) => `✓ ${name}: ভর্তি নিশ্চিত`),
    ]
    return {
      text: `${lines.length ? `${lines.join('\n')}\n\n` : ''}মোট ${applicationCountLabel}টি আবেদন। পুরো তালিকা «আমার আবেদন» পাতায়।`,
      actions: [
        ...(pending ? [{ label: 'ভর্তি ফি দিন', to: `/applications/${pending.holdId}/pay` }] : []),
        { label: 'আমার আবেদন', to: '/applications' },
      ],
    }
  },
  seats: ({ openClasses }) => {
    if (openClasses === null) return { text: 'শ্রেণির তালিকা আনা হচ্ছে, একটু পরে আবার জিজ্ঞেস করুন।', actions: [{ label: 'শ্রেণি খুঁজুন', to: '/' }] }
    if (openClasses.length === 0) return { text: 'এই মুহূর্তে কোনো শ্রেণিতে আসন খালি নেই। কারও মেয়াদ শেষ হলে বা কেউ বাতিল করলে আসন খুলতে পারে।' }
    const listed = openClasses.slice(0, MAX_LISTED_CLASSES).map((c) => `• ${c.name}: ${c.available}টি খালি`)
    return { text: `এখন আসন খালি আছে:\n${listed.join('\n')}`, actions: [{ label: 'শ্রেণি খুঁজুন', to: '/' }] }
  },
  statuses: () => ({
    text: 'আবেদনের চার অবস্থা:\n• আসন সংরক্ষিত: আসন রাখা আছে, ফি বাকি\n• নিশ্চিত: ফি জমা হয়েছে, ভর্তি সম্পন্ন\n• মেয়াদ শেষ: সময়মতো ফি না দেওয়ায় আসন ছেড়ে দেওয়া হয়েছে\n• বাতিল: আবেদন তুলে নেওয়া হয়েছে',
  }),
  shifts: () => ({
    text: 'প্রতিটি শিফট আলাদা শ্রেণি, আসনও আলাদা।\n• প্রভাতী শিফট: সকাল ৭:৩০ – দুপুর ১২:০০\n• দিবা শিফট: দুপুর ১২:৩০ – বিকাল ৫:০০\n«শ্রেণি খুঁজুন» পাতায় শিফট অনুযায়ী বাছাই করা যায়।',
    actions: [{ label: 'শ্রেণি খুঁজুন', to: '/' }],
  }),
  admin: () => ({
    text: 'স্কুল প্রশাসক «শ্রেণি ব্যবস্থাপনা» পাতা থেকে নতুন শ্রেণি খোলেন: নামের সঙ্গে শিফট লিখুন (যেমন «নবম শ্রেণি - প্রভাতী শিফট») আর মোট আসনসংখ্যা দিন। একই পাতায় সব শ্রেণির আসনের হিসাব দেখা যায়।',
    actions: [{ label: 'শ্রেণি ব্যবস্থাপনা', to: '/admin/classes' }],
  }),
  noLogin: () => ({
    text: 'লগইন বা পাসওয়ার্ড লাগবে না। শিক্ষার্থীর জন্ম নিবন্ধন নম্বরই পরিচয়। নম্বরটি এই ব্রাউজারে মনে রাখা হয়, তাই পাতা বন্ধ করে আবার খুললেও আবেদন দেখা যাবে।',
  }),
  language: () => ({ text: 'সাইডবারের নিচে «English» চাপলে পুরো সাইট ইংরেজিতে দেখাবে।', actions: [{ label: 'English', run: 'toggleLanguage' }] }),
  fallback: () => ({ text: 'দুঃখিত, প্রশ্নটি বুঝতে পারিনি। অন্যভাবে লিখে দেখুন, অথবা নিচের কোনো একটি বেছে নিন।', suggest: true }),
}

const en: Copy = {
  greet: () => ({
    text: "Hello! I'm the Admitly assistant. Ask me about any step of the admission, or pick a question below.",
    suggest: true,
  }),
  thanks: () => ({ text: "You're welcome! Ask again any time." }),
  help: ({ holdLength }) => ({
    text: `Admission takes four steps:\n1. Enter the student's birth registration number at the top.\n2. Apply to a class from "Find a class".\n3. The seat is held for ${holdLength}.\n4. Pay the fee in that time and the admission is confirmed.`,
    actions: [{ label: 'Find a class', to: '/' }],
    suggest: true,
  }),
  apply: ({ studentId, holdLength }) => ({
    text: `To apply:\n1. ${studentId ? 'The birth registration number is already entered.' : "Enter the student's 17-digit birth registration number at the top."}\n2. On "Find a class", press "Apply" on the class you want.\n3. The seat is held for you for ${holdLength}; pay the admission fee within that time.`,
    actions: studentId ? [{ label: 'Find a class', to: '/' }] : [{ label: 'Enter the number', run: 'askStudentId' }, { label: 'Find a class', to: '/' }],
  }),
  studentId: ({ studentId }) =>
    studentId
      ? { text: `This number is entered now: ${studentId}. For another student, press "Change" in the box at the top.` }
      : {
          text: "Type the student's 17-digit birth registration number in the box at the top and press \"Save\". Bangla or English digits both work. The number is the student's identity; no login is needed.",
          actions: [{ label: 'Enter the number', run: 'askStudentId' }],
        },
  pay: ({ pending }) =>
    pending
      ? {
          text: `Your seat in ${pending.className} is held for ${pending.timeLeft} more. Pay now to confirm the admission. The payment is simulated; no money is taken.`,
          actions: [{ label: 'Pay admission fee', to: `/applications/${pending.holdId}/pay` }],
        }
      : {
          text: 'Once a seat is held, press "Pay admission fee" on "My applications", then "Complete simulated payment". No money is taken.',
          actions: [{ label: 'My applications', to: '/applications' }],
        },
  expiry: ({ holdLength, pending }) => ({
    text:
      `When you apply, the seat is held for you for ${holdLength}. If the fee is not paid in that time the hold expires and the seat opens to others by itself. You can apply again while seats remain.` +
      (pending ? `\n\nYour seat in ${pending.className} has ${pending.timeLeft} left.` : ''),
    actions: pending ? [{ label: 'Pay admission fee', to: `/applications/${pending.holdId}/pay` }] : undefined,
  }),
  cancel: ({ pending }) =>
    pending
      ? {
          text: `An application can be cancelled until the fee is paid; the seat opens to others straight away. To cancel ${pending.className}:`,
          actions: [{ label: 'Cancel application', to: `/applications/${pending.holdId}/cancel` }],
        }
      : {
          text: 'An application can be cancelled until the fee is paid: press "Cancel application" on "My applications". A confirmed admission cannot be cancelled.',
          actions: [{ label: 'My applications', to: '/applications' }],
        },
  status: ({ studentId, pending, admitted, applicationCount, applicationCountLabel }) => {
    if (!studentId) {
      return { text: "Enter the student's birth registration number at the top to see the applications.", actions: [{ label: 'Enter the number', run: 'askStudentId' }] }
    }
    if (applicationCount === 0) {
      return { text: 'There are no applications under this number yet.', actions: [{ label: 'Find a class', to: '/' }] }
    }
    const lines = [
      ...(pending ? [`◷ ${pending.className}: seat held, fee due (${pending.timeLeft} left)`] : []),
      ...admitted.map((name) => `✓ ${name}: admission confirmed`),
    ]
    return {
      text: `${lines.length ? `${lines.join('\n')}\n\n` : ''}${applicationCountLabel} application(s) in total. The full list is on "My applications".`,
      actions: [
        ...(pending ? [{ label: 'Pay admission fee', to: `/applications/${pending.holdId}/pay` }] : []),
        { label: 'My applications', to: '/applications' },
      ],
    }
  },
  seats: ({ openClasses }) => {
    if (openClasses === null) return { text: 'The class list is still loading; ask again in a moment.', actions: [{ label: 'Find a class', to: '/' }] }
    if (openClasses.length === 0) return { text: 'No class has a free seat right now. Seats can open up when a hold expires or someone cancels.' }
    const listed = openClasses.slice(0, MAX_LISTED_CLASSES).map((c) => `• ${c.name}: ${c.available} free`)
    return { text: `Seats free right now:\n${listed.join('\n')}`, actions: [{ label: 'Find a class', to: '/' }] }
  },
  statuses: () => ({
    text: 'An application is always in one of four states:\n• Seat held: the seat is kept for you, fee due\n• Confirmed: fee paid, admission done\n• Expired: the fee was not paid in time, so the seat was released\n• Cancelled: the application was withdrawn',
  }),
  shifts: () => ({
    text: 'Each shift is its own class with its own seats.\n• Morning shift: 7:30 AM – 12:00 PM\n• Day shift: 12:30 PM – 5:00 PM\nYou can filter by shift on "Find a class".',
    actions: [{ label: 'Find a class', to: '/' }],
  }),
  admin: () => ({
    text: 'The school admin opens classes on "Class management": put the shift in the name (e.g. "Class 9 - Morning Shift") and give the total seats. The same page shows the seats of every class.',
    actions: [{ label: 'Class management', to: '/admin/classes' }],
  }),
  noLogin: () => ({
    text: "No login or password is needed. The student's birth registration number is the identity. It is remembered in this browser, so the applications are still there after closing the page.",
  }),
  language: () => ({ text: 'Press "বাংলা" at the bottom of the sidebar to switch the whole site to Bangla.', actions: [{ label: 'বাংলা', run: 'toggleLanguage' }] }),
  fallback: () => ({ text: "Sorry, I didn't understand that. Try other words, or pick one of these.", suggest: true }),
}

const copy: Record<Locale, Copy> = { bn, en }

export function buildReply(topic: IntentId | null, context: AssistantContext, locale: Locale): Reply {
  return copy[locale][topic ?? 'fallback'](context)
}

const NOTHING_KNOWN: AssistantContext = { studentId: null, holdLength: '', pending: null, admitted: [], applicationCount: 0, applicationCountLabel: '0', openClasses: null }

/** The opening message; it says the same to everyone, so it needs no live data. */
export function greeting(locale: Locale): Reply {
  return copy[locale].greet(NOTHING_KNOWN)
}

/** The questions offered as one-tap chips. */
export const SUGGESTIONS: Record<Locale, { topic: IntentId; text: string }[]> = {
  bn: [
    { topic: 'apply', text: 'কীভাবে আবেদন করব?' },
    { topic: 'status', text: 'আমার আবেদনের অবস্থা কী?' },
    { topic: 'seats', text: 'কোন শ্রেণিতে আসন খালি?' },
    { topic: 'pay', text: 'ভর্তি ফি কীভাবে দেব?' },
    { topic: 'expiry', text: 'সময় শেষ হলে কী হয়?' },
    { topic: 'cancel', text: 'আবেদন বাতিল করব কীভাবে?' },
  ],
  en: [
    { topic: 'apply', text: 'How do I apply?' },
    { topic: 'status', text: "What's my application status?" },
    { topic: 'seats', text: 'Which classes have free seats?' },
    { topic: 'pay', text: 'How do I pay the fee?' },
    { topic: 'expiry', text: 'What happens when time runs out?' },
    { topic: 'cancel', text: 'How do I cancel?' },
  ],
}
