# Painel

Painel de casa para um tablet parado: **hora, tempo, agenda da semana, nível do rio Itajaí-Açu e avisos da Defesa Civil**, em letras grandes e de contraste alto, pensado para pessoas idosas e com baixa visão. Tudo é configurável na própria tela (tema, letras, cidade, Google Agenda, lembretes, descanso).

```
painel/
├─ public/            ← o painel (é isto que vai para o tablet)
│  ├─ index.html, css/, js/, assets/ (fontes, ícones), vendor/
│  ├─ deploy.json     ← endereço do servidor e padrões do primeiro uso
│  ├─ river.json      ← cópia de reserva do nível do rio (o GitHub renova a cada 15 min)
│  └─ alerts.json     ← cópia de reserva dos avisos da Defesa Civil (idem)
├─ worker/index.js    ← servidor gratuito (Cloudflare): Google Agenda e Defesa Civil ao vivo
├─ tools/             ← servidor local, testes, verificação de contraste e o download da Defesa Civil
├─ .github/workflows/ ← testa, publica no GitHub Pages e renova as cópias a cada 15 min
├─ iniciar.bat        ← abre o painel no seu PC (para testar)
└─ DESIGN.md          ← pesquisa e decisões de design (com fontes)
```

## Endereços deste projeto

| O quê | Onde |
|---|---|
| Painel (é o que vai no Start URL do tablet) | https://gabpaesschulz.github.io/painel/ |
| Configurações direto | https://gabpaesschulz.github.io/painel/#config |
| Código | https://github.com/gabpaesschulz/painel |
| Servidor da agenda (Cloudflare) | https://painel.gabpaesschulz.workers.dev |
| Pasta no PC | `C:\Users\gabri\painel` |

O site é público, mas **a agenda não está nele**: o endereço secreto do Google fica guardado só em cada aparelho onde foi colado. Quem abre o link vê só o tempo, o rio e compromissos de exemplo.

## 1. Ver no seu PC

Dê dois cliques em **iniciar.bat** (precisa do Python instalado). Abre em http://localhost:8765/.
Para abrir direto a tela de configurações: http://localhost:8765/#config

## 2. Colocar no ar (para o tablet)

O tablet precisa abrir o painel por um endereço na internet. São duas peças gratuitas:

| Peça | Para quê | Onde |
|---|---|---|
| **Site** (GitHub Pages) | hospeda o painel e guarda uma cópia de reserva do rio e dos avisos | GitHub |
| **Servidor da agenda** (Cloudflare Worker) | deixa o painel ler o seu Google Agenda e lê o rio e os avisos da Defesa Civil na hora | Cloudflare |

### 2.1 Site no GitHub Pages
1. Crie um repositório **público** no GitHub e envie esta pasta.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Na aba **Actions**, rode **Publicar painel** uma vez (depois roda sozinho a cada 15 min).
4. O endereço fica algo como `https://SEU-USUARIO.github.io/painel/`.

> **De onde vêm o rio e os avisos.** O navegador não pode ler a Defesa Civil direto: falta permissão (CORS) e o servidor deles manda a cadeia de certificados incompleta. Por isso o painel busca **duas fontes ao mesmo tempo** e fica com a mais nova: o servidor do Cloudflare (`/api/river` e `/api/alerts`, que leem na hora; o Cloudflare completa o certificado sozinho, testado em 17/10/2026) e a cópia que o GitHub publica junto com o site a cada 15 min (`tools/fetch_data.py`).
>
> Se as duas pararem, o painel não finge que está tudo bem: o rio mostra "Dado antigo" e os avisos mostram "sem atualizar", sempre com a hora do último dado. Para saber quando o GitHub baixou pela última vez, abra `…/painel/status.json`.
>
> O agendamento do GitHub atrasa às vezes e **é desligado sozinho depois de 60 dias sem commits** (repositório público). Se isso acontecer, entre em **Actions → Publicar painel → Enable workflow**. Enquanto isso, o servidor do Cloudflare continua dando conta.

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

Sempre que `worker/index.js` mudar, rode `npx wrangler deploy` de novo (o GitHub não publica o Worker).

## 3. Ligar o Google Agenda

1. No computador: **calendar.google.com → ⚙ Configurações → (sua agenda) → "Endereço secreto no formato iCal"** → copiar.
2. No tablet: **segure a engrenagem (canto inferior direito) por 1 segundo → Agenda → Endereço secreto**, cole e toque em **Testar agora**.

Com isso, tudo que a Alexa adicionar na agenda ("Alexa, adicione dentista na quinta às 9h") aparece no painel em cerca de 1 minuto. O endereço secreto fica só neste tablet; quem o tiver vê a agenda, então não compartilhe.

*Alternativa:* "Agenda pública" (e-mail da agenda + chave de API do Google). É mais simples, mas qualquer pessoa com o link vê seus compromissos. O login "Entrar com Google" não foi usado de propósito: o Google bloqueia login dentro de WebView e a sessão expira em 1 hora, ruim para um painel sempre ligado.

## 4. Tablet com Fully Kiosk Browser

Instale o **Fully Kiosk Browser** (a versão grátis basta). Os nomes das opções podem variar um pouco conforme a versão:

- **Web Content Settings → Start URL:** o endereço do painel.
- **Fullscreen Mode** ligado; **Show Action Bar** e **Show Address Bar** desligados.
- **Device Management → Keep Screen On** ligado.
- **Versões novas entram sozinhas:** o painel confere a cada 30 min e recarrega quando está em descanso (ou sem toque há 5 min), e volta direto para o descanso. Uma vez por dia também recarrega no descanso, para não acumular memória. Para forçar na hora: deslize da borda esquerda → **Load Start URL**.

Opcional, com licença PLUS (paga): *Motion Detection* acende a tela quando alguém passa, e *Enable JavaScript Interface* faz o painel sair do descanso junto. Sem isso, um toque na tela acorda.

Sem Fully, abra no Chrome → ⋮ → **Adicionar à tela inicial** (abre em tela cheia). O painel pede ao navegador para manter a tela ligada.

## 5. Configurações (segure a engrenagem 1 s)

- **Aparência:** 5 temas (Noite, Papel, Alto contraste, Oceano, Floresta), 4 combinações de letra, tamanho das letras, lado do relógio (útil para perda de visão de um lado), 24 h, nome na saudação, ícones animados, modo leve.
- **Cidade e tempo:** busca de cidade, próximas horas (agora, hoje à noite, amanhã…) ou próximos dias, frase amiga ("leve o guarda-chuva"), tempo na faixa da semana.
- **Agenda:** Google Agenda, teste de conexão e feriados.
- **Lembretes:** remédios e rotinas diárias, sem precisar do Google.
- **Rio e Defesa Civil:** nível do Itajaí-Açu, **cota de enchente da sua rua** (o painel desenha a linha no gráfico e avisa quando o rio chega perto) e avisos de chuva e deslizamento **do seu bairro**.
- **Tela:** descanso, modo noite, integração com o Fully Kiosk.
- **Avançado:** endereço do servidor, copiar configurações para outro aparelho (código), voltar ao padrão.

## 6. Testes

```
node tools/test-ics.js        # leitor de agenda (.ics, repetições antigas e novas, fusos, cancelados)
node tools/contrast.js        # contraste WCAG de todos os temas (texto ≥ 7:1)
node tools/make-fixture.js    # gera uma agenda de teste com datas de hoje
python tools/fetch_data.py    # baixa o rio e os avisos para public/ (o que o GitHub faz a cada 15 min)
```

O GitHub roda os dois primeiros antes de cada publicação. Se algum falhar, nada vai para o tablet (e a cópia do rio e dos avisos para de ser renovada até corrigir, por isso o painel passa a avisar "sem atualizar").

## 7. O que foi e o que não foi testado

- **Testado com capturas automáticas:** 5 temas; telas 16:10, 2:1 e 4:3; letras A+++ com layout espelhado; manhã, noite e madrugada; dia escolhido na faixa da semana; agenda vazia; feriado hoje e amanhã; compromisso em andamento; títulos longos; rio em "Atenção" e "Alerta máximo" com a cota da rua; avisos de deslizamento por bairro; descanso com e sem alerta; configurações (bairro, cota com vírgula, cidade). Leitor de agenda `.ics` e contraste de todos os temas por script.
- **Testado no uso real:** site no GitHub Pages, servidor na Cloudflare, Google Agenda pelo endereço secreto, Fully Kiosk no tablet.
- **Não testado:** com os usuários finais; o painel numa cheia de verdade (os alertas foram simulados alterando os dados oficiais); os eventos de movimento do Fully (exigem a licença PLUS).
- **Testado com o Chrome sem janela (17/10/2026):** avisos da Defesa Civil sem atualizar há 26 h, com e sem alerta (inclusive no modo compacto); avisos lidos ao vivo pelo servidor; versão nova chegando durante o descanso (recarrega e volta descansando). O download do GitHub foi testado com a Defesa Civil fora do ar, com e sem cópia publicada.
- O nível do rio depende do que a Defesa Civil publica. Se a leitura ficar com mais de 3 horas, o painel avisa "Dado antigo". Os avisos também: se ninguém conseguir consultar a Defesa Civil há mais de 3 horas, aparece "sem atualizar" no lugar de "tudo normal".

## Créditos
Previsão: Open-Meteo. Rio: AlertaBLU / Defesa Civil de Blumenau. Ícones do tempo: [Meteocons](https://github.com/basmilius/meteocons) (MIT). Ícones: [Lucide](https://lucide.dev) (ISC). Fontes (licença OFL): Fraunces, Atkinson Hyperlegible Next, Lexend, Literata. Leitor de agenda: [ical.js](https://github.com/kewisch/ical.js) (MPL 2.0).
