# BizScan — Diagnóstico Empresarial con IA

Sistema completo para analizar el funcionamiento interno y externo de empresas,
identificar oportunidades de mejora, correcciones urgentes y automatizaciones posibles.

## Cómo funciona

```
Cliente llena el formulario → envía → vos lo analizás con 1 clic → informe completo
```

1. **Formulario público** (`/`) — El cliente completa 6 pasos con info de su empresa
2. **Dashboard privado** (`/dashboard.html`) — Vos ves las consultas y analizás con IA
3. **Informe generado** — FODA, mejoras, correcciones, automatizaciones, plan de acción y KPIs

---

## Instalación local (desarrollo)

### Requisitos
- Node.js 18 o superior
- Cuenta en [Anthropic Console](https://console.anthropic.com) (para la API key)

### Pasos

```bash
# 1. Descomprimir y entrar a la carpeta
cd bizscan

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Abrir .env y completar:
#   ANTHROPIC_API_KEY=sk-ant-api03-...
#   DASHBOARD_PASSWORD=tu_contraseña_segura

# 4. Iniciar el servidor
npm start

# 5. Abrir en el navegador
# Formulario clientes: http://localhost:3000
# Dashboard analista:  http://localhost:3000/dashboard.html
```

---

## Deploy en Railway (recomendado — gratis para empezar)

### Paso 1: Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Crear repo en github.com y hacer push
git remote add origin https://github.com/TU_USUARIO/bizscan.git
git push -u origin main
```

### Paso 2: Deploy en Railway
1. Entrar a [railway.app](https://railway.app) y crear cuenta
2. Clic en **"New Project"** → **"Deploy from GitHub repo"**
3. Seleccionar el repositorio `bizscan`
4. Railway detecta automáticamente que es Node.js

### Paso 3: Configurar variables de entorno en Railway
1. En el proyecto de Railway → **"Variables"**
2. Agregar:
   - `ANTHROPIC_API_KEY` = `sk-ant-api03-...`
   - `DASHBOARD_PASSWORD` = `tu_contraseña_segura`
3. Railway reinicia automáticamente

### Paso 4: ¡Listo!
Railway te da una URL como `https://bizscan-production.up.railway.app`
- Formulario: `https://tu-app.up.railway.app`
- Dashboard: `https://tu-app.up.railway.app/dashboard.html`

> **Costo:** Railway tiene un plan gratuito con $5 de crédito/mes, suficiente para uso moderado.

---

## Deploy en Render (alternativa gratuita)

1. Entrar a [render.com](https://render.com) y crear cuenta
2. **"New Web Service"** → conectar repositorio de GitHub
3. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. En **"Environment Variables"** agregar `ANTHROPIC_API_KEY` y `DASHBOARD_PASSWORD`
5. Deploy → URL automática

---

## Deploy en VPS (máximo control)

```bash
# En tu servidor (Ubuntu/Debian)
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar/subir el proyecto
git clone https://github.com/TU_USUARIO/bizscan.git /var/www/bizscan
cd /var/www/bizscan
npm install

# Configurar .env
cp .env.example .env
nano .env  # Completar API key y contraseña

# Usar PM2 para que quede corriendo siempre
npm install -g pm2
pm2 start server.js --name bizscan
pm2 startup  # Para que reinicie con el servidor
pm2 save

# Nginx como proxy reverso (recomendado)
# Ver documentación de Nginx para configurar dominio propio
```

---

## Estructura del proyecto

```
bizscan/
├── server.js          ← Servidor Express (backend)
├── package.json
├── .env.example       ← Template de variables de entorno
├── .env               ← Tu configuración (NO commitear)
├── data/              ← Consultas guardadas (JSON por consulta)
│   └── *.json
└── public/
    ├── index.html     ← Formulario para clientes
    └── dashboard.html ← Panel del analista
```

---

## Flujo de uso

### Para vos (analista):
1. Compartís la URL del formulario con el cliente
2. El cliente llena el formulario en ~10 minutos
3. Abrís `/dashboard.html`, ingresás la contraseña
4. Ves la consulta en la lista → clic en **"Analizar con IA"**
5. En ~60 segundos tenés el informe completo
6. Podés imprimirlo o exportarlo a PDF desde el navegador

### Para el cliente:
1. Abre el formulario en el navegador (cualquier dispositivo)
2. Completa los 6 pasos (info general, áreas, procesos, herramientas, problemas, objetivos)
3. Opcionalmente adjunta un PDF con más información
4. Envía → recibe confirmación con ID de consulta

---

## Seguridad

- La API key de Anthropic **nunca** sale del servidor
- El dashboard está protegido con contraseña
- Las consultas se guardan localmente en `/data/*.json`
- Para producción: usar HTTPS (Railway y Render lo hacen automáticamente)

---

## Costos estimados de la API

Usando `claude-sonnet-4-6`:
- Costo aproximado por análisis: **USD 0.01 - 0.05**
- Para 50 análisis mensuales: **~USD 1-3**

---

## Personalización

- **Logo/marca:** Cambiar "BizScan" por tu nombre en `public/index.html` y `public/dashboard.html`
- **Preguntas del formulario:** Editar los pasos en `public/index.html`
- **Prompt de análisis:** Modificar la función `buildPrompt()` en `server.js`
- **Modelo:** Cambiar `claude-sonnet-4-6` por `claude-opus-4-6` para análisis más profundos

---

## Soporte

Si el análisis falla, revisar:
1. Que `ANTHROPIC_API_KEY` esté correctamente configurada
2. Que la cuenta tenga créditos disponibles en Anthropic Console
3. Los logs del servidor: `pm2 logs bizscan` (VPS) o ver logs en Railway/Render
