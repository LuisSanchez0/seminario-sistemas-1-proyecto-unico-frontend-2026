# Migración del storefront al catálogo de cosméticos

La navegación de productos, detalle y carrito usa el contrato de cosméticos. El build completo sigue bloqueado por archivos de ventas que ya faltaban antes de empezar: `src/app/sell/services/sell.service.ts` y `src/app/sell/interfaces/sell.interface.ts`. No se reconstruyó ese módulo ni se inventaron endpoints de ventas. Checkout se adaptó al nuevo carrito, pero su ejecución integral depende de recuperar ese módulo con el contrato vigente.

## 1. Estructura existente encontrada

Todas las rutas siguientes son relativas a la raíz del repositorio.

| Responsabilidad                                          | Archivo existente                                                                                                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Listado y filtros públicos                               | `src/app/store-front/pages/products-page/products-page.ts`, `src/app/store-front/pages/products-page/products-page.html`                                                                                                             |
| Tarjetas de productos                                    | Dentro de `src/app/store-front/pages/products-page/products-page.html`; no había componente separado                                                                                                                                 |
| Detalle                                                  | `src/app/store-front/pages/product-page/product-page.component.ts`, `src/app/store-front/pages/product-page/product-page.component.html`                                                                                             |
| Servicio de catálogo                                     | `src/app/products/services/product.service.ts`                                                                                                                                                                                       |
| Product, Brand, ProductSubcategory, filtros y categorías | `src/app/products/interfaces/product.interface.ts`                                                                                                                                                                                   |
| Carrito, contratos y persistencia                        | `src/app/store-front/services/store-front.ts`                                                                                                                                                                                        |
| Página del carrito                                       | `src/app/store-front/pages/cart-page/cart-page.ts`, `src/app/store-front/pages/cart-page/cart-page.html`                                                                                                                             |
| Tarjeta de carrito                                       | `src/app/store-front/pages/cart-page/components/cart-item-card/cart-item-card.component.ts`, `src/app/store-front/pages/cart-page/components/cart-item-card/cart-item-card.component.html`                                           |
| Checkout                                                 | `src/app/store-front/pages/check-out-page/check-out-page.component.ts`, `src/app/store-front/pages/check-out-page/check-out-page.component.html`                                                                                     |
| Resumen de checkout                                      | `src/app/store-front/pages/check-out-page/components/checkout-order-summary/checkout-order-summary.component.ts`, `src/app/store-front/pages/check-out-page/components/checkout-order-summary/checkout-order-summary.component.html` |
| Contrato auxiliar de checkout                            | `src/app/store-front/interfaces/checkout-payload.interface.ts`                                                                                                                                                                       |
| Galería Swiper                                           | `src/app/products/components/product-carousel/product-carousel.component.ts`, `src/app/products/components/product-carousel/product-carousel.component.html`                                                                         |
| Imágenes y placeholder                                   | `src/app/products/pipes/product-image.pipe.ts`, `public/images/product-placeholder.svg`                                                                                                                                              |
| Navbar                                                   | `src/app/store-front/components/navbar/navbar.component.ts`, `src/app/store-front/components/navbar/navbar.component.html`, `src/app/store-front/components/navbar/category-navigation.ts`                                           |
| Rutas                                                    | `src/app/app.routes.ts`, `src/app/store-front/store-front.routes.ts`                                                                                                                                                                 |
| Notificaciones                                           | `src/app/shared/services/notification.service.ts`                                                                                                                                                                                    |
| Scroll                                                   | `src/app/shared/services/scroll-state.service.ts`                                                                                                                                                                                    |
| Paginador reutilizable de otras pantallas                | `src/app/shared/components/pagination/pagination.service.ts`, `src/app/shared/components/pagination/pagination/pagination.component.ts`, `src/app/shared/components/pagination/pagination/pagination.component.html`                 |

El listado público usaba scroll incremental en lotes de seis, no el paginador numerado. Sus filtros estaban incrustados en la plantilla, duplicados entre móvil y escritorio. El detalle usaba un formulario reactivo y un recurso por slug. La personalización importaba componentes de talla/logo/instrucciones que ya no estaban presentes. El modelo Product y el servicio de catálogo ya estaban migrados.

## 2. Archivos modificados

- `src/app/admin/pages/product-admin-page/product-details/product-details.component.ts`
- `src/app/products/components/product-carousel/product-carousel.component.html`
- `src/app/products/components/product-carousel/product-carousel.component.ts`
- `src/app/products/services/product.service.spec.ts`
- `src/app/products/services/product.service.ts`
- `src/app/store-front/components/navbar/navbar.component.ts`
- `src/app/store-front/interfaces/checkout-payload.interface.ts`
- `src/app/store-front/pages/cart-page/cart-page.html`
- `src/app/store-front/pages/cart-page/cart-page.ts`
- `src/app/store-front/pages/cart-page/components/cart-item-card/cart-item-card.component.html`
- `src/app/store-front/pages/cart-page/components/cart-item-card/cart-item-card.component.ts`
- `src/app/store-front/pages/cart-page/components/cart-summary/cart-summary.component.html`
- `src/app/store-front/pages/check-out-page/check-out-page.component.html`
- `src/app/store-front/pages/check-out-page/check-out-page.component.ts`
- `src/app/store-front/pages/check-out-page/components/checkout-order-summary/checkout-order-summary.component.html`
- `src/app/store-front/pages/check-out-page/components/checkout-order-summary/checkout-order-summary.component.ts`
- `src/app/store-front/pages/product-page/product-page.component.html`
- `src/app/store-front/pages/product-page/product-page.component.ts`
- `src/app/store-front/pages/products-page/products-page.html`
- `src/app/store-front/pages/products-page/products-page.ts`
- `src/app/store-front/services/store-front.ts`
- `src/app/store-front/store-front.routes.ts`

La modificación de `product-details.component.ts` del administrador es mínima: sus recargas explícitas omiten la caché compartida, para seguir mostrando subcategorías recién creadas. La modificación del resumen de carrito corrige un contraste insuficiente detectado por AXE y actualiza su enlace al catálogo.

## 3. Archivos creados

- `src/app/store-front/pages/products-page/products-page.css`: estilos de chips que admiten nombres largos, área táctil de 44 px y selección contrastada.
- `src/app/store-front/pages/products-page/products-page.spec.ts`: navegación, filtros, cancelación, paginación incremental, errores y accesibilidad estructural.
- `src/app/store-front/pages/product-page/product-page.component.spec.ts`: detalle, stock, cantidad, payload, cambio de slug, errores y accesibilidad estructural.
- `src/app/store-front/services/store-front.spec.ts`: límites, agrupación, persistencia, limpieza de campos y migración de carrito invitado al iniciar sesión.
- `docs/storefront-cosmetics-migration.md`: este informe.

No se crearon servicios ni páginas de producción duplicados. Para verificar el diseño sin depender del módulo de ventas ausente se utilizó un arranque temporal con los componentes reales; sus archivos temporales se retiraron del repositorio.

## 4. Filtros antiguos eliminados

Se eliminaron el estado, manejadores y controles de género y tallas, incluidos los controles ocultos. Desaparecieron `selectedGenders`, `selectedSizes`, `isGorraCategory` y la lógica de categorías de ropa. Los nombres `gender`, `sizes` y `size` solo permanecen en el listado como claves que se eliminan explícitamente de URLs antiguas al cambiar filtros; no se envían al backend.

## 5. Nuevo filtrado por categoría

Se reutiliza `PRODUCT_CATEGORY_OPTIONS` y `categoryLabel`, sin duplicar el mapeo.

| Valor canónico   | Etiqueta         |
| ---------------- | ---------------- |
| ROSTRO           | Rostro           |
| OJOS_Y_CEJAS     | Ojos y cejas     |
| LABIOS           | Labios           |
| LIMPIEZA         | Limpieza         |
| TRATAMIENTOS     | Tratamientos     |
| HIDRATACION      | Hidratación      |
| PROTECCION_SOLAR | Protección solar |
| PERFUMES         | Perfumes         |

Los chips tienen selección única, `aria-pressed`, foco visible y opción Todas. La URL conserva valores canónicos e IDs: `/products?category=ROSTRO&subcategory=base-id&brand=brand-id`. Las categorías desconocidas y subcategorías sin categoría se eliminan de la URL.

Se conserva `/api/products/stock` y la carga incremental de seis productos. Cada cambio de filtros reinicia el offset en cero, elimina parámetros de paginación antiguos y cancela las solicitudes anteriores. Las siguientes cargas conservan los filtros. Se añadió un botón accesible Cargar más productos y se detienen las peticiones al alcanzar `count`.

## 6. Subcategorías dinámicas

Se usa el método existente `getSubcategoriesByCategory`, que consulta `GET /api/subcategories/category/:category`. Sin categoría no se consultan subcategorías y aparece el texto explicativo. Se muestran estados independientes de carga, error con reintento y lista vacía.

Cambiar categoría elimina inmediatamente la selección dependiente, retira el parámetro de subcategoría y consulta el nuevo padre. La navegación cancela solicitudes anteriores mediante `switchMap`. Una subcategoría recibida por URL se valida contra la lista activa antes de consultar productos. El listado de una categoría sin subcategoría puede cargar mientras llegan sus opciones.

La caché anteriormente local al navbar se trasladó a `ProductService`. Navbar y página usan la misma caché y comparten solicitudes concurrentes. `shareReplay` con `refCount` cancela peticiones sin consumidores. Las mutaciones del catálogo invalidan la caché; el administrador puede solicitar una recarga explícita. Pulsar otra vez la categoría ya seleccionada conserva sus opciones.

## 7. Integración con navbar

La ruta real sigue siendo `/products`, y el detalle sigue en `/product/:idSlug`. No se introdujo un prefijo `/store` que no existía en esta aplicación. Ambas páginas se cargan de forma diferida.

El listado escucha `ActivatedRoute.queryParamMap` durante toda su vida, incluyendo cambios de navbar e historial. `category=ROSTRO` selecciona Rostro y carga sus opciones. `category=ROSTRO&subcategory=base-id` espera la validación del ID y después selecciona Base y consulta productos. Se verificó en navegador el clic real del navbar a Base y la selección correspondiente en el listado.

## 8. Marca

El selector público usa `getBrands()` y los IDs de marcas activas. Incluye Todas las marcas y carga/error/reintento independientes. La selección recibida por URL aparece correctamente después de cargar las opciones de forma asíncrona. No se incorporó la gestión administrativa de marcas al storefront.

## 9. Tarjetas

Las tarjetas permanecen en la plantilla original. Muestran imagen, nombre de marca, título, categoría legible, subcategoría, precio en quetzales y En stock/Sin stock según `product.stock`. Se identifican por `product.id` y enlazan por slug. No muestran tallas, género ni personalización.

## 10. Detalle de producto

La galería y la información se apilan en móvil; desde 768 px forman dos columnas. Se muestran marca, título, jerarquía de categoría/subcategoría, precio, stock, cantidad y botón de compra; la descripción queda debajo. Marca y jerarquía enlazan a los filtros correspondientes. Se mantienen formulario reactivo, skeleton, error, reintento y enlace de regreso. Cambiar de slug dentro de la misma página vuelve a cargar el producto y cancela solicitudes anteriores.

## 11. Personalización eliminada

Se eliminaron controles, imports, estado, validadores y payloads de talla, instrucciones especiales, subida de logo, posición de logo y vista previa del logo. Se retiraron también los diálogos de instrucciones en carrito/checkout y las cargas de logos durante la compra. No hay valores ficticios de talla única, NO_LOGO ni instrucciones vacías.

## 12. Stock y cantidad

La disponibilidad procede de `product.stock`. La cantidad es entera y se limita a las unidades disponibles, descontando lo que ya está en el carrito. No se puede reducir por debajo de uno cuando existe disponibilidad, ni superar el máximo; las entradas negativas, fraccionarias o no finitas se normalizan. Cuando no quedan unidades la compra y los controles se deshabilitan. `stock=0` muestra Producto agotado. El store vuelve a validar cantidades y stock para evitar que una modificación del formulario eluda el límite.

## 13. Contrato del carrito y archivos downstream

Antes:

```ts
interface CartItem {
  product: { _id: string; slug: string; title: string; price: number; imageUrl: string };
  size: string;
  logoLocation: string;
  imgLogo: string | null;
  quantity: number;
  stockForSize: number | null;
  specialInstructions?: string;
}
```

Ahora se conserva la arquitectura de snapshot anidado:

```ts
interface CartItem {
  product: {
    id: string;
    slug: string;
    title: string;
    price: number;
    imageUrl: string;
    stock: number;
  };
  quantity: number;
}
```

`AddToCartInput` reutiliza este contrato. Una línea por `product.id`; añadir el mismo producto acumula cantidad hasta su stock. Actualizar y eliminar usan exclusivamente ese ID.

Las claves son `cart_cosmetics_v1_guest_<guestId>` y `cart_cosmetics_v1_user_<uid>`. Los carritos antiguos de ropa quedan intactos bajo sus claves originales y no se importan al catálogo nuevo. Se mantiene la política previa de migración invitado/usuario y prioridad del carrito del usuario. La restauración valida datos y proyecta únicamente los campos permitidos.

El checkout conserva su forma de payload existente para ventas:

```ts
products: cartItems.map((item) => ({
  product: item.product.id,
  quantity: item.quantity,
  subTotal: item.product.price * item.quantity,
}));
```

El comprobante de pago, direcciones y confirmación por correo mantienen su flujo. No se verificó un pedido contra el backend real: faltan `SellService` y su interfaz, incluido `CreateSellPayload`, en este checkout inicial.

Archivos downstream modificados:

- `src/app/store-front/services/store-front.ts`
- `src/app/store-front/interfaces/checkout-payload.interface.ts`
- `src/app/store-front/pages/cart-page/cart-page.ts`
- `src/app/store-front/pages/cart-page/cart-page.html`
- `src/app/store-front/pages/cart-page/components/cart-item-card/cart-item-card.component.ts`
- `src/app/store-front/pages/cart-page/components/cart-item-card/cart-item-card.component.html`
- `src/app/store-front/pages/cart-page/components/cart-summary/cart-summary.component.html`
- `src/app/store-front/pages/check-out-page/check-out-page.component.ts`
- `src/app/store-front/pages/check-out-page/check-out-page.component.html`
- `src/app/store-front/pages/check-out-page/components/checkout-order-summary/checkout-order-summary.component.ts`
- `src/app/store-front/pages/check-out-page/components/checkout-order-summary/checkout-order-summary.component.html`

## 14. Imágenes

Se conservó Swiper y las URLs de `product.images`, incluidas URLs S3. La galería mantiene navegación y paginación, usa el título como texto alternativo y añade soporte de teclado/accesibilidad de Swiper. No existía una tira separada de thumbnails en este componente. Se reutiliza `ProductImagePipe` y `/images/product-placeholder.svg` para productos sin imagen. Las imágenes del catálogo usan `NgOptimizedImage` con dimensiones explícitas.

## 15. Comportamiento responsive

Se ejecutó Chromium con componentes reales y respuestas HTTP simuladas a 390, 768, 820, 1024 y 1440 px. Listado y detalle no presentaron desbordamiento horizontal. En móvil/tablet menor de 1024 px, los filtros se despliegan con un botón y `aria-expanded`; en escritorio forman una columna lateral. Los chips admiten varias líneas. Las tarjetas pasan de una a dos y luego tres columnas. El detalle pasa de una a dos columnas desde 768 px; los controles de cantidad miden 48 px.

AXE sobre el contenido principal de listado y detalle no detectó infracciones WCAG A/AA en esos cinco anchos, con contraste activado. También se comprobó carrito a 390 px y detalle agotado a 1440 px. Esto no certifica toda la aplicación ni reemplaza una auditoría manual completa.

Capturas y registro de solicitudes simuladas: `/tmp/cosmetics-review/`. Script de navegador: `/tmp/cosmetics-browser-check.cjs`. Bundle de comprobación: `/tmp/cosmetics-validation/`.

## 16. Referencias legacy restantes fuera del flujo migrado

- `src/app/store-front/pages/order-page/order-page.ts`: mapeo de posiciones de logo y helpers de pedidos históricos.
- `src/app/store-front/pages/order-page/order-page.html`: `product.size`, `product.imgLogo`, `product.logoLocation` y `product.specialInstructions` en la visualización de pedidos históricos. Esta pantalla depende también del módulo de ventas ausente y queda fuera de la migración de compra.
- `src/app/admin/pages/sell-admin-page/sell-admin-page.component.ts`: referencias comentadas de talla, logo y posiciones del flujo administrativo anterior.
- `src/app/store-front/store-front.routes.ts`: redirección legacy `products/:gender/:category` conservada para enlaces antiguos; no aplica filtros de ropa.
- `src/app/store-front/pages/products-page/products-page.ts`: claves legacy puestas a `null` únicamente para limpiar la URL.
- Fixtures de pruebas: referencias deliberadas para comprobar que los campos antiguos no sobreviven a la restauración del carrito.

No quedan dependencias funcionales de tallas/género/personalización en el listado, detalle, store, carrito ni checkout migrados.

## 17. Validación ejecutada

| Comprobación                                                        | Resultado real                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test -- --watch=false`                                         | 67 pruebas aprobadas en 10 archivos                                                                                                         |
| `npx tsc --noEmit -p tsconfig.spec.json`                            | Aprobado                                                                                                                                    |
| `npx tsc --noEmit -p tsconfig.app.json`                             | Falla por los módulos de ventas ausentes y errores derivados en checkout/inicio/pedidos; bloqueo comprobado antes y después de la migración |
| `npm run build`                                                     | Falla por el mismo módulo de ventas ausente                                                                                                 |
| Build Angular aislado con listado, detalle, navbar y carrito reales | Aprobado; utiliza un arranque temporal y no equivale al build completo de producción                                                        |
| Chromium + AXE                                                      | Sin overflow ni infracciones en los ámbitos y anchos descritos arriba; cero errores de página                                               |
| Payload de carrito en navegador                                     | Confirmado en localStorage: snapshot con `id`/stock y `quantity`, sin los campos eliminados                                                 |
| Navegación                                                          | Navbar → subcategoría, cambio de categoría, limpieza, marca por URL, cantidad máxima y agotado comprobados                                  |
| Formato                                                             | Prettier aplicado a los archivos fuente modificados; `prettier --check` aprobado                                                            |
| Lint                                                                | No hay script ni configuración de lint disponible; no ejecutado                                                                             |
| `git diff --check`                                                  | Sin errores                                                                                                                                 |

Las pruebas automatizadas cubren además IDs canónicos, filtros no vacíos, offset conservando filtros, estados vacíos/errores, reintento, cancelación de peticiones obsoletas, caché compartida, recarga administrativa, límites de inventario y persistencia/autenticación del carrito. Las pruebas unitarias de AXE omiten contraste por las limitaciones de jsdom; las verificaciones de Chromium sí lo incluyen.
