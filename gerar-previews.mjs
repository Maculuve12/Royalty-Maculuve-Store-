// Gera páginas estáticas com pré-visualização (imagem + título + frase) para
// partilhar coleções e produtos no WhatsApp:  c/<id>.html  e  p/<id>.html
// Corre automaticamente no GitHub (ver .github/workflows/previews.yml).
import { mkdir, writeFile, rm } from 'node:fs/promises';

const BASE = 'https://maculuve12.github.io/Royalty-Maculuve-Store-/';
const SB_URL = 'https://zrcnwkrvfkykqnhwoklh.supabase.co';
const SB_KEY = 'sb_publishable_PX2HcOTmRmbHLDOT5YuKjg_KBNB6aZc';   // chave pública (só leitura)
const FALLBACK_IMG = 'https://i.ibb.co/ZzNYk6mt/20260625-082120.jpg';

const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plano = t => String(t ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const resumo = (t, max = 150) => {
  t = plano(t);
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
};
const urlImg = x => {
  const u = typeof x === 'string' ? x : (x && (x.url || x.src)) || '';
  return /^https:\/\//.test(u) ? u : '';
};

async function get(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

function pagina({ titulo, descricao, imagem, urlPartilha, destino }) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ROYALTY">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:image" content="${esc(imagem)}">
<meta property="og:url" content="${esc(urlPartilha)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(destino)}">
<script>location.replace(${JSON.stringify(destino)});</script>
</head>
<body><p><a href="${esc(destino)}">Abrir ${esc(titulo)}</a></p></body>
</html>
`;
}

async function main() {
  const colecoes = await get('colecoes?select=id,nome,descricao,imagem_capa,imagens');
  const produtos = await get('produtos?select=id,nome,preco,descricao,imagens,activo&activo=eq.true');

  await rm('c', { recursive: true, force: true });
  await rm('p', { recursive: true, force: true });
  await mkdir('c', { recursive: true });
  await mkdir('p', { recursive: true });

  for (const c of colecoes) {
    const extras = Array.isArray(c.imagens) ? c.imagens : [];
    const img = urlImg(c.imagem_capa) || urlImg(extras[0]) || FALLBACK_IMG;
    await writeFile(`c/${c.id}.html`, pagina({
      titulo: `${plano(c.nome)} | ROYALTY`,
      descricao: resumo(c.descricao) || 'Descubra a história por trás de cada peça.',
      imagem: img,
      urlPartilha: `${BASE}c/${c.id}.html`,
      destino: `${BASE}colecao.html?id=${c.id}`,
    }));
  }

  for (const p of produtos) {
    const imgs = Array.isArray(p.imagens) ? p.imagens : [];
    const img = urlImg(imgs[0]) || FALLBACK_IMG;
    await writeFile(`p/${p.id}.html`, pagina({
      titulo: `${plano(p.nome)} — ${p.preco} MT | ROYALTY`,
      descricao: resumo(p.descricao) || 'Camisetas exclusivas com estilo premium em Moçambique.',
      imagem: img,
      urlPartilha: `${BASE}p/${p.id}.html`,
      destino: `${BASE}loja.html?produto=${p.id}`,
    }));
  }
  console.log(`Geradas ${colecoes.length} coleções e ${produtos.length} produtos.`);
}

main().catch(e => { console.error(e); process.exit(1); });
