// ── Shared types for Property Detail ──────────────────────────────────────────

export interface TenantData {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  voucherNumber: string | null
  phaCaseworker: string | null
  phaPhone: string | null
}

export interface ActiveLease {
  id: string
  tenantId: string
  tenant: TenantData
  startDate: string
  endDate: string | null
  contractRent: number
  hapAmount: number | null
  tenantCopay: number | null
  utilityAllowance: number | null
  paymentStandard: number | null
  hapContractStart: string | null
  hapContractEnd: string | null
  recertificationDate: string | null
  status: string
  notes: string | null
}

export interface InsurancePolicyData {
  id: string
  carrier: string
  policyNumber: string | null
  policyType: string
  premiumAnnual: number | null
  liabilityLimit: number | null
  premisesLimit: number | null
  effectiveDate: string | null
  expirationDate: string | null
  declarationUrl: string | null
  notes: string | null
}

export interface PropertyTaxData {
  id: string
  taxYear: number
  assessedValue: number | null
  annualAmount: number | null
  status: string
  paidDate: string | null
  paidAmount: number | null
  notes: string | null
}

export interface CityNoticeData {
  id: string
  dateReceived: string
  noticeType: string | null
  description: string
  deadline: string | null
  assignedTo: string | null
  status: string
  sentToPmDate: string | null
  pmResponseDate: string | null
  resolvedDate: string | null
  resolutionNotes: string | null
  documentUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentData {
  id: string
  docType: string | null
  filename: string
  fileUrl: string
  fileSize: number | null
  uploadedAt: string
  notes: string | null
}

export interface PhotoData {
  id: string
  category: string | null
  caption: string | null
  fileUrl: string
  takenAt: string | null
  uploadedAt: string
}

export interface ActivityLogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  details: Record<string, unknown> | null
  createdAt: string
  user: { fullName: string } | null
}

export interface PaymentData {
  id: string
  date: string
  amount: number
  type: string
  status: string
  referenceNumber: string | null
  notes: string | null
}

export interface ExpenseData {
  id: string
  date: string
  amount: number
  category: string
  subcategory: string | null
  vendor: string | null
  description: string | null
  source: string
}

export interface MonthlyChartPoint {
  month: string   // e.g. "Jan 25"
  income: number
  expenses: number
}

export interface CategoryChartPoint {
  category: string
  amount: number
}

export interface InspectionData {
  id: string
  inspectionType: string
  scheduledDate: string | null
  completedDate: string | null
  inspector: string | null
  result: string | null
  deficiencies: string | null
  reinspectionDeadline: string | null
  notes: string | null
  createdAt: string
}

export interface RehabMilestoneData {
  id: string
  name: string
  sortOrder: number | null
  targetDate: string | null
  actualDate: string | null
  status: string
  notes: string | null
}

export interface RehabProjectData {
  id: string
  propertyId: string
  scope: string | null
  startDate: string | null
  targetEndDate: string | null
  actualEndDate: string | null
  originalEstimate: number | null
  currentEstimate: number | null
  actualCost: number
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  milestones: RehabMilestoneData[]
}

export interface PropertyDetailData {
  id: string
  entityId: string
  entity: { id: string; name: string; pmFeePct: number }
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zip: string
  parcelNumber: string | null
  ward: string | null
  neighborhood: string | null
  propertyType: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
  isSection8: boolean
  status: string
  vacantSince: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  activeLease: ActiveLease | null
  insurancePolicies: InsurancePolicyData[]
  propertyTaxes: PropertyTaxData[]
  cityNotices: CityNoticeData[]
  documents: DocumentData[]
  photos: PhotoData[]
  inspections: InspectionData[]
  recentActivity: ActivityLogEntry[]
  recentPayments: PaymentData[]
  recentExpenses: ExpenseData[]
  ytdIncome: number
  ytdExpenses: number
  mtdIncome: number
  mtdExpenses: number
  monthlyChartData: MonthlyChartPoint[]
  expenseByCategoryData: CategoryChartPoint[]
}
