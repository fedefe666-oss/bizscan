require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DASH_PASS = process.env.DASHBOARD_PASSWORD || 'bizscan2024';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ──────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const token = req.headers['x-dashboard-token'];
  if (token === DASH_PASS) return next();
  res.status(401).json({ error: 'No autorizado' });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function listSubmissions() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); }
      catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getSubmission(id) {
  const fp = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function saveSubmission(data) {
  fs.writeFileSync(path.join(DATA_DIR, `${data.id}.json`), JSON.stringify(data, null, 2));
}

function buildPrompt(form) {
  const areas = (form.areas || []).map((a, i) =>
    `  Área ${i + 1}: ${a.nombre || '—'} | Empleados: ${a.empleados || '—'} | Responsabilidades: ${a.responsabilidades || '—'} | Herramientas: ${a.herramientas || '—'}`
  ).join('\n');

  return `Eres un consultor empresarial senior con expertise en análisis organizacional, optimización de procesos y transformación digital. Analiza la siguiente empresa y genera un diagnóstico completo y accionable.

=== DATOS DE LA EMPRESA ===
Empresa: ${form.empresa || '—'}
Sector: ${form.sector || '—'}
Años de actividad: ${form.anios || '—'}
Total empleados: ${form.empleadosTotal || '—'}
Facturación aprox.: ${form.facturacion || 'No informada'}
Descripción: ${form.descripcion || '—'}

=== ÁREAS Y EQUIPO ===
${areas || '  No especificadas'}

=== PROCESOS Y TAREAS ===
Tareas diarias: ${form.tareasdiarias || '—'}
Tareas semanales: ${form.tareasSemanales || '—'}
Tareas mensuales: ${form.tareasMensuales || '—'}
Tareas repetitivas: ${form.tareasRepetitivas || '—'}
Procesos manuales: ${form.procesosManual || '—'}
Tiempo en tareas administrativas: ${form.tiempoAdmin || '—'}

=== HERRAMIENTAS ACTUALES ===
Software y apps: ${form.softwareActual || '—'}
Sistemas de gestión: ${form.sistemasGestion || '—'}
Comunicación interna: ${form.comunicacion || '—'}
Uso de papel/Excel: ${form.procesosEnPapel || '—'}

=== PROBLEMAS Y CUELLOS DE BOTELLA ===
Problemas conocidos: ${form.problemasConocidos || '—'}
Cuellos de botella: ${form.cuellosBotella || '—'}
Quejas frecuentes: ${form.quejasFrecuentes || '—'}
Dónde se pierde tiempo: ${form.perderTiempo || '—'}

=== OBJETIVOS ===
Objetivo principal: ${form.objetivo || '—'}
Qué quieren automatizar: ${form.quiereAutomatizar || '—'}
Presupuesto: ${form.presupuesto || '—'}
Plazo: ${form.plazo || '—'}
Restricciones: ${form.restricciones || '—'}

=== INSTRUCCIONES ===
Genera un diagnóstico empresarial completo en ESPAÑOL. Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin \`\`\`json. Solo el objeto JSON puro con esta estructura exacta:

{
  "resumen_ejecutivo": "4-5 oraciones con situación actual y visión general",
  "estado_general": "critico|mejorable|bueno|excelente",
  "fortalezas": [{"titulo": "título", "descripcion": "1-2 oraciones"}],
  "debilidades": [{"titulo": "título", "descripcion": "1-2 oraciones"}],
  "oportunidades": [{"titulo": "título", "descripcion": "1-2 oraciones"}],
  "amenazas": [{"titulo": "título", "descripcion": "1-2 oraciones"}],
  "mejoras_proceso": [{"area": "área", "titulo": "título", "descripcion": "qué hacer y cómo", "impacto": "alto|medio|bajo", "dificultad": "alta|media|baja", "plazo": "corto|mediano|largo"}],
  "correcciones_urgentes": [{"titulo": "nombre del problema", "descripcion": "qué está mal y cómo corregirlo", "consecuencia": "qué pasa si no se corrige"}],
  "automatizaciones": [{"proceso": "nombre", "descripcion": "qué automatizar y cómo", "herramienta_sugerida": "herramienta concreta", "ahorro_tiempo": "estimación", "dificultad": "alta|media|baja", "roi": "alto|medio|bajo"}],
  "plan_accion": [{"fase": 1, "nombre": "nombre", "plazo": "Mes 1-2", "responsable": "quién lidera", "acciones": ["acción 1", "acción 2"]}],
  "indicadores": [{"nombre": "KPI", "descripcion": "qué mide", "como_medirlo": "método"}],
  "conclusion": "párrafo final con visión optimista pero realista"
}

Incluye mínimo: 3 items en cada FODA, 5 mejoras de proceso, 3 correcciones urgentes, 5 automatizaciones, 4 fases de plan, 5 indicadores. Sé específico y usa los datos concretos de la empresa.`;
}

// ── PUBLIC: Recibir formulario ────────────────────────────────────────────────
app.post('/api/submit', (req, res) => {
  try {
    const { form, file } = req.body;
    if (!form || !form.empresa) return res.status(400).json({ error: 'Datos incompletos' });

    const submission = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      status: 'pending', // pending | analyzing | done | error
      form,
      file: file || null,
      analysis: null,
      error: null,
    };

    saveSubmission(submission);
    console.log(`[${new Date().toLocaleString()}] Nueva consulta: ${form.empresa} (${submission.id})`);
    res.json({ ok: true, id: submission.id });
  } catch (e) {
    console.error('Submit error:', e);
    res.status(500).json({ error: 'Error al guardar' });
  }
});

// ── AUTH: Verificar contraseña ────────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === DASH_PASS) return res.json({ ok: true, token: DASH_PASS });
  res.status(401).json({ error: 'Contraseña incorrecta' });
});

// ── DASHBOARD: Listar consultas ───────────────────────────────────────────────
app.get('/api/submissions', authRequired, (req, res) => {
  try {
    const all = listSubmissions().map(s => ({
      id: s.id, createdAt: s.createdAt, status: s.status,
      empresa: s.form?.empresa, sector: s.form?.sector,
      empleados: s.form?.empleadosTotal, hasFile: !!s.file,
    }));
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: 'Error al leer consultas' });
  }
});

// ── DASHBOARD: Ver una consulta ───────────────────────────────────────────────
app.get('/api/submissions/:id', authRequired, (req, res) => {
  const s = getSubmission(req.params.id);
  if (!s) return res.status(404).json({ error: 'No encontrada' });
  res.json(s);
});

// ── DASHBOARD: Eliminar consulta ──────────────────────────────────────────────
app.delete('/api/submissions/:id', authRequired, (req, res) => {
  const fp = path.join(DATA_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'No encontrada' });
  fs.unlinkSync(fp);
  res.json({ ok: true });
});

// ── DASHBOARD: Analizar con IA ────────────────────────────────────────────────
app.post('/api/analyze/:id', authRequired, async (req, res) => {
  const submission = getSubmission(req.params.id);
  if (!submission) return res.status(404).json({ error: 'No encontrada' });
  if (!API_KEY) return res.status(500).json({ error: 'API key no configurada en el servidor' });

  // Marcar como analizando
  submission.status = 'analyzing';
  saveSubmission(submission);

  try {
    const prompt = buildPrompt(submission.form);
    let messages;

    if (submission.file && submission.file.type === 'pdf' && submission.file.base64) {
      messages = [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: submission.file.base64 } },
        { type: 'text', text: prompt + '\n\nEl documento adjunto contiene información adicional. Tenla en cuenta.' }
      ]}];
    } else {
      const extra = submission.file?.text ? `\n\nDOCUMENTO ADICIONAL:\n${submission.file.text}` : '';
      messages = [{ role: 'user', content: prompt + extra }];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      submission.status = 'error';
      submission.error = data?.error?.message || 'Error de API';
      saveSubmission(submission);
      return res.status(500).json({ error: submission.error });
    }

    const text = data.content?.map(b => b.text || '').join('') || '';
    const clean = text.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, t =>
      t.replace(/```json\n?/, '').replace(/```$/, '')
    ).trim();

    let analysis;
    try { analysis = JSON.parse(clean); }
    catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) analysis = JSON.parse(match[0]);
      else throw new Error('No se pudo parsear el JSON de la respuesta');
    }

    submission.status = 'done';
    submission.analysis = analysis;
    submission.analyzedAt = new Date().toISOString();
    saveSubmission(submission);

    console.log(`[${new Date().toLocaleString()}] Análisis completado: ${submission.form?.empresa}`);
    res.json({ ok: true, analysis });
  } catch (e) {
    console.error('Analyze error:', e);
    submission.status = 'error';
    submission.error = e.message;
    saveSubmission(submission);
    res.status(500).json({ error: e.message });
  }
});

// ── Fallback ──────────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n  ██████╗ ██╗███████╗███████╗ ██████╗ █████╗ ███╗  ██╗`);
  console.log(`  ██╔══██╗██║╚════██║╚════██║██╔════╝██╔══██╗████╗ ██║`);
  console.log(`  ██████╔╝██║    ██╔╝    ██╔╝╚█████╗ ██║  ╚═╝██╔██╗██║`);
  console.log(`  ██╔══██╗██║   ██╔╝    ██╔╝  ╚═══██╗██║  ██╗██║╚████║`);
  console.log(`  ██████╔╝██║   ██║     ██║  ██████╔╝╚█████╔╝██║ ╚███║`);
  console.log(`  ╚═════╝ ╚═╝   ╚═╝     ╚═╝  ╚═════╝  ╚════╝ ╚═╝  ╚══╝\n`);
  console.log(`  🟢 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  📋 Formulario clientes: http://localhost:${PORT}`);
  console.log(`  📊 Dashboard analista: http://localhost:${PORT}/dashboard.html\n`);
  if (!API_KEY || API_KEY.includes('REEMPLAZAR')) {
    console.log(`  ⚠️  ADVERTENCIA: Configurá ANTHROPIC_API_KEY en el archivo .env\n`);
  }
});
