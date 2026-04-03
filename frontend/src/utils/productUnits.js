export function getProductUnit(productOrUnit) {
  if (typeof productOrUnit === "string") {
    return productOrUnit === "litre" ? "litre" : "kg";
  }

  return productOrUnit?.unit === "litre" ? "litre" : "kg";
}

export function formatPriceWithUnit(price, productOrUnit) {
  return `Rs. ${Number(price || 0)} / ${getProductUnit(productOrUnit)}`;
}

export function formatQuantityWithUnit(quantity, productOrUnit) {
  return `${Number(quantity || 0)} ${getProductUnit(productOrUnit)}`;
}

export function formatAvailableStock(quantity, productOrUnit) {
  return `${formatQuantityWithUnit(quantity, productOrUnit)} available`;
}
