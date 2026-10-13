import { z } from 'zod'

export const companyProfileSchema = z.object({
  companyName: z.string().trim().min(1, 'Vui lòng nhập tên doanh nghiệp').max(255, 'Tên doanh nghiệp tối đa 255 ký tự'),
  taxCode: z.string().trim().min(1, 'Vui lòng nhập mã số thuế').max(50, 'Mã số thuế tối đa 50 ký tự'),
  businessSector: z.string().trim().min(1, 'Vui lòng nhập lĩnh vực kinh doanh').max(150, 'Lĩnh vực kinh doanh tối đa 150 ký tự'),
  contactPerson: z.string().trim().min(1, 'Vui lòng nhập người liên hệ').max(150, 'Người liên hệ tối đa 150 ký tự'),
  email: z.string().trim().min(1, 'Vui lòng nhập email liên hệ').max(255, 'Email tối đa 255 ký tự').email('Email liên hệ không hợp lệ'),
  phone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại')
    .regex(/^0[35789][0-9]{8}$/, 'Số di động Việt Nam phải có 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09'),
  address: z.string().trim().max(500, 'Địa chỉ tối đa 500 ký tự'),
  businessLicenseUrl: z.string().trim().max(1000, 'Liên kết tối đa 1.000 ký tự')
    .refine((value) => !value || /^https?:\/\//.test(value), 'Liên kết giấy phép phải bắt đầu bằng http:// hoặc https://')
    .refine((value) => !value || URL.canParse(value), 'Liên kết giấy phép không hợp lệ'),
  invoiceName: z.string().trim().min(1, 'Vui lòng nhập tên xuất hóa đơn').max(255, 'Tên xuất hóa đơn tối đa 255 ký tự'),
  invoiceTaxCode: z.string().trim().min(1, 'Vui lòng nhập mã số thuế xuất hóa đơn').max(50, 'Mã số thuế tối đa 50 ký tự'),
  invoiceAddress: z.string().trim().min(1, 'Vui lòng nhập địa chỉ xuất hóa đơn').max(500, 'Địa chỉ hóa đơn tối đa 500 ký tự'),
  invoiceEmail: z.string().trim().min(1, 'Vui lòng nhập email nhận hóa đơn').max(255, 'Email tối đa 255 ký tự').email('Email nhận hóa đơn không hợp lệ'),
})
