export const PRODUCTOS = [
  { id: 1, nombre: "Accion caja", stockDebido: 15 },
  { id: 2, nombre: "Accion en barra (mantenimiento)", stockDebido: 12 },
  { id: 3, nombre: "Alimento Pandora", stockDebido: 1.5 },
  { id: 4, nombre: "Ambientador", stockDebido: 7 },
  { id: 5, nombre: "Aromaticas", stockDebido: 300 },
  { id: 6, nombre: "Azucar", stockDebido: 35 },
  { id: 7, nombre: "Bicarbonato", stockDebido: 3 },
  { id: 8, nombre: "Bolsa blanca - (65*80)", stockDebido: 200 },
  { id: 9, nombre: "Bolsa Blanca - (48*50) papeleras", stockDebido: 250 },
  { id: 10, nombre: "Bolsa NEGRA - basura (65 * 80)", stockDebido: 300 },
  { id: 11, nombre: "Bolsa Negra - canecas (48*50)", stockDebido: 150 },
  { id: 12, nombre: "Bolsa verde (48 * 50) cocinetas", stockDebido: 210 },
  { id: 13, nombre: "Bolsas rojas", stockDebido: 50 },
  { id: 14, nombre: "Café", stockDebido: 25 },
  { id: 15, nombre: "Café en grano OJAS", stockDebido: 2 },
  { id: 16, nombre: "Colador de tela", stockDebido: 3 },
  { id: 17, nombre: "Eliminador de olores", stockDebido: 12 },
  { id: 18, nombre: "Escobillon para baño", stockDebido: 3 },
  { id: 19, nombre: "Esplenda/estevia", stockDebido: 1 },
  { id: 20, nombre: "Esponja de alambre", stockDebido: 20 },
  { id: 21, nombre: "Filtros cafetera # 2", stockDebido: 240 },
  { id: 22, nombre: "Filtros cafetera # 8", stockDebido: 600 },
  { id: 23, nombre: "Guantes para aseo", stockDebido: 3 },
  { id: 24, nombre: "Insecticida zancudos", stockDebido: 12 },
  { id: 25, nombre: "Insecticida cucaracha", stockDebido: 6 },
  { id: 26, nombre: "Instacrem gerencias", stockDebido: 35 },
  { id: 27, nombre: "Jabon Fab en polvo", stockDebido: 20 },
  { id: 28, nombre: "Jabon Lavaloza liquido", stockDebido: 4 },
  { id: 29, nombre: "Jabon Liquido (lavamanos)", stockDebido: 6 },
  { id: 30, nombre: "Jabón Rey en barra", stockDebido: 20 },
  { id: 31, nombre: "Limpido", stockDebido: 6 },
  { id: 32, nombre: "Maní variado EAA", stockDebido: 4 },
  { id: 33, nombre: "Paños Amarillos", stockDebido: 10 },
  { id: 34, nombre: "Paños microfibra", stockDebido: 20 },
  { id: 35, nombre: "Papel Aluminio", stockDebido: 3 },
  { id: 36, nombre: "Papel higienico - dispensadores", stockDebido: 40 },
  { id: 37, nombre: "Papel higienico - planta y oficinas pq", stockDebido: 240 },
  { id: 38, nombre: "Papel darnel, plastico de envolver", stockDebido: 2 },
  { id: 39, nombre: "Platos desechables", stockDebido: 100 },
  { id: 40, nombre: "Productos aseo Pandora jabón, champu 2 en 1, shampoo pulgas", stockDebido: 3 },
  { id: 41, nombre: "Sal libra", stockDebido: 2 },
  { id: 42, nombre: "Servilletas", stockDebido: 6 },
  { id: 43, nombre: "Silicona", stockDebido: 8 },
  { id: 44, nombre: "Tenedores desechables medianos", stockDebido: 100 },
  { id: 45, nombre: "Toallas de mano", stockDebido: 9 },
  { id: 46, nombre: "Vasos Desechables", stockDebido: 100 },
  { id: 47, nombre: "Vinagre", stockDebido: 2 },
  { id: 48, nombre: "Zabra - esponja para lavar losa", stockDebido: 20 },
  { id: 49, nombre: "Flete", stockDebido: 1 },
];

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const MESES_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

// Datos de consumo del año (cantidad sol = cantidad solicitada por mes)
// Se inicializan en 0, el usuario puede ingresar los valores
export const initConsumoAnio = () =>
  PRODUCTOS.map(p => ({
    ...p,
    cantidades: Array(12).fill(0),
  }));

// Datos de pedido por mes
export const initPedidoMes = () =>
  PRODUCTOS.map(p => ({
    ...p,
    cantidadSolicitar: 0,
    dineroBsolicitado: "",
  }));
