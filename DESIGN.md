# Pesquisa e decisões de design

> Versão 2 (17/10/2026). O que mudou da v1 para a v2 está na seção **Revisão v2**, no fim.

Público: pessoas idosas, uma delas com baixa visão após AVC isquêmico. Uso: tablet parado, olhada rápida, sem precisar "operar".

## O que a pesquisa disse (e o que não disse)

**Acessibilidade pós-AVC.** Uma revisão de requisitos de UI/UX para sobreviventes de AVC recomenda: tela simples e sem imagens de fundo, poucas opções por tela, fonte e tamanho ajustáveis, botões grandes e bem distintos, personalização de cores, linguagem simples, e funcionar bem para quem tem o lado esquerdo **ou** o direito afetado; WCAG como piso mínimo. A própria revisão avisa que **não existe guia específico para hemianopia/negligência** — por isso o "lado do relógio" virou uma opção em vez de uma suposição.
Fonte: [UI/UX design requirements for young stroke survivors (npj Digital Medicine, 2025)](https://www.nature.com/articles/s41746-025-01796-8) · [Frontiers in Neurology, 2018](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2018.00146/full)

**Idosos e baixa visão.** As fontes concordam em: contraste acima do mínimo do WCAG (4,5:1 texto, 3:1 texto grande; aqui o texto passa de 7:1), sem traços finíssimos nem fontes condensadas, entrelinha generosa, alvos de toque ≥ 44 px, e texto que o usuário possa aumentar. Faltam estudos primários com limites numéricos — tratei os números como piso, não como teto.
Fontes: [Toptal — interface para idosos](https://www.toptal.com/designers/ui/ui-design-for-older-adults) · [TypeTalk: Designing for the Aging Eye](https://creativepro.com/typetalk-designing-for-the-aging-eye/) · [Bentley UX Center](https://www.bentley.edu/centers/user-experience-center/designing-mobile-experiences-seniors-mind)

**Claro × escuro.** A evidência é mista: um estudo citado pelo Nielsen Norman Group achou melhor desempenho no tema claro, principalmente à noite e com texto pequeno; o mesmo comentário sugere que o escuro pode ajudar quem tem catarata (sem teste direto). Conclusão: **não impor um tema** — 5 temas, todos com texto ≥ 7:1 (`tools/contrast.js`), e texto grande/negrito para neutralizar o ponto fraco do tema escuro.
Fonte: [Dark Mode vs. Light Mode (NN/g, via espelho)](https://hardware.slashdot.org/story/20/02/16/2041240/dark-mode-vs-light-mode-which-is-better)

**Fontes.** *Atkinson Hyperlegible Next* (Braille Institute, 2025) distingue I/l/1 e 0/O e abre as aberturas das letras — é a fonte de texto padrão. *Luciole* foi testada com 145 leitores (73 com baixa visão) mas não está no Google Fonts; *Lexend* é desenhada para reduzir "crowding". Ofereci 4 combinações: Elegante (Fraunces + Atkinson), Limpo (só Atkinson), Moderno (Lexend), Clássico (Literata + Atkinson). Números grandes em serifa macia (Fraunces com SOFT/opsz altos, peso 700) ganham presença sem perder legibilidade.
Fontes: [Atkinson Hyperlegible (All About Vision)](https://www.allaboutvision.com/conditions/blindness-low-vision/atkinson-hyperlegible-typeface/) · [Luciole (HAL)](https://hal.univ-lyon2.fr/hal-04086507) · [Fontes acessíveis](https://fontalternatives.com/blog/best-free-accessible-fonts-dyslexia-low-vision/)

**Painéis de família (Skylight, Hearth, Echo Show, Nest Hub).** Só achei análises de revisores, não estudos de UX. O que se repete: o bom é *calendário + tempo + modo de descanso*; o Echo Show é criticado por ser "mais ocupado"; o Nest Hub só tem visão diária/semanal. Daí: calendário semanal em faixa, um destaque para o próximo compromisso e **um** bloco de tempo — nada além disso na tela principal.
Fontes: [Comparativo 2026](https://wetried.it/?p=8879) · [Hearth Display](https://wetried.it/hearth-display-review-digital-calendar-organizer/)

**Ícones do tempo.** [Meteocons](https://github.com/basmilius/meteocons) (MIT): conjunto "fill" com versão animada e estática (a estática é usada quando "Ícones animados" está desligado). No tema claro as nuvens brancas somem no creme, então ficam sobre um azulejo azul-acinzentado.

**Google no painel.** O login OAuth é bloqueado em WebView (`disallowed_useragent`) e o token do navegador expira em 1 h — ruim para painel 24 h. O **endereço secreto iCal** é permanente, somente leitura e não exige login; como o Google não envia CORS, passa por um Worker mínimo.
Fonte: [Google — OAuth em webviews embutidos](https://developers.googleblog.com/en/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/)

**Fully Kiosk.** Tem API JavaScript (`fully.bind('onMotion', …)`, `turnScreenOn/Off`, `startScreensaver`): o "passou na frente, acendeu" dá para tratar dentro do próprio painel, sem Home Assistant. Requer a opção *Enable JavaScript Interface* (PLUS).
Fonte: [Fully Kiosk — documentação](https://www.fully-kiosk.com/en/)

## Decisões

| Decisão | Motivo |
|---|---|
| Tela única, sem menus, sem rolagem | poucas opções por tela; olhada rápida |
| Hora ≈ 18 % da altura da tela; textos ≥ 3 % da altura | legível a vários metros |
| Contraste ≥ 7:1 no texto, em todos os temas | acima do mínimo AA |
| Tudo em unidades da altura da tela (`rem` = 1 % da altura) | o painel inteiro escala em qualquer tablet |
| Quando falta espaço, **some o menos importante** (nunca corta no meio) | relógio, tempo agora e próximo compromisso nunca somem; rio só em último caso |
| Próximo compromisso em destaque, com "daqui a 3 horas" | a pergunta real é "o que vem agora?" |
| Faixa de 7 dias com pontinhos | o "calendário da semana" sem virar uma grade ilegível |
| Medidor do rio com as faixas oficiais | cor + posição + palavra ("Observação"): três pistas, não só cor |
| Frases amigáveis ("Leve o guarda-chuva") | linguagem simples |
| Lado do relógio configurável | perda de visão de um lado; sem guia específico na literatura |
| Descanso: tela escura, relógio discreto, desloca 1–3 px por minuto | economiza energia, evita imagem fixa |
| Engrenagem discreta, só abre segurando 1 s | pais não abrem sem querer |
| Movimento só na entrada e nos ícones (desligáveis); nada pisca | calma visual |
| Fontes e ícones empacotados localmente | abre mesmo sem internet |
| Se a internet cair, mostra o último dado salvo e um aviso discreto | não deixa a tela vazia |

## Revisão v2: de "7" para o máximo possível sem testar com o usuário

### Diagnóstico da v1 (a partir de uma captura do tablet real)
1. **Estado vazio:** com "Nada marcado", sobrava um buraco de ~350 px no meio da direita. O layout só funcionava com 3 ou 4 compromissos.
2. **Ícone contradizendo a palavra:** "Nublado" com sol atrás da nuvem; "Neblina" com um sol no horizonte (parece pôr do sol).
3. **Zero cortado** da Atkinson em horários ("12:00"), onde não há como confundir com a letra O.
4. **Desequilíbrio:** a esquerda cheia, a direita vazia ou lotada conforme os dados.
5. **Engrenagem** em cima do cartão do rio.
6. **Nada memorável** além de bem-feito.

### Pesquisa adicional
- **Calm technology** (Weiser & Brown; Amber Case): a informação mora na periferia e só vai para o centro quando precisa. O cartão do rio é **calmo quando está normal** (selo discreto) e **toma a frente** a partir de "Atenção" (fundo na cor oficial, frase de ação, telefone 199). [Princípios](https://calmtech.institute/calm-tech-principles) · [Wikipedia](https://en.wikipedia.org/wiki/Calm_technology)
- **Glanceability** (Matthews, Forlizzi e Rohrbach, Berkeley): baixo esforço para captar; abstração e níveis de notificação (de "ignorar" a "exigir ação"). Daí os níveis de destaque explícitos no rio e na Defesa Civil. [Relatório 2006](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2006/EECS-2006-113.pdf)
- **StandBy da Apple:** só o que se lê de longe, com tipografia aumentada. [WidgetKit](https://developer.apple.com/tutorials/data/documentation/widgetkit/adding-standby-and-carplay-support-to-your-widget.md)
- **Relógios de orientação (idosos, demência):** "agora é domingo de manhã", o período do dia em palavras. A evidência é de fabricantes, não de ensaios. Daí a previsão em **períodos** ("Agora · Tarde", "Hoje · Noite", "Amanhã · Manhã"). [Alzheimer's Society](https://shop.alzheimers.org.uk/products/dual-display-dementia-day-clock)
- **Comunicação de cheias** (NWS/EUA, Environment Agency/Reino Unido, Emilia-Romagna, Tailândia): poucas faixas de cor ligadas a **limiares com nome e a uma ação**, limiares desenhados no próprio gráfico, tendência das últimas horas. Daí o gráfico de 24 h com as faixas oficiais na régua, a frase de ação por nível e a **cota da rua** opcional. [NWS](https://www.weather.gov/media/water/brochures/Guide_to_Hydrologic_Information_Brochure.pdf) · [riverlevels.uk](https://riverlevels.uk/pages/symbols) · [Emilia-Romagna](https://allertameteo.regione.emilia-romagna.it/documents/d/guest/Livelli_idro_ENG) · [Tailândia](https://www.nationthailand.com/news/general/40070222)
- **Envelhecimento e cor:** o cristalino amarela com a idade; azuis, verdes e violetas se confundem, e tons quentes e saturados se distinguem melhor. O destaque quente (âmbar) ficou; a cor nunca é a única pista (sempre palavra e ícone junto). [GerontoVis](https://arxiv.org/pdf/2403.13173)
- **Hemianopia:** a do lado direito atrapalha mais a leitura dentro da linha; a do esquerdo, achar o começo da linha. Títulos curtos com começo de linha fixo; o "lado do relógio" continua configurável. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7510370/)
- **Estado vazio** (SAP Fiori, Cloudscape, NN/g): dizer **o quê, por quê e o que fazer**. Daí "Semana livre / Nenhum compromisso nos próximos 7 dias / Para marcar, diga: 'Alexa, adicione…'". [SAP](https://www.sap.com/design-system/fiori-design-web/v1-96/foundations/best-practices/global-patterns/designing-for-empty-states) · [Cloudscape](https://cloudscape.design/patterns/general/empty-states/)
- **Dados da Defesa Civil:** além do rio, o AlertaBLU publica **condições de chuva** e **risco de deslizamento** por região (Central, Norte, Sul, Leste, Oeste, com a lista de bairros). Daí os avisos por bairro.

### O que mudou
| Problema | Solução |
|---|---|
| Buraco no meio | O cartão da agenda **ocupa todo o espaço livre**; a lista cresce até preencher. Estado vazio útil. |
| Ícone × palavra | Mapa revisado: Nublado = só nuvens; Neblina = neblina; Chuva = chuva (sem sol). "Pancadas" mantêm sol e chuva, que é o que a palavra diz. |
| Zero cortado | Todo número usa a fonte de números (Fraunces, Literata ou Lexend), inclusive dentro de frases. |
| Equilíbrio | Esquerda = **agora** (hora, tempo, próximas horas); direita = **o que vem** (semana, agenda, rio). As duas colunas terminam na mesma linha. |
| Engrenagem | No cabeçalho da agenda, no fluxo da página; nada flutua por cima do conteúdo. O aviso de conexão também foi para o cabeçalho. |
| Momento memorável | **Gráfico do rio nas últimas 24 h** com as faixas oficiais e a cota da rua; **faixa da semana com o tempo de cada dia**; frase que responde "preciso de guarda-chuva?". |
| Máx/mín confusa | Períodos com nome ("Hoje · Noite 15°"): de dia, a máxima do período; à noite, a mínima. Sem rótulos técnicos. |
| Avisos | Defesa Civil por bairro. A partir de "Alerta", o painel não entra em descanso; o aviso aparece também na tela de descanso. |
| Feriados | Nacionais e o aniversário de Blumenau, com estrela na faixa da semana e embaixo da data. |
| Um dia da semana | Tocar no dia mostra os compromissos **e** o tempo de manhã, tarde e noite daquele dia. |
| Descanso | Sempre escuro com letras âmbar (menos luz azul à noite), em qualquer tema. |
| Letras grandes, telas pequenas | Ordem de sacrifício explícita: tempo na faixa, gráfico do rio, faixa da semana, rio (nunca em alerta). As colunas da lista crescem junto com o texto. |
| Previsão velha (tablet sem internet) | A previsão é casada pela **data**, não pela posição; se ficar velha, a frase e a máx/mín somem em vez de mostrar o dia errado. |

### Ainda não validado (o que impede o "10")
- Nenhuma decisão foi testada com os usuários finais. O passo de maior valor agora é observar o uso por alguns dias e anotar onde eles hesitam.
- A cota de enchente da rua depende de alguém saber o número (Mapa de Inundação da Defesa Civil).
- A Defesa Civil não publica previsão do nível do rio em formato aberto; o gráfico mostra só o que já aconteceu.
