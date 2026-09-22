/**
 * Frontend interfaces aligned with the backend SellSchema.
 *
 * The payload is built from:
 *   - CartItem[] (from StoreFront signal store)
 *   - Selected CheckoutAddress
 *   - Payment method (hardcoded TRANSFERENCIA for now)
 *   - Optional imgBoleta (base64 receipt image)
 *
 * Not submitted to backend yet — logged on "Confirmar pedido" for now.
 * Replace console.log with an HTTP call once the sell endpoint is ready.
 */

export type PaymentState =
  | 'EN_ESPERA_DE_PAGO'
  | 'PAGO_REALIZADO'
  | 'CANCELADO'
  | 'REEMBOLSADO';

export type OrderState =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'PARCIALMENTE_ENVIADO'
  | 'ENVIADO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'REEMBOLSADO';

export type ShippingStatus =
  | 'ORDER_PLACED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED';

export type PaymentMethod = 'TRANSFERENCIA';

/** One product line inside the checkout payload. */
export interface CheckoutProductLine {
  /** Product ObjectId (from CartProductRef._id). */
  product: string;
  size: string;
  subTotal: number;
  quantity: number;
  /** Base64 logo image, or null if no logo was chosen. */
  imgLogo?: string | null;
  /** Custom instructions provided by the buyer for this product line. */
  specialInstructions?: string;
  shipping_status: ShippingStatus;
  /** ISO date string — set to Date.now() at payload creation time. */
  shipping_status_updated_at: string;
}

/** Complete checkout payload ready to send to POST /sell. */
export interface CheckoutPayload {
  payment_state: PaymentState;
  order_state: OrderState;
  /** ISO date string. */
  date: string;
  delivery_date?: string;
  /**
   * Buyer user ObjectId.
   * Leave undefined until auth-aware checkout is required;
   * the backend will infer the buyer from the JWT token.
   */
  buyer_user?: string;
  total: number;
  products: CheckoutProductLine[];
  /** Address uid (maps to ObjectId on the backend). */
  shipping_address: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  notes?: string;
  /** Base64 receipt image, or null if not provided. */
  imgBoleta?: string | null;
}
