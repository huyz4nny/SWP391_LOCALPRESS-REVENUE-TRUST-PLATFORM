import { describe, expect, it } from 'vitest'
import { companyProfileSchema } from '../features/advertising/schemas/companyProfile'

const profile = {
  companyName: 'Công ty A', taxCode: '0201234567', businessSector: 'Logistics',
  contactPerson: 'Nguyễn Văn A', email: 'contact@example.com', phone: '0901234567',
  address: '', businessLicenseUrl: '', invoiceName: 'Công ty A',
  invoiceTaxCode: '0201234567', invoiceAddress: 'Hải Phòng', invoiceEmail: 'billing@example.com',
}

describe('Company profile validation', () => {
  it('allows optional fields to be blank and trims submitted values', () => {
    expect(companyProfileSchema.parse({ ...profile, companyName: '  Công ty A  ' })).toEqual(profile)
    expect(companyProfileSchema.safeParse({ ...profile, businessLicenseUrl: 'https://example.com/license.pdf' }).success).toBe(true)
  })

  it('rejects blank required fields, invalid emails, unsafe URLs and overlong values', () => {
    for (const field of Object.keys(profile).filter((field) => !['address', 'businessLicenseUrl'].includes(field))) {
      const result = companyProfileSchema.safeParse({ ...profile, [field]: '   ' })
      expect(result.success, field).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toEqual([field])
    }
    for (const invalid of [
      { email: 'invalid' }, { invoiceEmail: 'invalid' },
      { phone: 'abcdefghij' }, { phone: '090123456' }, { phone: '09012345678' },
      { phone: '+84901234567' }, { phone: '0201234567' },
      { businessLicenseUrl: 'javascript:alert(1)' }, { businessLicenseUrl: 'https://' },
      { companyName: 'a'.repeat(256) }, { phone: '0'.repeat(21) },
    ]) {
      expect(companyProfileSchema.safeParse({ ...profile, ...invalid }).success).toBe(false)
    }
  })
})
