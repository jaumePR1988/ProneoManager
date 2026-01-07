# Análisis Funcional para el Manual de Usuario - ProneoManager

Este documento contiene un desglose técnico y funcional de la aplicación web ProneoManager, organizado por módulos tal como aparecen en la interfaz de usuario. Este análisis está diseñado para facilitar la redacción del Manual de Usuario final.

## 1. Visión General y Navegación
La aplicación utiliza un diseño de panel de control (Dashboard) con una barra lateral de navegación dinámica que se adapta según el rol del usuario.

*   **Roles de Usuario Identificados**:
    *   **Director / Admin**: Acceso completo a todos los módulos.
    *   **Tesorero**: Acceso limitado enfocado en administración y visualización.
    *   **Scout / Scout Externo**: Acceso enfocado en el módulo de Scouting y visualización limitada de jugadores.
    *   **Comunicación**: Acceso a herramientas de mensajería (Push).
    *   **Guest**: Acceso de solo lectura muy limitado.

## 2. Análisis por Pestañas (Módulos)

### 2.1. Panel de Control (Dashboard)
**Archivo**: `Dashboard.tsx`
*   **Propósito**: Ofrecer una visión panorámica "de un vistazo" del estado de la agencia.
*   **Funcionalidades Clave**:
    *   **KPIs (Indicadores Clave)**: Muestra contadores en tiempo real de:
        *   Jugadores Activos (En cartera).
        *   Objetivos de Scouting (En seguimiento).
        *   Comisiones Estimadas (Visible solo para roles con permisos financieros).
        *   Contratos Próximos a Vencer (< 6 meses).
    *   **Gráficos**: Distribución de jugadores por Liga.
    *   **Accesos Rápidos**: Botones para añadir jugador o scouting rápidamente.

### 2.2. Futbolistas / Entrenadores (Base de Datos)
**Archivo**: `PlayerModule.tsx`
*   **Propósito**: Gestión principal del inventario de talento de la agencia. Su nombre varía según el deporte seleccionado (ej. "Futbolistas", "Entrenadores").
*   **Funcionalidades Clave**:
    *   **Visualización de Datos**: Tabla densa con información clave (Nombre, Club, Contrato, etc.).
    *   **Importación Masiva**: Herramienta `ExcelImport` para cargas masivas de datos usando plantillas CSV/Excel.
        *   *Nota*: La importación *añade* registros, no sobrescribe los existentes por defecto.
    *   **Filtros Globales**: Búsqueda por texto y selectores de categoría (Fútbol, F. Sala, Femenino).
    *   **Acciones por Registro**: Editar, Ver Detalles, Eliminar.

### 2.3. Scouting
**Archivo**: `ScoutingModule.tsx`
*   **Propósito**: Gestión del "pipeline" de captación de nuevos talentos.
*   **Funcionalidades Clave**:
    *   **Seguimiento**: Lista separada de la base de datos principal para jugadores potenciales.
    *   **"Fichar" (Promoción)**: Funcionalidad para convertir un objetivo de scouting en un jugador activo de la agencia (mueve el registro de colección y cambia su estado).
    *   **Notas e Informes**: Espacio para registrar observaciones técnicas y de seguimiento.
    *   **Gestión de Agentes**: Asignación de scouts responsables a cada objetivo.

### 2.4. Agenda (Calendar)
**Archivo**: `CalendarModule.tsx`
*   **Propósito**: Planificación y visualización de partidos y eventos de seguimiento.
*   **Funcionalidades Clave**:
    *   **Vista Mensual**: Calendario visual con los partidos programados.
    *   **Gestión de Partidos**: Crear, Editar y Eliminar eventos de partido (Rival, Fecha, Hora, Lugar).
    *   **Reporte PDF**: Generación automática de un PDF mensual con la agenda de partidos ("Reporte Mensual"), ideal para compartir con el equipo.

### 2.5. Reportes (Centro de Documentación)
**Archivo**: `ReportsModule.tsx`
*   **Propósito**: Generación de documentos corporativos y copias de seguridad.
*   **Funcionalidades Clave**:
    *   **Dosier Deportivo (Portfolio)**: Genera un PDF visual con el catálogo de jugadores seleccionados, diseñado para presentar a clubes.
    *   **Reporte de Vencimientos**: Informe específico de contratos de agencia próximos a caducar.
    *   **Copia de Seguridad**: **Función Crítica**. Permite descargar toda la base de datos (Jugadores + Scouting) en formato JSON para seguridad.

### 2.6. Administración
**Archivo**: `AdministrationModule.tsx`
*   **Propósito**: Control financiero y de facturación.
*   **Funcionalidades Clave**:
    *   **Control de Cobros**: Tabla desglosada por temporadas (ej. 2025/2026).
    *   **Estado de Pagos**: Seguimiento de facturas al Club y al Jugador (Pendiente, Emitida, Pagada).
    *   **Informe Económico**: Vista resumen de ingresos y proyecciones.

### 2.7. Usuarios
**Archivo**: `UsersModule.tsx`
*   **Propósito**: Gestión de acceso y seguridad del sistema.
*   **Funcionalidades Clave**:
    *   **Aprobación de Cuentas**: Los nuevos usuarios que se registran quedan en estado "Pendiente" hasta que un Admin los aprueba aquí.
    *   **Asignación de Roles**: Cambiar permisos de usuarios (Director, Scout, etc.).
    *   **Restauración de Emergencia**: **Acción Crítica**. Permite subir un archivo JSON de respaldo para *sobrescribir* y restaurar la base de datos completa.

### 2.8. Mi Perfil
**Archivo**: `ProfileModule.tsx`
*   **Propósito**: Gestión de la cuenta personal del usuario logueado.
*   **Funcionalidades Clave**:
    *   Cambio de nombre visible.
    *   Cambio de contraseña.
    *   Actualización de foto de perfil (Avatar).

### 2.9. Comunicaciones (Push)
**Archivo**: `NotificationCenter.tsx`
*   **Propósito**: Envío de notificaciones a la App Móvil.
*   **Funcionalidades Clave**:
    *   **Envío Manual**: Formulario para enviar notificaciones Push (Título + Mensaje).
    *   **Segmentación**: Opción para enviar a "Todos" o filtrar por deporte (Fútbol, F. Sala, etc.).
    *   **Estado de Audiencia**: Muestra cuántos dispositivos tienen tokens activos para recibir mensajes.

### 2.10. Avisos (Centro de Alertas)
**Archivo**: `AvisosModule.tsx`
*   **Propósito**: Sistema inteligente de alertas automáticas.
*   **Funcionalidades Clave**:
    *   **Generación Automática**: El sistema escanea la base de datos diariamente para detectar:
        *   Cumpleaños (Hoy/Mañana).
        *   Fin de Contrato de Agencia (< 6 meses).
        *   Cláusulas Opcionales (Fechas límite de aviso).
        *   Scouting Estancado (> 3 meses sin contacto).
    *   **Acciones**: "Posponer" (Snooze por 24h) o "Completar" (Marcar como hecho).

### 2.11. Ajustes
**Archivo**: `SettingsModule.tsx`
*   **Propósito**: Configuración flexible del sistema de datos.
*   **Funcionalidades Clave**:
    *   **Columnas Dinámicas**: Permite al usuario *añadir nuevos campos* a la base de datos sin necesidad de programación (ej. "Talla de botas").
    *   **Listas del Sistema**: Gestión de las opciones que aparecen en los desplegables (Ligas, Clubes, Posiciones, Marcas).
    *   **Vista Reducida**: Configuración de qué columnas se muestran en la vista simplificada de la tabla de jugadores.
