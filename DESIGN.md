# Pesquisa e decisões de design

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
