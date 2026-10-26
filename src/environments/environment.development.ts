export const environment = {
  baseUrl: 'http://localhost:8080/api',
  /**
   * Cuenta que recibe las transferencias de los clientes. El negocio debe completar estos datos:
   * mientras `accountNumber` esté vacío, la tienda muestra que los datos de pago los confirma
   * el equipo en lugar de inventar una cuenta.
   */
  paymentAccount: {
    bank: '',
    accountType: '',
    holder: '',
    accountNumber: '',
  },
};
