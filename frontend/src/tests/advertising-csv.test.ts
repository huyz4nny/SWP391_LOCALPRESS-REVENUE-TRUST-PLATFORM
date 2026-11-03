import { describe, expect, it } from 'vitest'
import { toCsv } from '../features/advertising/lib/csv'
describe('advertiser CSV', () => {
  it('preserves Vietnamese, quotes, commas and line breaks', () => {
    expect(toCsv([{ a: 'x,y', b: 'say "hi"' }], [['a', 'A'], ['b', 'B']]))
      .toBe('\uFEFFA,B\r\n"x,y","say ""hi"""')
    expect(toCsv([{ a: 'Hải Phòng\nCảng biển' }], [['a', 'Tên']])).toContain('"Hải Phòng\nCảng biển"')
  })
  it('prevents spreadsheet formula injection but keeps numeric values', () => {
    expect(toCsv([{ a: '=SUM(1)', b: -2 }], [['a', 'Tên'], ['b', 'Giá trị']])).toContain("'=SUM(1),-2")
  })
})
