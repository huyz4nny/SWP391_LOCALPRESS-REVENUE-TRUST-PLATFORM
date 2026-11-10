import React, { useEffect, useState, useMemo } from 'react'
import {
  FileText,
  Crown,
  FilePlus,
  Edit3,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  Layers,
  Award,
  Clock,
  Eye,
} from 'lucide-react'
import { editorialApi } from '../api'
import type {
  EditorialContract,
  ContractAddendum,
  AdvertiserVip,
  UpdateContractRequest,
  CreateContractAddendumRequest,
  UpdateVipTierRequest,
} from '../types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

export const AdvertisingContractPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contracts' | 'vip'>('contracts')

  // Contracts data
  const [contracts, setContracts] = useState<EditorialContract[]>([])
  const [vipList, setVipList] = useState<AdvertiserVip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [editContractTarget, setEditContractTarget] = useState<EditorialContract | null>(null)
  const [contractRefInput, setContractRefInput] = useState('')
  const [contractUrlInput, setContractUrlInput] = useState('')
  const [editSigningDate, setEditSigningDate] = useState('')
  const [editContractValue, setEditContractValue] = useState<number | ''>('')
  const [isUpdatingContract, setIsUpdatingContract] = useState(false)

  // Create Contract modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCampaignId, setNewCampaignId] = useState<number | ''>('')
  const [newContractNumber, setNewContractNumber] = useState('')
  const [newSigningDate, setNewSigningDate] = useState(new Date().toISOString().slice(0, 10))
  const [newContractValue, setNewContractValue] = useState<number | ''>('')
  const [newContractUrl, setNewContractUrl] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [isCreatingContract, setIsCreatingContract] = useState(false)

  const [addendumTarget, setAddendumTarget] = useState<EditorialContract | null>(null)
  const [addendumNumber, setAddendumNumber] = useState('')
  const [addendumDate, setAddendumDate] = useState(new Date().toISOString().slice(0, 10))
  const [addendumType, setAddendumType] = useState('Điều chỉnh lịch phát sóng')
  const [addendumNotes, setAddendumNotes] = useState('')
  const [isCreatingAddendum, setIsCreatingAddendum] = useState(false)

  const [viewAddendumsTarget, setViewAddendumsTarget] = useState<EditorialContract | null>(null)

  const [vipTarget, setVipTarget] = useState<AdvertiserVip | null>(null)
  const [vipTierSelect, setVipTierSelect] = useState<'STANDARD' | 'SILVER' | 'GOLD' | 'DIAMOND'>('STANDARD')
  const [vipDiscountInput, setVipDiscountInput] = useState(0)
  const [vipNotes, setVipNotes] = useState('')
  const [isUpdatingVip, setIsUpdatingVip] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [cData, vData] = await Promise.all([
        editorialApi.getContracts(),
        editorialApi.getVipAdvertisers(),
      ])
      setContracts(cData)
      setVipList(vData)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu hợp đồng & phân hạng VIP')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handle Contract Update
  const handleUpdateContract = async () => {
    if (!editContractTarget || !contractRefInput.trim()) return
    try {
      setIsUpdatingContract(true)
      setError(null)
      await editorialApi.updateContract(
        editContractTarget.campaignId,
        contractRefInput.trim(),
        contractUrlInput.trim() || undefined,
        editSigningDate || undefined,
        editContractValue ? Number(editContractValue) : undefined
      )
      setSuccessMsg(`Cập nhật hợp đồng #${contractRefInput.trim()} thành công!`)
      setEditContractTarget(null)
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật hợp đồng')
    } finally {
      setIsUpdatingContract(false)
    }
  }

  // Handle Contract Create
  const handleCreateContract = async () => {
    if (!newCampaignId || !newContractNumber.trim() || !newSigningDate || !newContractValue) {
      setError('Vui lòng điền đầy đủ: Chiến dịch, Số hiệu hợp đồng, Ngày ký và Giá trị hợp đồng')
      return
    }
    try {
      setIsCreatingContract(true)
      setError(null)
      await editorialApi.createContract({
        campaignId: Number(newCampaignId),
        contractNumber: newContractNumber.trim(),
        signingDate: newSigningDate,
        contractValue: Number(newContractValue),
        contractFileUrl: newContractUrl.trim() || undefined,
        notes: newNotes.trim() || undefined,
      })
      setSuccessMsg(`Tạo mới hợp đồng #${newContractNumber.trim()} thành công!`)
      setIsCreateModalOpen(false)
      setNewCampaignId('')
      setNewContractNumber('')
      setNewContractValue('')
      setNewContractUrl('')
      setNewNotes('')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo hợp đồng mới')
    } finally {
      setIsCreatingContract(false)
    }
  }

  // Handle Addendum Create
  const handleCreateAddendum = async () => {
    if (!addendumTarget || !addendumNumber.trim() || !addendumDate) return
    try {
      setIsCreatingAddendum(true)
      setError(null)
      await editorialApi.createContractAddendum(addendumTarget.campaignId, {
        addendumNumber: addendumNumber.trim(),
        effectiveDate: addendumDate,
        adjustmentType: addendumType,
        notes: addendumNotes.trim() || undefined,
      })
      setSuccessMsg(`Tạo phụ lục hợp đồng ${addendumNumber.trim()} thành công!`)
      setAddendumTarget(null)
      setAddendumNumber('')
      setAddendumNotes('')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo phụ lục hợp đồng')
    } finally {
      setIsCreatingAddendum(false)
    }
  }

  // Handle VIP Tier Update
  const handleUpdateVip = async () => {
    if (!vipTarget) return
    try {
      setIsUpdatingVip(true)
      setError(null)
      await editorialApi.updateVipTier(vipTarget.advertiserId, {
        vipTier: vipTierSelect,
        vipDiscountPercent: vipDiscountInput,
        notes: vipNotes.trim() || undefined,
      })
      setSuccessMsg(`Đã cập nhật phân hạng VIP cho "${vipTarget.companyName}" sang cấp ${vipTierSelect}!`)
      setVipTarget(null)
      setVipNotes('')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật phân hạng VIP')
    } finally {
      setIsUpdatingVip(false)
    }
  }

  // Filtered lists
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = searchQuery.toLowerCase()
      return (
        c.campaignName.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        (c.contractReference && c.contractReference.toLowerCase().includes(q)) ||
        c.slotCode.toLowerCase().includes(q)
      )
    })
  }, [contracts, searchQuery])

  const filteredVip = useMemo(() => {
    return vipList.filter((v) => {
      const q = searchQuery.toLowerCase()
      return (
        v.companyName.toLowerCase().includes(q) ||
        v.taxCode.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q)
      )
    })
  }, [vipList, searchQuery])

  // Get VIP Badge style
  const renderVipBadge = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'DIAMOND':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800">
            <Crown className="h-3.5 w-3.5 text-cyan-600" /> KIM CƯƠNG (15%)
          </span>
        )
      case 'GOLD':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            <Crown className="h-3.5 w-3.5 text-amber-600" /> VÀNG (10%)
          </span>
        )
      case 'SILVER':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
            <Award className="h-3.5 w-3.5 text-slate-600" /> BẠC (5%)
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            TIÊU CHUẨN (0%)
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800">
              Màn II.2.9 • UC019, UC025
            </span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Hợp đồng & Phân cấp VIP
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Quản Lý Hợp Đồng Quảng Cáo & Phân Hạng Đối Tác B2B
          </h1>
          <p className="text-sm text-slate-500">
            Lưu trữ mã số hợp đồng pháp lý, số hóa file PDF, quản lý phụ lục thay đổi và thiết lập chiết khấu VIP
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsCreateModalOpen(true)
              if (contracts.length > 0) {
                const target = contracts.find((c) => !c.contractNumber && !c.contractReference) || contracts[0]
                setNewCampaignId(target.campaignId)
                setNewContractValue(target.contractValue || '')
                setNewContractNumber(`HD-2026-DV-00${target.campaignId}`)
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 transition-colors"
          >
            <FilePlus className="h-4 w-4" />
            Tạo hợp đồng mới
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold">Lỗi thao tác</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="flex-1 font-medium">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'contracts'
                ? 'border-primary-600 text-primary-900'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            Hồ sơ Hợp đồng Quảng cáo ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'vip'
                ? 'border-amber-500 text-amber-900'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Crown className="h-4 w-4 text-amber-600" />
            Phân hạng Khách hàng VIP B2B ({vipList.length})
          </button>
        </nav>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={
            activeTab === 'contracts'
              ? 'Tìm kiếm theo tên chiến dịch, khách hàng, số hợp đồng, vị trí...'
              : 'Tìm kiếm đối tác VIP theo tên công ty, mã số thuế, người liên hệ...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Tab 1: Contracts Table */}
      {activeTab === 'contracts' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Số hợp đồng & File</th>
                  <th className="px-4 py-3">Chiến dịch & Doanh nghiệp</th>
                  <th className="px-4 py-3">Ngày ký</th>
                  <th className="px-4 py-3">Vị trí & Thời gian</th>
                  <th className="px-4 py-3">Giá trị hợp đồng</th>
                  <th className="px-4 py-3 text-center">Phụ lục</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary-600" />
                      <p className="mt-2 text-sm">Đang tải hồ sơ hợp đồng quảng cáo...</p>
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FileText className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-base font-medium text-slate-700">Chưa có hợp đồng nào</p>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => (
                    <tr key={c.campaignId} className="hover:bg-slate-50/70">
                      {/* Contract Reference & PDF link */}
                      <td className="px-4 py-3">
                        {c.contractReference ? (
                          <div className="font-mono font-bold text-slate-900">{c.contractReference}</div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                            <AlertTriangle className="h-3 w-3" /> Chưa cập nhật
                          </span>
                        )}
                        {c.contractFileUrl && (
                          <a
                            href={c.contractFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> File PDF số hóa
                          </a>
                        )}
                      </td>

                      {/* Campaign & Advertiser */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{c.campaignName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {c.companyName} • MST: <span className="font-mono">{c.taxCode}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          LH: {c.contactPerson} ({c.contactPhone})
                        </div>
                      </td>

                      {/* Signing Date */}
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-slate-800">
                          {c.signingDate ? formatDate(c.signingDate) : formatDate(c.startDate)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          Ký kết pháp lý
                        </div>
                      </td>

                      {/* Slot & Time */}
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-primary-900">{c.slotName}</div>
                        <div className="mt-0.5 text-slate-500">
                          {formatDate(c.startDate)} → {formatDate(c.endDate)}
                        </div>
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{formatCurrency(c.contractValue)}</div>
                        <div className="mt-0.5 text-xs text-emerald-700 font-medium">
                          {c.paymentStatus === 'PAID' ? '✓ Đã thanh toán' : c.paymentStatus}
                        </div>
                      </td>

                      {/* Addendums count */}
                      <td className="px-4 py-3 text-center">
                        {c.addendums && c.addendums.length > 0 ? (
                          <button
                            onClick={() => setViewAddendumsTarget(c)}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 hover:bg-slate-200"
                          >
                            <Eye className="h-3 w-3 text-slate-600" />
                            {c.addendums.length} phụ lục
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                          {c.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditContractTarget(c)
                              setContractRefInput(c.contractReference || c.contractNumber || '')
                              setContractUrlInput(c.contractFileUrl || '')
                              setEditSigningDate(c.signingDate || c.startDate || new Date().toISOString().slice(0, 10))
                              setEditContractValue(c.contractValue || '')
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            title="Chỉnh sửa số hợp đồng, ngày ký, giá trị và link PDF"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Sửa
                          </button>

                          <button
                            onClick={() => {
                              setAddendumTarget(c)
                              setAddendumNumber(`PL-${String((c.addendums?.length || 0) + 1).padStart(2, '0')}/${c.contractReference || 'HD'}`)
                              setAddendumNotes('')
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-primary-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-primary-800"
                            title="Tạo phụ lục hợp đồng mới"
                          >
                            <FilePlus className="h-3.5 w-3.5" />
                            + Phụ lục
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: VIP Tiering Table */}
      {activeTab === 'vip' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Khách hàng Doanh nghiệp</th>
                  <th className="px-4 py-3">Người liên hệ & MST</th>
                  <th className="px-4 py-3">Tổng giá trị đã ký</th>
                  <th className="px-4 py-3 text-center">Số chiến dịch</th>
                  <th className="px-4 py-3 text-center">Phân hạng VIP</th>
                  <th className="px-4 py-3 text-center">Chiết khấu VIP</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-600" />
                      <p className="mt-2 text-sm">Đang tải danh sách phân hạng VIP...</p>
                    </td>
                  </tr>
                ) : filteredVip.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Crown className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-base font-medium text-slate-700">Chưa có khách hàng doanh nghiệp</p>
                    </td>
                  </tr>
                ) : (
                  filteredVip.map((v) => (
                    <tr key={v.advertiserId} className="hover:bg-slate-50/70">
                      {/* Company */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{v.companyName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{v.email}</div>
                      </td>

                      {/* Contact & Tax */}
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-slate-800">{v.contactPerson}</div>
                        <div className="text-slate-500">{v.phone}</div>
                        <div className="font-mono text-slate-400">MST: {v.taxCode}</div>
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatCurrency(v.totalSpent)}
                      </td>

                      {/* Campaign count */}
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {v.campaignCount}
                      </td>

                      {/* VIP Tier Badge */}
                      <td className="px-4 py-3 text-center">
                        {renderVipBadge(v.vipTier)}
                      </td>

                      {/* Discount % */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-amber-800">
                          {v.vipDiscountPercent}%
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setVipTarget(v)
                            setVipTierSelect((v.vipTier as any) || 'STANDARD')
                            setVipDiscountInput(v.vipDiscountPercent || 0)
                            setVipNotes('')
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          <Crown className="h-3.5 w-3.5 text-amber-600" />
                          Điều chỉnh hạng
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {editContractTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Cập Nhật Hồ Sơ Hợp Đồng Quảng Cáo</h3>
              <button
                onClick={() => setEditContractTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  Chiến dịch: <span className="font-semibold text-slate-900">{editContractTarget.campaignName}</span>
                </p>
                <p className="mt-0.5">
                  Khách hàng: <span className="font-semibold">{editContractTarget.companyName}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Số hiệu hợp đồng pháp lý <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={contractRefInput}
                  onChange={(e) => setContractRefInput(e.target.value)}
                  placeholder="Ví dụ: HD-2026-DV-001"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Ngày ký hợp đồng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editSigningDate}
                    onChange={(e) => setEditSigningDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Giá trị hợp đồng (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={editContractValue}
                    onChange={(e) => setEditContractValue(e.target.value ? Number(e.target.value) : '')}
                    placeholder="45000000"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Đường dẫn file số hóa (PDF URL)
                </label>
                <input
                  type="url"
                  value={contractUrlInput}
                  onChange={(e) => setContractUrlInput(e.target.value)}
                  placeholder="https://example.com/contracts/HD-2026-DV-001.pdf"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => setEditContractTarget(null)}
                disabled={isUpdatingContract}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateContract}
                disabled={isUpdatingContract || !contractRefInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 disabled:opacity-50"
              >
                {isUpdatingContract && <RefreshCw className="h-4 w-4 animate-spin" />}
                Lưu hồ sơ hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-primary-900" />
                <h3 className="text-lg font-bold text-slate-900">Tạo Mới Hồ Sơ Hợp Đồng Quảng Cáo</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Chọn chiến dịch quảng cáo <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newCampaignId}
                  onChange={(e) => {
                    const cid = Number(e.target.value)
                    setNewCampaignId(cid)
                    const camp = contracts.find((c) => c.campaignId === cid)
                    if (camp) {
                      setNewContractValue(camp.contractValue || '')
                      setNewContractNumber(`HD-2026-DV-00${cid}`)
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">-- Chọn chiến dịch cần ký hợp đồng --</option>
                  {contracts.map((c) => (
                    <option key={c.campaignId} value={c.campaignId}>
                      #{c.campaignId} - {c.campaignName} ({c.companyName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Số hiệu hợp đồng chính thức <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newContractNumber}
                  onChange={(e) => setNewContractNumber(e.target.value)}
                  placeholder="Ví dụ: HD-2026-DV-001"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Ngày ký kết pháp lý <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newSigningDate}
                    onChange={(e) => setNewSigningDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Giá trị hợp đồng (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newContractValue}
                    onChange={(e) => setNewContractValue(e.target.value ? Number(e.target.value) : '')}
                    placeholder="45000000"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  File hợp đồng số hóa (PDF URL)
                </label>
                <input
                  type="url"
                  value={newContractUrl}
                  onChange={(e) => setNewContractUrl(e.target.value)}
                  placeholder="https://example.com/contracts/HD-2026-DV-001.pdf"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Ghi chú điều khoản / Nghiệm thu
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ghi chú thêm về điều khoản thanh toán, nghiệm thu bàn giao..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingContract}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateContract}
                disabled={isCreatingContract || !newCampaignId || !newContractNumber.trim() || !newSigningDate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 disabled:opacity-50"
              >
                {isCreatingContract && <RefreshCw className="h-4 w-4 animate-spin" />}
                Xác nhận tạo hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Addendum Modal */}
      {addendumTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Tạo Phụ Lục Hợp Đồng Quảng Cáo</h3>
              <button
                onClick={() => setAddendumTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  Hợp đồng gốc: <span className="font-mono font-bold text-slate-900">{addendumTarget.contractReference || 'Chưa có'}</span>
                </p>
                <p className="mt-0.5">
                  Khách hàng: <span className="font-semibold">{addendumTarget.companyName}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Số phụ lục hợp đồng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={addendumNumber}
                  onChange={(e) => setAddendumNumber(e.target.value)}
                  placeholder="Ví dụ: PL-01/HD-2026-DV-001"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Ngày áp dụng hiệu lực <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={addendumDate}
                  onChange={(e) => setAddendumDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nội dung điều chỉnh chính <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addendumType}
                  onChange={(e) => setAddendumType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="Điều chỉnh lịch phát sóng">Điều chỉnh lịch phát sóng</option>
                  <option value="Bù ngày hiển thị (Make-Good)">Bù ngày hiển thị (Make-Good)</option>
                  <option value="Điều chỉnh ngân sách & đơn giá">Điều chỉnh ngân sách & đơn giá</option>
                  <option value="Thay đổi vị trí hoặc kích thước banner">Thay đổi vị trí hoặc kích thước banner</option>
                  <option value="Khác">Nội dung điều chỉnh khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Ghi chú chi tiết điều khoản phụ lục
                </label>
                <textarea
                  rows={3}
                  value={addendumNotes}
                  onChange={(e) => setAddendumNotes(e.target.value)}
                  placeholder="Chi tiết nội dung thỏa thuận bổ sung giữa tòa soạn và nhà quảng cáo..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => setAddendumTarget(null)}
                disabled={isCreatingAddendum}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAddendum}
                disabled={isCreatingAddendum || !addendumNumber.trim() || !addendumDate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 disabled:opacity-50"
              >
                {isCreatingAddendum && <RefreshCw className="h-4 w-4 animate-spin" />}
                Xác nhận tạo phụ lục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Addendums Modal */}
      {viewAddendumsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Danh Sách Phụ Lục Hợp Đồng</h3>
                <p className="text-xs text-slate-500">
                  Hợp đồng: <span className="font-mono font-semibold">{viewAddendumsTarget.contractReference}</span>
                </p>
              </div>
              <button
                onClick={() => setViewAddendumsTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
              {viewAddendumsTarget.addendums.map((ad, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="font-mono text-primary-900">{ad.addendumNumber}</span>
                    <span className="text-slate-500">Hiệu lực: {formatDate(ad.effectiveDate)}</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    Nội dung: {ad.adjustmentType}
                  </div>
                  {ad.notes && (
                    <div className="mt-1 text-slate-600 bg-white rounded border border-slate-200 p-2">
                      {ad.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
              <button
                onClick={() => setViewAddendumsTarget(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update VIP Tier Modal */}
      {vipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-amber-100 pb-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                <Crown className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Điều Chỉnh Phân Hạng Khách Hàng VIP B2B
                </h3>
                <p className="text-xs text-slate-500">
                  Áp dụng mức chiết khấu tự động cho các hợp đồng quảng cáo tiếp theo của doanh nghiệp
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  Doanh nghiệp: <span className="font-semibold text-slate-900">{vipTarget.companyName}</span>
                </p>
                <p className="mt-0.5">
                  Tổng chi tiêu tích lũy:{' '}
                  <span className="font-bold text-amber-800">{formatCurrency(vipTarget.totalSpent)}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Cấp bậc VIP đối tác <span className="text-rose-500">*</span>
                </label>
                <select
                  value={vipTierSelect}
                  onChange={(e) => {
                    const t = e.target.value as any
                    setVipTierSelect(t)
                    if (t === 'DIAMOND') setVipDiscountInput(15)
                    else if (t === 'GOLD') setVipDiscountInput(10)
                    else if (t === 'SILVER') setVipDiscountInput(5)
                    else setVipDiscountInput(0)
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="STANDARD">STANDARD - Tiêu chuẩn (0% chiết khấu)</option>
                  <option value="SILVER">SILVER - Bạc (5% chiết khấu)</option>
                  <option value="GOLD">GOLD - Vàng (10% chiết khấu)</option>
                  <option value="DIAMOND">DIAMOND - Kim cương (15% chiết khấu)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tỷ lệ chiết khấu áp dụng (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={vipDiscountInput}
                  onChange={(e) => setVipDiscountInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Ghi chú phê duyệt nâng hạng
                </label>
                <textarea
                  rows={2}
                  value={vipNotes}
                  onChange={(e) => setVipNotes(e.target.value)}
                  placeholder="Ví dụ: Đối tác đồng hành 3 năm liên tiếp, tổng doanh số trên 40 triệu đồng..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => setVipTarget(null)}
                disabled={isUpdatingVip}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateVip}
                disabled={isUpdatingVip}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {isUpdatingVip && <RefreshCw className="h-4 w-4 animate-spin" />}
                Lưu phân hạng VIP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
