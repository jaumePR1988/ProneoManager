# Análisis de Tareas Pendientes (Próxima Sesión)

## 1. Posicionamiento PDF (Firma y Datos)
**Problema:** La firma aparece desplazada respecto a la línea visual, y estamos usando "parches" (offsets manuales) en lugar de confiar en la caja.
**Análisis:**
- El código actual *sí* busca `box_firma`.
- Si la firma salía alta, es muy probable que **la caja invisible del campo de formulario (Form Field) esté mal colocada en el PDF original** (más arriba de la línea visual).
- **Acción requerida:**
  1. No adivinar más. Añadiré un log que imprima las coordenadas exactas `(X, Y, Width, Height)` que el sistema detecta para `box_firma`.
  2. Si las coordenadas dicen que la caja está alta, el problema es la plantilla PDF. Te pediré que la abras en un editor y bajes la caja azul hasta la línea.
  3. Si la caja está bien en el PDF pero el código la lee mal, ajustaremos la lógica de coordenadas (origen Y en PDF suele ser abajo-izquierda).

## 2. Auto-refresco del Contrato
**Problema:** Al firmar, la lista no se actualiza sola. Requiere F5.
**Análisis del fallo:**
- Se implementó una "actualización optimista" (`setPlayer` con el nuevo documento).
- **Hipótesis:** Es posible que el listener `onSnapshot` de Firestore se dispare justo después con la versión "vieja" de los datos (antes de que la Cloud Function termine de escribir) y sobrescriba nuestro cambio local.
- **Acción requerida:** Verificar si `generateAndSignContract` devuelve la estructura exacta que esperamos y ajustar el `merge` de datos en `PlayerPortal` para que no se machaque si el documento ya existe localmente.

## 3. Bug Subida de Fotos (Falla al segundo intento)
**Problema:** Funciona la primera vez, pero si quieres subir otra (o la misma), falla o no hace nada hasta refrescar.
**Análisis:**
- **Causa probable:** El `input type="file"` HTML mantiene el valor del archivo seleccionado. Si intentas subir el mismo archivo (o si el evento `onChange` no se resetea), el navegador no dispara el evento de nuevo.
- O bien, el estado `uploading` se queda "pegado" en `true` si hay un error silencioso.
- **Acción requerida:**
  - Asegurar que limpiamos el valor del input (`e.target.value = ''`) después de cada intento (éxito o fallo).
  - Revisar los bloques `catch` para asegurar que `setUploading(false)` siempre se ejecuta.

---
**Plan para mañana:**
1. Debuggear coordenadas PDF (logs).
2. Arreglar el `value` del input de fotos.
3. Blindar la actualización del contrato en el frontend.
