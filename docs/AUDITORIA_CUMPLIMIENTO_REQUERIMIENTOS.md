# Auditoría de cumplimiento — Formato de Consumo IMPADOC

**Fecha:** 22 jul 2026  
**Alcance:** solo lectura (código + BD dev `consumo`)  
**Repos:** `formato-consumo-frontend`, `formato-consumo-backend`

## Resumen ejecutivo

| Requerimiento | Estado | % aprox. |
|---|---|---:|
| Registro de solicitudes | ⚠️ Parcial | 25% |
| Alertas por promedio histórico | ❌ No implementado | 5% |
| Stock de reserva | ⚠️ Parcial | 15% |
| Semáforo rojo/amarillo/verde | ❌ No implementado | 0% |
| Panel visual y áreas | ⚠️ Parcial | 15% |
| Precios y dinero | ⚠️ Parcial | 30% |
| Histórico actual | ⚠️ Parcial | 25% |
| Cálculos mensuales/anuales/exportación | ⚠️ Parcial | 70% |

**Conclusión:** Los módulos core (ConsumoAnio, FormatoPedido, RegistroEntregas, catálogos, persistencia anual, exportación básica) están operativos. Solicitudes, alertas, semáforo funcional, inventario operativo, precios históricos y panel analítico están preparados a nivel de esquema BD pero sin lógica/API/UI activa.

## Hallazgos clave

### Implementado (comprobado)

- Tres módulos UI + API v1 operativa.
- Catálogo: 49 productos operativos + 17 históricos Excel; 12 áreas.
- Persistencia anual ConsumoAnio y FormatoPedido (`consumo_planes`).
- Pedido especial, firma, productos temporales, dirty state.
- Registro de entregas con área, filtros, export Excel.
- Pipeline importación histórica Excel (staging → entregas).
- Tests: `ConsumoAnioApiTest`, `FormatoPedidoApiTest`.

### No implementado / solo esquema

- Tablas `solicitudes`, `alertas`, `inventarios`, `precios_historicos` sin API ni UI.
- Sin motor de promedios ni comparación automática.
- Semáforo: enum en BD, sin cálculo ni pantalla.
- BD dev (22 jul 2026): 0 entregas históricas importadas, 0 staging, 4 entregas sistema.

### Distinciones importantes

- `stock_debido` / `stock_minimo_referencia` ≠ stock de reserva operativo.
- Colores UI (mes activo, badges) ≠ semáforo de alertas.
- `dinero_solicitar` manual ≠ sistema de precios históricos.
- Export ConsumoAnio: no incluye existencias ni dinero (sí cantidades y totales).

## 🚨 Sistema de alertas

| Pregunta | Respuesta |
|---|---|
| Promedio histórico | No |
| Comparación automática | No |
| Alertas exceso/falta/stock/solicitud | No |
| Semáforo funcional | No |
| Por área / producto / histórico | No |

Umbrales en `ConfiguracionAlertaSeeder` (15/40/40): diseño preparatorio únicamente.

## Estado BD dev (consulta read-only)

| Dato | Valor |
|---|---|
| entregas totales | 4 |
| entregas excel_historico | 0 |
| staging | 0 |
| inventarios / alertas / solicitudes / precios | 0 |
| consumo_planes | 2 (2026) |

## Referencia técnica

- Frontend: `ConsumoAnio.jsx`, `FormatoPedido.jsx`, `RegistroEntregas.jsx`, servicios en `src/services/`.
- Backend rutas: `routes/api.php` (sin rutas alertas/solicitudes/inventario).
- Migraciones futuras: `2026_07_21_100008` inventarios, `100010` precios, `100011` solicitudes, `100014` alertas.
- Excel histórico: `docs/Consumo_DESARROLLO.xlsx` (no modificar).
