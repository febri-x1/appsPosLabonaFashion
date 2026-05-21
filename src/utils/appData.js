export const roleLabels = {
  admin: 'Admin',
  owner: 'Owner',
  kasir: 'Kasir',
}

export function emptyData() {
  return {
    users: [],
    products: [],
    product_variants: [],
    discounts: [],
    transactions: [],
    transaction_details: [],
  }
}
