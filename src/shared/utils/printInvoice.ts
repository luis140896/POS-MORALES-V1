/**
 * Utilidad reutilizable para impresión de facturas en térmica 58mm.
 * Resuelve: papel en blanco, márgenes excesivos, páginas extra.
 */

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'EFECTIVO': return 'Efectivo'
    case 'TRANSFERENCIA': return 'Transferencia'
    case 'TARJETA_CREDITO': return 'Tarjeta Crédito'
    case 'TARJETA_DEBITO': return 'Tarjeta Débito'
    case 'NEQUI': return 'Nequi'
    case 'DAVIPLATA': return 'Daviplata'
    default: return method
  }
}

interface PrintableInvoice {
  invoiceNumber: string
  createdAt: string
  customer?: { fullName?: string } | null
  customerName?: string
  userName?: string
  details?: Array<{ quantity: number; productName: string; subtotal: number; notes?: string }>
  subtotal: number
  discountAmount: number
  discountPercent?: number
  serviceChargeAmount?: number
  serviceChargePercent?: number
  deliveryChargeAmount?: number
  total: number
  paymentMethod?: string
  amountReceived?: number
  changeAmount?: number
}

interface PrintOptions {
  isPreBill?: boolean
}

/**
 * CSS optimizado para impresoras térmicas 58mm.
 * - @page sin márgenes para evitar páginas vacías
 * - @media print fuerza el ancho correcto
 * - body height auto para que el contenido determine el largo del ticket
 */
const thermalCSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page {
    size: 58mm auto;
    margin: 0;
  }
  @media print {
    html, body {
      width: 58mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  body {
    font-family: 'Courier New', monospace;
    padding: 1mm 0.5mm;
    width: 54mm;
    max-width: 54mm;
    font-size: 8px;
    line-height: 1.2;
    color: #000000 !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-weight: 600;
  }
  .header { text-align: center; margin-bottom: 6px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
  .header h1 { margin: 0 0 2px; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #000000 !important; }
  .header .invoice-num { font-size: 12px; font-weight: 900; color: #000000 !important; }
  .header p { margin: 1px 0; font-size: 10px; color: #000000 !important; font-weight: 600; }
  .pre-bill-banner { text-align: center; font-size: 13px; font-weight: 900; border: 2px dashed #000; padding: 4px; margin-bottom: 6px; text-transform: uppercase; color: #000000 !important; }
  .info { margin-bottom: 6px; }
  .info div { margin: 1px 0; font-size: 11px; color: #000000 !important; font-weight: 600; }
  .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; }
  .item { display: flex; justify-content: space-between; margin: 1px 0; font-size: 9px; color: #000000 !important; font-weight: 600; padding-right: 1mm; }
  .item span:first-child { flex: 1; margin-right: 1px; }
  .item span:last-child { flex-shrink: 0; text-align: right; }
  .item-notes { font-size: 9px; color: #000000 !important; margin-left: 8px; margin-bottom: 2px; font-weight: 500; }
  .totals div { display: flex; justify-content: space-between; margin: 1px 0; font-size: 9px; color: #000000 !important; font-weight: 600; padding-right: 1mm; }
  .totals div span:first-child { flex: 1; margin-right: 1px; }
  .totals div span:last-child { flex-shrink: 0; text-align: right; }
  .total-final { font-size: 12px; font-weight: 900; border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; color: #000000 !important; }
  .payment-info { border-top: 1px dashed #000; margin-top: 6px; padding-top: 4px; }
  .payment-info div { display: flex; justify-content: space-between; margin: 1px 0; color: #000000 !important; font-weight: 600; padding-right: 1mm; font-size: 9px; }
  .payment-info div span:first-child { flex: 1; margin-right: 1px; }
  .payment-info div span:last-child { flex-shrink: 0; text-align: right; }
  .footer { text-align: center; margin-top: 8px; font-size: 9px; color: #000000 !important; border-top: 1px dashed #000; padding-top: 6px; font-weight: 600; }
  .cut-line { text-align: center; margin-top: 10px; font-size: 9px; color: #000000 !important; }
`

export function printInvoice(inv: PrintableInvoice, options: PrintOptions = {}) {
  const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}')
  const companyName = settings?.company?.companyName || 'Mi Empresa'
  const { isPreBill = false } = options

  const itemsHtml = (inv.details || []).map((d) => {
    return `<div class="item"><span>${d.quantity} x ${d.productName}</span><span>${formatCurrency(d.subtotal)}</span></div>`
  }).join('')

  const preBillBanner = isPreBill ? '<div class="pre-bill-banner">*** PRE-CUENTA ***</div>' : ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${isPreBill ? 'Pre-cuenta' : 'Factura'} ${inv.invoiceNumber}</title>
  <style>${thermalCSS}</style>
</head>
<body>
  ${preBillBanner}
  <div class="header">
    <h1>${companyName}</h1>
    <div class="invoice-num">N° ${inv.invoiceNumber}</div>
    <p>${formatDate(inv.createdAt)}</p>
  </div>
  <div class="info">
    <div>Cliente: ${inv.customer?.fullName || inv.customerName || 'Cliente General'}</div>
    <div>Cajero: ${inv.userName || '-'}</div>
  </div>
  <div class="items">
    ${itemsHtml}
  </div>
  <div class="totals">
    <div><span>Subtotal:</span><span>${formatCurrency(inv.subtotal)}</span></div>
    ${inv.discountAmount > 0 ? `<div><span>Descuento${inv.discountPercent ? ` (${inv.discountPercent}%)` : ''}:</span><span>-${formatCurrency(inv.discountAmount)}</span></div>` : ''}
    ${(inv.serviceChargeAmount || 0) > 0 ? `<div><span>Cargo Servicio (${inv.serviceChargePercent || 10}%):</span><span>+${formatCurrency(inv.serviceChargeAmount!)}</span></div>` : ''}
    ${(inv.deliveryChargeAmount || 0) > 0 ? `<div><span>Cargo Domicilio:</span><span>+${formatCurrency(inv.deliveryChargeAmount!)}</span></div>` : ''}
    <div class="total-final"><span>TOTAL:</span><span>${formatCurrency(inv.total)}</span></div>
  </div>
  ${!isPreBill && inv.paymentMethod ? `
  <div class="payment-info">
    <div><span>Método:</span><span>${getPaymentMethodLabel(inv.paymentMethod)}</span></div>
    ${(inv.amountReceived || 0) > 0 ? `<div><span>Recibido:</span><span>${formatCurrency(inv.amountReceived!)}</span></div>` : ''}
    ${(inv.changeAmount || 0) > 0 ? `<div style="font-weight:bold;"><span>Cambio:</span><span>${formatCurrency(inv.changeAmount!)}</span></div>` : ''}
  </div>` : ''}
  <div class="footer">
    <p>${isPreBill ? 'Esta no es una factura fiscal' : '¡Gracias por su compra!'}</p>
  </div>
  <div class="cut-line">- - - - - - - - - - - - -</div>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
      setTimeout(function() { window.close(); }, 3000);
    };
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
