# ✅ Verificación Rápida de Despliegue

## 🔧 Diagnóstico Rápido

### 1. **Verificar Variables de Entorno**

En tu terminal local, verifica qué tienes configurado:

```bash
# Ver tu configuración actual
echo "NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL:-'NO CONFIGURADO'}"
```

**En Vercel**: Ve a Settings → Environment Variables y verifica:
- `OPENROUTER_API_KEY` → debe existir
- `NEXT_PUBLIC_BASE_URL` → debe ser `https://tu-app.vercel.app`

### 2. **Test de URL de Imagen**

Verifica que las imágenes son accesibles públicamente:

```bash
# Prueba esta URL en tu navegador:
https://tu-app.vercel.app/products/camiseta-blanca-1.jpg
```

Debería mostrar la imagen. Si no se ve:
- ❌ Las imágenes no están en tu repo
- ❌ La ruta es incorrecta

### 3. **Ver Logs en Tiempo Real**

En Vercel:
1. Ve a tu proyecto
2. Click en "Logs" (arriba)
3. Haz una prueba de try-on
4. Busca estos mensajes:

**✅ Correcto:**
```
🔧 [timestamp] Cargando imagen del producto desde: https://tu-app.vercel.app/products/...
✅ [timestamp] Imagen del producto cargada desde URL
✅ [timestamp] Try-on completado exitosamente
```

**❌ Error:**
```
⚠️ [timestamp] Error cargando desde URL: ...
❌ [timestamp] No se pudo cargar la imagen del producto
```

---

## 🐛 Errores Comunes y Soluciones Inmediatas

### Error 1: "No se pudo cargar la imagen del producto"

**Causa más común**: `NEXT_PUBLIC_BASE_URL` no configurado o incorrecto.

**Fix en 2 minutos**:
1. Ve a Vercel Dashboard → tu proyecto
2. Settings → Environment Variables
3. Agrega/edita: `NEXT_PUBLIC_BASE_URL` = `https://TU-DOMINIO.vercel.app`
4. Guarda
5. Vercel redesplegará automáticamente (~2 min)
6. Prueba de nuevo

### Error 2: "404 Not Found" al cargar imagen

**Causa**: Las imágenes no están en el repo o ruta incorrecta.

**Fix**:
```bash
# Verifica que existan localmente
ls -la public/products/*.jpg

# Si existen, asegúrate de hacer commit
git add public/products/
git commit -m "Add product images"
git push
```

### Error 3: "TypeError: fetch failed"

**Causa**: URL malformada o `NEXT_PUBLIC_BASE_URL` tiene `/` al final.

**Fix**: En Vercel variables, asegúrate que sea:
- ✅ `https://tu-app.vercel.app`
- ❌ `https://tu-app.vercel.app/`

### Error 4: Timeout después de 10 segundos

**Causa**: Vercel Hobby plan tiene límite de 10s, pero nuestro proceso toma más.

**Fix**: Crea `vercel.json`:
```json
{
  "functions": {
    "src/app/**/*.{ts,tsx}": {
      "maxDuration": 60
    }
  }
}
```

Commit y push este archivo.

---

## 🧪 Test Paso a Paso

Sigue estos pasos EN ORDEN:

### **Test 1: Vercel está funcionando**
```bash
curl https://tu-app.vercel.app
```
Debe retornar HTML (la homepage).

### **Test 2: Imagen pública accesible**
```bash
curl -I https://tu-app.vercel.app/products/camiseta-blanca-1.jpg
```
Debe retornar `200 OK` y `content-type: image/jpeg`.

### **Test 3: Variables configuradas**
En Vercel Dashboard:
- Settings → Environment Variables
- Debe haber al menos 2 variables
- `OPENROUTER_API_KEY` y `NEXT_PUBLIC_BASE_URL`

### **Test 4: Try-on funcional**
1. Abre tu app en navegador
2. Selecciona producto ID "1" (Campera deportiva)
3. Click "Probar virtualmente"
4. Sube una foto clara de una persona
5. Click "Probar la ropa"
6. Espera 15-30 segundos
7. Debe aparecer imagen generada (no error)

---

## 📋 Checklist de Deployment Exitoso

Marca cada item cuando esté completo:

**Pre-deployment:**
- [ ] Código actualizado con el fix de `loadProductImage`
- [ ] Imágenes en `public/products/` committed al repo
- [ ] `.env.example` actualizado con variables correctas

**En Vercel Dashboard:**
- [ ] `OPENROUTER_API_KEY` configurado (Settings → Environment Variables)
- [ ] `NEXT_PUBLIC_BASE_URL` configurado (Settings → Environment Variables)
- [ ] Deployment exitoso (sin errores en build)

**Tests funcionales:**
- [ ] Homepage carga correctamente
- [ ] Productos se muestran con imágenes
- [ ] Modal de try-on se abre
- [ ] Puedo subir una foto
- [ ] Try-on genera resultado (sin error)
- [ ] Puedo descargar el resultado
- [ ] No hay errores en Vercel Logs

---

## 🚀 Si Todo Falla: Reset Completo

Si nada funciona, prueba este reset:

```bash
# 1. Borra deployment en Vercel (opcional)
# Ve a Settings → Delete Project (solo si quieres empezar de cero)

# 2. Re-verifica tu código local
git status
git pull origin main

# 3. Verifica variables locales
cat .env.local

# 4. Prueba localmente
npm run dev
# o
bun dev

# 5. Si funciona local pero no en Vercel:
#    - Revisa que todas las imágenes estén en el repo
#    - Revisa variables de entorno en Vercel
#    - Revisa logs de build en Vercel
```

---

## 💡 Tip Final

El error más común es simplemente que **NEXT_PUBLIC_BASE_URL no está configurado en Vercel**.

**Solución en 1 línea**:
```
Ve a Vercel → Settings → Environment Variables → Add → 
Name: NEXT_PUBLIC_BASE_URL
Value: https://tu-dominio.vercel.app
```

¡Listo! 🎉
