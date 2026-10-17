# Painel

Painel de casa para um tablet parado: **hora, tempo, agenda da semana e nível do rio Itajaí-Açu**, em letras grandes e de contraste alto, pensado para pessoas idosas e com baixa visão. Tudo é configurável na própria tela (tema, letras, cidade, Google Agenda, lembretes, descanso).

```
painel/
├─ public/            ← o painel (é isto que vai para o tablet)
│  ├─ index.html, css/, js/, assets/ (fontes, ícones), vendor/
│  ├─ deploy.json     ← endereço do servidor e padrões do primeiro uso
│  └─ river.json      ← cópia do nível do rio (renovada automaticamente)
├─ worker/index.js    ← servidor gratuito (Cloudflare) que libera o Google Agenda
├─ tools/             ← servidor local, testes e verificação de contraste
├─ .github/workflows/ ← publica no GitHub Pages e renova o rio a cada 15 min
├─ iniciar.bat        ← abre o painel no seu PC (para testar)
└─ DESIGN.md          ← pesquisa e decisões de design (com fontes)
```

## 1. Ver no seu PC

Dê dois cliques em **iniciar.bat** (precisa do Python instalado). Abre em http://localhost:8765/.
Para abrir direto a tela de configurações: http://localhost:8765/#config

## 2. Colocar no ar (para o tablet)

O tablet precisa abrir o painel por um endereço na internet. São duas peças gratuitas:

| Peça | Para quê | Onde |
|---|---|---|
| **Site** (GitHub Pages) | hospeda o painel e renova o nível do rio a cada 15 min | GitHub |
| **Servidor da agenda** (Cloudflare Worker) | deixa o painel ler o seu Google Agenda | Cloudflare |

### 2.1 Site no GitHub Pages
1. Crie um repositório **público** no GitHub e envie esta pasta.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Na aba **Actions**, rode **Publicar painel** uma vez (depois roda sozinho a cada 15 min).
4. O endereço fica algo como `https://SEU-USUARIO.github.io/painel/`.

> Por que o rio passa pelo GitHub? O servidor da Defesa Civil de Blumenau manda o certificado incompleto: o navegador não pode ler direto (sem CORS) e o Cloudflare também recusa. O job do GitHub baixa o arquivo e o publica junto com o painel.

### 2.2 Servidor da agenda (Cloudflare Worker)
1. Crie uma conta gratuita em cloudflare.com.
2. Nesta pasta, no terminal: `npx wrangler login` e depois `npx wrangler deploy`.
3. Ele devolve um endereço como `https://painel.SEU-NOME.workers.dev`.
4. Abra `public/deploy.json` e coloque esse endereço em `"proxy"`:
   ```json
   { "proxy": "https://painel.SEU-NOME.workers.dev", "defaults": {} }
   ```
   (Dá para pôr em `"defaults"` também a cidade, o tema etc. do primeiro uso.) Faça o commit; o site se atualiza sozinho.

O Worker só aceita endereços `calendar.google.com/calendar/ical/…` e não guarda nada.

## 3. Ligar o Google Agenda

1. No computador: **calendar.google.com → ⚙ Configurações → (sua agenda) → "Endereço secreto no formato iCal"** → copiar.
2. No tablet: **segure a engrenagem (canto inferior direito) por 1 segundo → Agenda → Endereço secreto**, cole e toque em **Testar agora**.

Com isso, tudo que a Alexa adicionar na agenda ("Alexa, adicione dentista na quinta às 9h") aparece no painel em cerca de 1 minuto. O endereço secreto fica só neste tablet; quem o tiver vê a agenda, então não compartilhe.

*Alternativa:* "Agenda pública" (e-mail da agenda + chave de API do Google). É mais simples, mas qualquer pessoa com o link vê seus compromissos. O login "Entrar com Google" não foi usado de propósito: o Google bloqueia login dentro de WebView e a sessão expira em 1 hora, ruim para um painel sempre ligado.

## 4. Tablet com Fully Kiosk Browser (recomendado)

Instale o **Fully Kiosk Browser** (versão PLUS para movimento e interface JavaScript). Os nomes das opções podem variar um pouco conforme a versão:

- **Web Content Settings → Start URL:** o endereço do painel.
- **Kiosk Mode / Device Management:** ligue o modo quiosque; **Keep Screen On** ligado.
- **Motion Detection (PLUS):** *Enable Visual Motion Detection* e *Turn Screen On on Motion* (a tela acende quando alguém passa na frente).
- **Advanced Web Settings → Enable JavaScript Interface:** o painel passa a acordar do descanso quando o Fully vê movimento. (Ligue só para sites em que você confia.)
- Se quiser que o tablet **apague a tela** no descanso: ligue em **Configurações → Tela → Apagar a tela do tablet no descanso** e use o **Screen Off Timer** do Fully.
- Toque na tela também acorda.

Sem Fully, abra no Chrome → ⋮ → **Adicionar à tela inicial** (abre em tela cheia). O painel pede ao navegador para manter a tela ligada.

## 5. Configurações (segure a engrenagem 1 s)

- **Aparência:** 5 temas (Noite, Papel, Alto contraste, Oceano, Floresta), 4 combinações de letra, tamanho das letras, lado do relógio (útil para perda de visão de um lado), 24 h, nome na saudação, ícones animados, modo leve.
- **Cidade e tempo:** busca de cidade, próximos dias ou manhã/tarde/noite, frase amiga ("leve o guarda-chuva").
- **Agenda:** Google Agenda e teste de conexão.
- **Lembretes:** remédios e rotinas diárias, sem precisar do Google.
- **Rio:** liga/desliga o nível do Itajaí-Açu (dados oficiais da Defesa Civil de Blumenau).
- **Tela:** descanso, modo noite, integração com o Fully Kiosk.
- **Avançado:** endereço do servidor, copiar configurações para outro aparelho (código), voltar ao padrão.

## 6. Testes

```
node tools/test-ics.js        # leitor de agenda (.ics, repetições, fusos, cancelados)
node tools/contrast.js        # contraste WCAG de todos os temas (texto ≥ 7:1)
node tools/make-fixture.js    # gera uma agenda de teste com datas de hoje
```

## 7. O que foi e o que não foi testado

- Testado: interface em 5 temas, telas 4:3, 16:10, 16:9 e 2:1; letras grandes e layout espelhado; modo descanso; configurações (busca de cidade, lembretes, código, tema/fonte); leitura de agenda `.ics` (fuso, dia inteiro, repetições) ponta a ponta através do servidor; Worker localmente (`wrangler dev`): ping, trava de segurança e arquivos.
- **Não testado:** em um tablet de verdade; o Worker no ar na Cloudflare; o Google Agenda real (usei um `.ics` equivalente); os eventos do Fully Kiosk (`onMotion` etc. seguem a documentação oficial).
- O nível do rio depende do que a Defesa Civil publica. Se a leitura ficar com mais de 3 horas, o painel avisa "Dado antigo".

## Créditos
Previsão: Open-Meteo. Rio: AlertaBLU / Defesa Civil de Blumenau. Ícones do tempo: [Meteocons](https://github.com/basmilius/meteocons) (MIT). Ícones: [Lucide](https://lucide.dev) (ISC). Fontes (licença OFL): Fraunces, Atkinson Hyperlegible Next, Lexend, Literata. Leitor de agenda: [ical.js](https://github.com/kewisch/ical.js) (MPL 2.0).
