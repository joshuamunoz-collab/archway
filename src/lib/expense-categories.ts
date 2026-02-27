export interface ExpenseCategory {
  value: string
  label: string
  subcategories: { value: string; label: string }[]
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    value: 'maintenance_repairs',
    label: 'Maintenance & Repairs',
    subcategories: [
      { value: 'plumbing',      label: 'Plumbing' },
      { value: 'electrical',    label: 'Electrical' },
      { value: 'hvac',          label: 'HVAC' },
      { value: 'appliance',     label: 'Appliance' },
      { value: 'handyman',      label: 'General Handyman' },
      { value: 'pest_control',  label: 'Pest Control' },
      { value: 'locksmith',     label: 'Locksmith' },
      { value: 'other',         label: 'Other' },
    ],
  },
  {
    value: 'utilities',
    label: 'Utilities',
    subcategories: [
      { value: 'msd_sewer',  label: 'MSD (Sewer)' },
      { value: 'electric',   label: 'Electric (Ameren)' },
      { value: 'gas',        label: 'Gas (Spire)' },
      { value: 'water',      label: 'Water' },
      { value: 'trash',      label: 'Trash' },
    ],
  },
  {
    value: 'city_government',
    label: 'City & Government',
    subcategories: [
      { value: 'license_registration',  label: 'License / Registration' },
      { value: 'code_violation_fine',   label: 'Code Violation Fine' },
      { value: 'permit',                label: 'Permit' },
      { value: 'other',                 label: 'Other' },
    ],
  },
  {
    value: 'insurance',
    label: 'Insurance',
    subcategories: [
      { value: 'premium',     label: 'Premium Payment' },
      { value: 'deductible',  label: 'Deductible' },
    ],
  },
  {
    value: 'taxes',
    label: 'Taxes',
    subcategories: [
      { value: 'property_tax',        label: 'Property Tax' },
      { value: 'special_assessment',  label: 'Special Assessment' },
    ],
  },
  {
    value: 'rehab_capital',
    label: 'Rehab / Capital',
    subcategories: [
      { value: 'materials',       label: 'Materials' },
      { value: 'labor',           label: 'Labor' },
      { value: 'permit',          label: 'Permit' },
      { value: 'dumpster_hauling', label: 'Dumpster / Hauling' },
    ],
  },
  {
    value: 'professional_services',
    label: 'Professional Services',
    subcategories: [
      { value: 'pm_management_fee', label: 'PM Management Fee' },
      { value: 'legal',             label: 'Legal' },
      { value: 'accounting',        label: 'Accounting' },
      { value: 'inspection_fee',    label: 'Inspection Fee' },
    ],
  },
  {
    value: 'other',
    label: 'Other',
    subcategories: [
      { value: 'lawn_care',         label: 'Lawn Care' },
      { value: 'snow_removal',      label: 'Snow Removal' },
      { value: 'cleaning_turnover', label: 'Cleaning / Turnover' },
      { value: 'marketing',         label: 'Marketing' },
      { value: 'miscellaneous',     label: 'Miscellaneous' },
    ],
  },
]

export function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label ?? value.replace(/_/g, ' ')
}

export function getSubcategoryLabel(catValue: string, subValue: string): string {
  const cat = EXPENSE_CATEGORIES.find(c => c.value === catValue)
  return cat?.subcategories.find(s => s.value === subValue)?.label ?? subValue.replace(/_/g, ' ')
}
