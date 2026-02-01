# 📝 Tareas Pendientes - Sistema de Renovaciones

## 1. Subir Plantillas PDF (Imprescindible) 📄
Para que la firma funcione, necesitas subir los contratos base a **Firebase Storage**.

1.  Ve a la consola de Firebase > Storage.
2.  Crea una carpeta llamada `templates`.
3.  Sube dentro dos archivos PDF con **estos nombres exactos**:
    *   `contract_adult.pdf` (Para mayores de 18)
    *   `contract_minor.pdf` (Para menores de 18)

> **Nota:** Si usas Acrobat o similar, puedes añadir campos de formulario con estos nombres para que se rellenen solos: `nombre_jugador`, `dni`, `calle`, `cp`, `ciudad`, `provincia`.

## 2. Gestión de Errores (Respuesta a tu duda) 🔄
**¿Qué pasa si un jugador se equivoca al firmar?**
Actualmente, al firmar, el sistema **actualiza automáticamente** la fecha de fin de contrato (`+2 años`). Esto hace que la pestaña roja desaparezca.

**Para permitirle repetir el proceso:**
1.  Ve al Panel de Admin > Ficha del Jugador > Proneo.
2.  Cambia manualmente la **"Fecha Fin Agencia"** a una fecha pasada (o bórrala).
3.  Al guardar, la pestaña roja volverá a aparecer en su Portal inmediatamente.
