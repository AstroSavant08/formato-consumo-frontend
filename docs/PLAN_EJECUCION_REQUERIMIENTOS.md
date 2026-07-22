# Plan de ejecución — Requerimientos faltantes IMPADOC

**Fecha:** 22 jul 2026  
**Estimación:** 6–10 semanas (1 dev full-time ≈ 8 semanas)

## Principios

1. No romper ConsumoAnio, FormatoPedido ni Entregas.
2. Backend + tests antes de UI.
3. Histórico cargado antes de alertas.
4. Cada fase cierra con criterios de aceptación medibles.

## Oleadas

| Oleada | Objetivo | Req. |
|--------|----------|------|
| A | Histórico operativo | 7 |
| B | Solicitudes + trazabilidad | 1, 5 |
| C | Precios y dinero automático | 6 |
| D | Inventario y stock reserva | 3 |
| E | Promedios + alertas + semáforo | 2, 4 |
| F | Panel visual global | 5 |
| G | Exportación completa | 8 |
| H | Endurecimiento y re-auditoría | todos |

## Fase A — Histórico (Semana 1)

- Importar `Consumo_DESARROLLO.xlsx` vía pipeline staging.
- Validar aliases pendientes; promote controlado.
- Informe de calidad: fechas, productos, áreas cubiertos.

**Aceptación:** entregas `excel_historico` consultables por mes/producto/área.

## Fase B — Solicitudes (Semanas 2–3)

- Modelos + API CRUD `solicitudes` / `solicitud_detalles`.
- UI módulo Solicitudes: área, justificación, estados, detalle productos.
- Vínculo opcional solicitud → FormatoPedido → Entrega.

**Aceptación:** registro personal consultable; distinción consumo/solicitud/pedido/entrega.

## Fase C — Precios (Semana 4)

- API `precios_historicos` con vigencia.
- Cálculo cantidad × precio en solicitudes y FormatoPedido.
- Totales dinero por área/mes/año.

**Aceptación:** piloto café + productos clave con dinero automático.

## Fase D — Inventario (Semana 5)

- API inventario: físico, reserva, mínimo, comprometido.
- Detección quiebre de reserva al pedir/aprobar.
- UI separando stock debido (plan) vs reserva (inventario).

**Aceptación:** alerta de riesgo de quiebre (antes del semáforo formal).

## Fase E — Alertas y semáforo (Semanas 6–7)

- `PromedioHistoricoService` desde entregas históricas.
- `AlertaService` con umbrales `configuracion_alertas`.
- UI panel alertas + semáforo por producto/mes en ConsumoAnio.

**Aceptación:** caso café — exceso vs promedio genera alerta amarilla/roja calculada.

## Fase F — Dashboard (Semana 8)

- Resumen por áreas, alertas, dinero, top productos.
- Gráficos consumo vs promedio (piloto).

## Fase G — Exportación (Semana 9)

- ConsumoAnio export: existencias, dinero, alertas opcionales.
- Tests consistencia UI ↔ export.

## Fase H — Cierre (Semana 10)

- E2E, documentación usuario, re-auditoría de cumplimiento.

## MVP rápido (3 semanas)

1. Fase A completa.
2. Solicitudes MVP (Fase B reducida).
3. Alertas solo café + 1 área (Fase E reducida).
4. Panel contadores simple.

## Próximo sprint sugerido

**Sprint 1 (5 días): solo Fase A** — import histórico + informe calidad + endpoint resumen. Sin tocar módulos core.
