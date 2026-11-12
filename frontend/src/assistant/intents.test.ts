import { describe, expect, it } from 'vitest'
import { matchIntent, normalize } from './intents'

describe('matchIntent', () => {
  it.each([
    ['কীভাবে আবেদন করব?', 'apply'],
    ['আবেদন বাতিল করব কীভাবে?', 'cancel'],
    ['আমার আবেদনের অবস্থা কী?', 'status'],
    ['কোন শ্রেণিতে আসন খালি আছে?', 'seats'],
    ['সময় শেষ হলে কী হয়?', 'expiry'],
    ['ভর্তি ফি কত টাকা?', 'pay'],
    ['জন্ম নিবন্ধন নম্বর কোথায় দেব?', 'studentId'],
    ['প্রভাতী শিফটের সময় কখন?', 'shifts'],
  ])('understands Bangla: %s', (question, topic) => {
    expect(matchIntent(question)).toBe(topic)
  })

  it.each([
    ['How do I apply?', 'apply'],
    ['Which classes have seats available?', 'seats'],
    ['What is my application status', 'status'],
    ['how long until it expires', 'expiry'],
    ['Do I need a password?', 'noLogin'],
    ['How do I create a new class as admin?', 'admin'],
  ])('understands English: %s', (question, topic) => {
    expect(matchIntent(question)).toBe(topic)
  })

  it('understands Banglish', () => {
    expect(matchIntent('abedon kivabe korbo')).toBe('apply')
    expect(matchIntent('fee koto taka')).toBe('pay')
  })

  it('matches short English words only as whole words', () => {
    expect(matchIntent('hi')).toBe('greet')
    expect(matchIntent('which')).toBeNull()
  })

  it('returns null when it cannot tell', () => {
    expect(matchIntent('the weather is nice today')).toBeNull()
  })
})

describe('normalize', () => {
  it('lower-cases, drops punctuation and reads Bangla digits', () => {
    expect(normalize('  Class ৬, Morning?  ')).toBe('class 6 morning')
  })
})
