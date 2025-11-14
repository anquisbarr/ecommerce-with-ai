# 🚀 Despliegue en Vercel - Guía Completa

## ⚠️ Problema Común: "No se pudo cargar la imagen del producto"

Este error ocurre cuando **NEXT_PUBLIC_BASE_URL** no está configurado correctamente en Vercel.

---

## ✅ Solución Paso a Paso

### 1. **Configurar Variables de Entorno en Vercel**

Ve a tu proyecto en Vercel Dashboard → Settings → Environment Variables y agrega:

```bash
# REQUERIDO: OpenRouter API Key
OPENROUTER_API_KEY=tu_openrouter_api_key_aqui

# REQUERIDO: URL de tu aplicación en Vercel
NEXT_PUBLIC_BASE_URL=https://tu-app.vercel.app
```

**⚠️ IMPORTANTE**: 
- `NEXT_PUBLIC_BASE_URL` debe ser la URL completa de tu app (ej: `https://ecommerce-ai.vercel.app`)
- NO incluyas `/` al final
- Esta variable es necesaria para cargar las imágenes de productos en el try-on

### 2. **Obtener tu OpenRouter API Key**

1. Ve a [OpenRouter](https://openrouter.ai/keys)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API key
4. Cópiala y úsala como `OPENROUTER_API_KEY`

### 3. **Desplegar el Código**

```bash
git add .
git commit -m "Fix: Vercel deployment - priorizar carga por URL"
git push origin main
```

Vercel detectará el push automáticamente y desplegará.

### 4. **Obtener tu URL de Vercel**

Después del primer despliegue:

1. Ve a tu proyecto en Vercel Dashboard
2. Copia la URL de producción (ejemplo: `https://tu-app.vercel.app`)
3. **IMPORTANTE**: Actualiza la variable `NEXT_PUBLIC_BASE_URL` con esta URL
4. Vercel redesplegará automáticamente

---

## 🔍 Verificar que Funciona

### **Test 1: Verificar Variables de Entorno**

En Vercel Dashboard → Settings → Environment Variables, debes tener:
- ✅ `OPENROUTER_API_KEY` (valor oculto)
- ✅ `NEXT_PUBLIC_BASE_URL` (debe mostrar tu URL de Vercel)

### **Test 2: Probar Try-On Virtual**

1. Abre tu app en Vercel: `https://tu-app.vercel.app`
2. Selecciona un producto
3. Haz clic en "Probar virtualmente"
4. Sube una foto
5. Debe funcionar sin errores

### **Test 3: Revisar Logs**

En Vercel Dashboard → Logs, busca:
```bash
✅ "Imagen del producto cargada desde URL"
✅ "Try-on completado exitosamente"
```

NO deberías ver:
```bash
❌ "No se pudo cargar la imagen del producto"
❌ "Error cargando desde URL"
```

---

## 🐛 Solución de Problemas

### **Error: "No se pudo cargar la imagen del producto"**

**Causa**: `NEXT_PUBLIC_BASE_URL` no está configurado o está mal configurado.

**Solución**:
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Verifica que `NEXT_PUBLIC_BASE_URL` existe
3. Debe ser: `https://tu-app.vercel.app` (sin `/` al final)
4. Si está mal, corrígelo y redespliega

### **Error: "API key inválida" o errores de OpenRouter**

**Causa**: `OPENROUTER_API_KEY` no está configurado o es inválido.

**Solución**:
1. Ve a [OpenRouter](https://openrouter.ai/keys)
2. Verifica que tu API key es válida
3. Actualízala en Vercel Dashboard → Settings → Environment Variables
4. Redespliega

### **Error: Las imágenes de productos no se ven en la página principal**

**Causa**: Esto es normal si las rutas de las imágenes son relativas.

**Solución**: Las imágenes en `/public/products/` se sirven automáticamente por Vercel. Si no se ven:
1. Verifica que las imágenes existen en tu repo en `public/products/`
2. Las rutas en `src/lib/mock-data.ts` deben ser `/products/nombre.jpg` (con `/` al inicio)
3. Haz commit y push de las imágenes si no están en el repo

### **Las imágenes generadas (try-on) tardan mucho**

**Causa**: La generación de imágenes con IA toma tiempo (~15-30 segundos).

**Esto es normal**. El proceso incluye:
1. Subir tu foto
2. Cargar imagen del producto
3. Enviar ambas a OpenRouter/Gemini
4. Generar 3 versiones con IA
5. Recibir y mostrar resultados

---

## 📊 Arquitectura en Vercel

```
Usuario → Frontend (Next.js en Vercel Edge)
            ↓
         Server Action (Vercel Serverless Function)
            ↓
         1. Fetch imagen producto desde /public (CDN)
         2. Convertir foto usuario a base64
         3. Enviar ambas a OpenRouter API
            ↓
         OpenRouter → Google Gemini 2.5 Flash Image
            ↓
         Respuesta con data URL (base64)
            ↓
         Frontend muestra resultado
```

**Clave**: En Vercel, los archivos de `/public/` se sirven desde CDN, NO desde sistema de archivos. Por eso usamos `fetch()` para cargarlos, no `fs.readFileSync()`.

---

## ✨ Optimizaciones Recomendadas

### **1. Configurar Dominio Personalizado (Opcional)**

Si tienes un dominio propio:
1. Ve a Vercel Dashboard → Settings → Domains
2. Agrega tu dominio (ej: `ecommerce-ai.tudominio.com`)
3. **Actualiza `NEXT_PUBLIC_BASE_URL`** con tu nuevo dominio
4. Redespliega

### **2. Configurar Timeouts**

En `vercel.json` (crea este archivo si no existe):
```json
{
  "functions": {
    "src/actions/try-on.ts": {
      "maxDuration": 60
    }
  }
}
```

Esto aumenta el timeout a 60 segundos para la función de try-on (útil para imágenes grandes).

### **3. Habilitar Edge Runtime (Avanzado)**

Para mejor rendimiento global, puedes usar Edge Runtime, pero requiere cambios en el código.

---

## 🎯 Checklist Final

Antes de considerar el despliegue completo:

- [ ] `OPENROUTER_API_KEY` configurado en Vercel
- [ ] `NEXT_PUBLIC_BASE_URL` configurado con URL de Vercel
- [ ] Imágenes de productos existen en `public/products/`
- [ ] Try-on funciona correctamente (test completo)
- [ ] Sin errores en Vercel Logs
- [ ] Descarga de imágenes funciona
- [ ] Compartir funciona en móviles (si aplica)

---

## 📞 Soporte

Si después de seguir esta guía aún tienes problemas:

1. **Revisa los logs** en Vercel Dashboard → Logs
2. **Verifica las variables** de entorno están correctas
3. **Prueba localmente** con las mismas variables:
   ```bash
   OPENROUTER_API_KEY=tu_key NEXT_PUBLIC_BASE_URL=http://localhost:3000 npm run dev
   ```
4. **Comparte el error específico** con logs completos

---

## 🎉 ¡Listo!

Tu aplicación ahora debería funcionar perfectamente en Vercel con:
- ✅ Try-on virtual funcional
- ✅ Carga de imágenes desde CDN
- ✅ Generación de resultados con IA
- ✅ Descarga y compartir funcional

**URL de ejemplo**: `https://tu-app.vercel.app`
