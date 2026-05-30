import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY environment variable is not defined. AI Post generation will rely on a helpful simulated response.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'MOCK_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// AI post generation endpoint
app.post('/api/generate-post', async (req, res) => {
  try {
    const { texts, productName, id, affiliateLink, platform } = req.body;

    if (!productName) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }

    const compiledTextString = Array.isArray(texts) ? texts.join('\n') : '';

    const systemPrompt = `Você é um Copywriter profissional especialista em criar posts de alta conversão para programas de afiliados (Amazon, Shopee, Magalu, AliExpress, etc.).
O usuário fornecerá dados capturados de um produto comercial, como título, preço, características e um link de afiliado.
Gere uma cópia persuasiva específica para a plataforma selecionada: ${platform}.

Diretrizes gerais:
- Use gatilhos mentais adequados (escassez, urgência, benefício social).
- Formate o texto com espaçamento elegante e emojis relevantes para facilitar a escaneabilidade.
- DESTAQUE claramente o link de afiliado. Caso não tenha sido enviado, coloque uma tag representativa "[INSIRA SEU LINK DE AFILIADO AQUI]".
- Mantenha o tom persuasivo, animado e direto. Evite rodeios desnecessários.
- Escreva estritamente em Português do Brasil (PT-BR).

Regras por plataforma:
- whatsapp: Foco em grupos ou listas de transmissão de ofertas. Texto conciso, direto ao ponto, com destaques em negrito (use asteriscos *texto*), emojis no início de cada linha e apelo claro ao clique no link.
- instagram: Foco em legendas para feed, reels ou stories (neste último caso, chame para clicar no "Link na Bio" ou "Clique no Sticker"). Inclua hashtags estratégicas relacionadas a compras, promoções e ao produto.
- facebook: Texto um pouco mais descritivo, amigável, incentivando o compartilhamento e comentários ("Marque alguém que precisa ver isso").
- pinterest: Título cativante e descrição otimizada para SEO do Pinterest, focada em inspiração e solução de problemas com hashtags relevantes.
- tiktok: Roteiro rápido e dinâmico de vídeo (gancho inicial nos primeiros 3 segundos, benefícios rápidos, chamada para ação clara "Link nos comentários ou perfil").
- kwai: Roteiro divertido e focado em super descontos cotidianos (estilo recomendação sincera e imperdível).

DADOS DO PRODUTO:
ID do Grupo: ${id || 'G1'}
Nome: ${productName}
Textos originais capturados:\n${compiledTextString}
Link de Afiliado: ${affiliateLink || 'Link não fornecido'}`;

    if (!apiKey) {
      // Return a very tailored and helpful simulated mock text if API key is missing
      console.log("Using simulated copy due to missing API key");
      const simulatedResponses: Record<string, string> = {
        whatsapp: `🔥 *OFERTA IMPERDÍVEL COMPROVADA!* 🔥\n\n🚨 *${productName}* com preço incrível detectado!\n\n💵 *O que você vai amar:*\n${texts && texts[0] ? `👉 ${texts[0]}` : '⭐ Alta qualidade recomendada'}\n${texts && texts[1] ? `👉 ${texts[1]}` : '⭐ Facilidade e tecnologia pro seu dia a dia'}\n${texts && texts[2] ? `👉 ${texts[2]}` : '⭐ Custo-benefício de verdade'}\n\n🛒 *Garanta o seu agora antes que acabe:* \n⬇️ CLIQUE NO LINK ABAIXO:⬇️\n🔗 ${affiliateLink || 'https://link-de-afiliado.com'}\n\n⚠️ _Estoque limitado. Corre pra não perder!_`,
        instagram: `✨ Atenção para essa super indicação de hoje! ✨\n\nVocê já conhece o novo *${productName}*? É simplesmente a melhor escolha para quem busca praticidade e durabilidade. 😍\n\n📍 Detalhes que fazem a diferença:\n${texts && texts.map((t: string) => `✅ ${t}`).join('\n') || '✅ Qualidade excepcional\n✅ Prático e moderno'}\n\n👉 Quer garantir o seu pelo menor preço do mercado?\n📌 O link promocional está disponível no *STORY* ou na *BIO*! Corre para conferir enquanto o cupom está ativo.\n\n🔗 ${affiliateLink || 'Link na Bio!'}\n\n#promocao #achadinhos #ofertas #${productName.toLowerCase().replace(/\s+/g, '')} #afiliado #compras`,
        pinterest: `📌 Idéia de compra inteligente: ${productName}\n\nSe você busca otimizar sua rotina e economizar de verdade, precisa ver isso. O ${productName} é ideal para o seu dia a dia e está com uma promoção de arrasar hoje!\n\nClique no Pin e garanta o seu com desconto exclusivo de afiliado!\n\n🔗 ${affiliateLink || 'https://link-de-afiliado.com'}`,
        tiktok: `🎬 **ROTEIRO PARA TIKTOK**\n\n[0-3 segundos - Gancho visual ou na tela: "Não compre o ${productName} sem assistir isso!"]\n\n🔥 Galera! Se você estava esperando o sinal perfeito para investir no seu bem-estar, ele chegou!\n\nOlha só esses detalhes do ${productName}:\n${texts && texts[0] ? `💥 Título: ${texts[0]}` : '⚡ Super prático e direto.'}\n${texts && texts[1] ? `💰 Preço sugerido: ${texts[1]}` : '💥 Desconto surpreendente rolando.'}\n\nCorre no link da minha bio ou fixado aqui nos comentários para garantir o seu com frete rápido!\n\n🔗 Preço Promocional: ${affiliateLink || 'Link no Perfil'}`,
        facebook: `📢 Alerta de Recomendação Sincera! 📢\n\nSe você está precisando de um upgrade, o *${productName}* é exatamente o que você procura. Vale cada centavo! \n\nPor que vale a pena?\n${texts && texts.map((t: string) => `🔹 ${t}`).join('\n') || '🔹 Excelente durabilidade e ótima garantia.'}\n\nMarque aquele amigo ou familiar que precisa ver essa dica preciosa e compartilhe!\n\n🛒 Compre com total segurança pelo link oficial:\n🔗 ${affiliateLink || 'https://link-de-afiliado.com'}\n\n#dicasdeproduto #comprasartigos #promocoes`,
        kwai: `🎥 **ROTEIRO PARA KWAI**\n\n[Áudio entusiasmado]: "Meninas e meninos, para tudo! Olha esse achado incrível de hoje. É o ${productName}!"\n\nTodo mundo está comentando sobre como esse item facilita a vida. E olha que o frete está incrível e com preço superbom!\n\n👉 Aproveite o menor preço clicando no meu link de afiliado disponível na legenda ou no perfil!\n\n🔗 Cupom ativo: ${affiliateLink || 'Link no Perfil'}`
      };

      const customResponse = simulatedResponses[platform] || simulatedResponses['whatsapp'];
      return res.json({ responseText: customResponse });
    }

    const client = getAiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
    });

    const responseText = response.text || 'Desculpe, não consegui processar a cópia no momento. Tente novamente!';
    return res.json({ responseText });

  } catch (error: any) {
    console.error('Error generating post:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao gerar cópia do post.' });
  }
});

// Setup Vite Dev server / Production server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
