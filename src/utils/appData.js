export const roleLabels = {
  admin: 'Admin',
  owner: 'Owner',
  kasir: 'Kasir',
}

export function emptyData() {
  return {
    users: [],
    products: [],
    discounts: [],
    transactions: [],
    transaction_details: [],
  }
}
