export const maskPhone = (phone?: string) => {
  if (!phone) return phone
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export const maskIdCard = (idCard?: string) => {
  if (!idCard) return idCard
  if (idCard.length < 8) return idCard
  return `${idCard.slice(0, 4)}********${idCard.slice(-4)}`
}

export const canViewSensitive = (role?: string) => {
  return role === 'admin' || role === 'manager'
}
